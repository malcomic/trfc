import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { User } from '../types/index.js';
import {
  generateAccessToken,
  generateRefreshToken,
  isTokenStale,
  verifyRefreshToken,
} from '../utils/tokenUtils.js';
import { toKenyanMsisdn } from '../utils/phone.js';
import { applyReferral, assignChosenCaptain } from '../utils/referrals.js';
import { sendAccountWelcomeOnce } from '../utils/accountWelcome.js';
import { sendWelcomeEmailOnce } from '../utils/welcomeEmail.js';
import { findCaptainSummary } from '../utils/captainSummary.js';
import { hasAnyAnswer, parseAnswers, saveMemberAnswers } from '../utils/memberAnswers.js';
import { touchLastActive } from '../utils/lastActive.js';
import { claimGuestPurchasesSafely } from '../utils/claimGuestPurchases.js';
import {
  consumePasswordResetToken,
  createPasswordResetToken,
  RESET_TOKEN_TTL_MINUTES,
  validatePassword,
} from '../utils/passwordReset.js';
import { sendEmail } from '../utils/emailService.js';
import {
  buildPasswordChangedEmailHTML,
  buildPasswordChangedEmailText,
  buildPasswordResetEmailHTML,
  buildPasswordResetEmailText,
} from '../utils/emailTemplates.js';
import { config } from '../config/env.js';
import {
  GoogleAuthError,
  isGoogleBlockedRole,
  isGoogleConfigured,
  signGoogleSignupToken,
  verifyGoogleCredential,
  verifyGoogleSignupToken,
} from '../utils/googleAuth.js';
import {
  acceptPrivacy,
  checkSignupConsent,
  ConsentError,
  getConsentStatus,
  getConsentStatusForUser,
  hashIp,
  recordConsent,
  setMarketing,
} from '../utils/consents.js';

const FORGOT_PASSWORD_MESSAGE = "If that email is registered, we've sent a link to reset your password.";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PROFILE_FIELDS = `id, name, email, phone, whatsapp, marketing_opt_in, role, created_at, avatar_url,
  google_id IS NOT NULL AS google_linked, password_hash IS NOT NULL AS has_password`;

interface ProfileFields {
  name: string;
  email: string;
  phone: string;
  phoneMsisdn: string;
  whatsappMsisdn: string;
}

export function validateProfileFields(body: Record<string, unknown>): { error: string } | ProfileFields {
  const { name, email, phone, whatsapp } = body;

  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (!trimmedName || trimmedName.length > 100) {
    return { error: 'Please enter your name' };
  }

  const phoneMsisdn = toKenyanMsisdn(phone as string);
  if (!phoneMsisdn) {
    return { error: 'Enter a valid phone number, e.g. 07XX XXX XXX' };
  }

  const hasWhatsapp = typeof whatsapp === 'string' && whatsapp.trim() !== '';
  const whatsappMsisdn = hasWhatsapp ? toKenyanMsisdn(whatsapp) : phoneMsisdn;
  if (!whatsappMsisdn) {
    return { error: 'Enter a valid WhatsApp number, e.g. 07XX XXX XXX' };
  }

  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    return { error: 'Enter a valid email address' };
  }

  return { name: trimmedName, email: normalizedEmail, phone: String(phone).trim(), phoneMsisdn, whatsappMsisdn };
}

const LINK_REQUIRED_MESSAGE =
  'An account with this email already exists. Sign in with your password, then connect Google from My Profile.';

interface SignupOwners {
  /** Account already holding this phone; phone-only onboarding accounts (no password) get claimed. */
  phoneOwner: { id: string; password_hash: string | null } | undefined;
  emailTaken: boolean;
}

async function findSignupOwners(phoneMsisdn: string, email: string): Promise<SignupOwners> {
  const phoneOwner = await query(
    'SELECT id, password_hash FROM users WHERE phone_normalized = $1 ORDER BY created_at ASC LIMIT 1',
    [phoneMsisdn]
  );
  const existingByPhone = phoneOwner.rows[0];
  const emailOwner = await query('SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1', [email]);
  const emailTaken = emailOwner.rows.length > 0 && emailOwner.rows[0].id !== existingByPhone?.id;
  return { phoneOwner: existingByPhone, emailTaken };
}

interface CreateMemberInput {
  fields: ProfileFields;
  passwordHash: string | null;
  google?: { id: string; avatarUrl: string | null };
  existingId?: string;
  body: Record<string, any>;
  policyVersion: string;
  ipHash: string | null;
}

async function createOrClaimMember({ fields, passwordHash, google, existingId, body, policyVersion, ipHash }: CreateMemberInput) {
  const { referralCode, captainId, marketingOptIn } = body;
  const { name, email, phone, phoneMsisdn, whatsappMsisdn } = fields;
  const optedIn = marketingOptIn === true;
  const params: unknown[] = [name, email, phone, phoneMsisdn, passwordHash, whatsappMsisdn, optedIn];
  const returning = 'RETURNING id, name, email, phone, role, avatar_url';

  let result;
  if (existingId) {
    params.push(existingId);
    if (google) params.push(google.id, google.avatarUrl);
    result = await query(
      `UPDATE users
       SET name = $1, email = $2, phone = $3, phone_normalized = $4, password_hash = $5,
           whatsapp = $6, marketing_opt_in = $7,
           marketing_opt_in_at = CASE WHEN $7 THEN NOW() ELSE NULL END${google ? ', google_id = $9, avatar_url = $10' : ''}
       WHERE id = $8
       ${returning}`,
      params
    );
  } else {
    if (google) params.push(google.id, google.avatarUrl);
    result = await query(
      `INSERT INTO users
         (name, email, phone, phone_normalized, password_hash, whatsapp, marketing_opt_in, marketing_opt_in_at, role${google ? ', google_id, avatar_url' : ''})
       VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $7 THEN NOW() ELSE NULL END, 'member'${google ? ', $8, $9' : ''})
       ${returning}`,
      params
    );
  }

  const user = result.rows[0];
  const consentSource = google ? 'google_signup' : 'signup';
  await acceptPrivacy(user.id, { version: policyVersion, source: consentSource, ipHash, marketingPromptSeen: true });
  if (optedIn) {
    await recordConsent({
      userId: user.id,
      type: 'marketing_email',
      granted: true,
      policySlug: 'privacy-members',
      policyVersion,
      source: consentSource,
      ipHash,
    });
  }
  const zone = referralCode ? await applyReferral(user.id, referralCode) : null;
  if (captainId) {
    await assignChosenCaptain(user.id, captainId, zone?.region_id);
  }
  const captain = await findCaptainSummary(user.id);

  // Optional answers must never block sign-up; the app asks again when this fails.
  let answersSaved = true;
  try {
    const answers = parseAnswers(body.answers);
    if (hasAnyAnswer(answers) || zone) {
      await saveMemberAnswers(user.id, answers, { fallbackRegionId: zone?.region_id });
    }
  } catch (error) {
    console.error(`Failed to save signup answers for user ${user.id}:`, error);
    answersSaved = false;
  }

  const linkedPurchases = await claimGuestPurchasesSafely(user.id, email, phoneMsisdn);

  void sendAccountWelcomeOnce(user.id);
  void sendWelcomeEmailOnce(user.id);

  const token = generateAccessToken({ id: user.id, email: user.email, role: user.role });
  const refreshToken = generateRefreshToken({ id: user.id, email: user.email, role: user.role });

  return {
    token,
    refreshToken,
    user: { ...user, captain, needs_consent: false, needs_marketing_prompt: false },
    answersSaved,
    linked_purchases: linkedPurchases,
  };
}

function consentErrorResponse(res: Response, error: unknown) {
  if (error instanceof ConsentError) {
    res.status(error.status).json({ error: error.message, code: 'CONSENT_INVALID' });
    return true;
  }
  return false;
}

const DELETED_ACCOUNT_MESSAGE = 'This account has been deleted.';

export const register = async (req: Request, res: Response) => {
  try {
    const { password } = req.body ?? {};

    const fieldsResult = validateProfileFields(req.body ?? {});
    if ('error' in fieldsResult) {
      return res.status(400).json({ error: fieldsResult.error });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const policyVersion = await checkSignupConsent(req.body ?? {});

    const { phoneOwner, emailTaken } = await findSignupOwners(fieldsResult.phoneMsisdn, fieldsResult.email);
    if (phoneOwner?.password_hash) {
      return res
        .status(400)
        .json({ error: 'An account with this phone number already exists. Sign in instead.' });
    }
    if (emailTaken) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const payload = await createOrClaimMember({
      fields: fieldsResult,
      passwordHash,
      existingId: phoneOwner?.id,
      body: req.body,
      policyVersion,
      ipHash: hashIp(req.ip),
    });
    res.status(201).json(payload);
  } catch (error) {
    if (consentErrorResponse(res, error)) return;
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = typeof email === 'string' ? email.trim() : '';
    const result = await query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1) ORDER BY created_at ASC LIMIT 1',
      [normalizedEmail]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    if (!user.password_hash || typeof password !== 'string') {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (user.deletion_requested_at) {
      return res.status(401).json({ error: DELETED_ACCOUNT_MESSAGE });
    }

    const token = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email, role: user.role });
    void touchLastActive(user.id);
    const linkedPurchases = await claimGuestPurchasesSafely(user.id, user.email, user.phone);
    const consent = await getConsentStatus(user);

    res.json({
      token,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role, ...consent },
      linked_purchases: linkedPurchases,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const logout = async (req: Request, res: Response) => {
  res.json({ message: 'Logout successful' });
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const result = await query(
      'SELECT id, name, email, phone, role, password_changed_at, deletion_requested_at FROM users WHERE id = $1',
      [decoded.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password_changed_at: passwordChangedAt, deletion_requested_at: deletionRequestedAt, ...user } = result.rows[0];
    if (deletionRequestedAt || isTokenStale(decoded.iat, passwordChangedAt)) {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }

    const newAccessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const newRefreshToken = generateRefreshToken({ id: user.id, email: user.email, role: user.role });
    void touchLastActive(user.id);

    res.json({ token: newAccessToken, refreshToken: newRefreshToken, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Same response whether or not the account exists, so the form can't be used to discover members.
    const result = await query(
      'SELECT id, name, email FROM users WHERE LOWER(email) = LOWER($1) ORDER BY created_at ASC LIMIT 1',
      [email]
    );
    const user = result.rows[0];
    if (user) {
      const token = await createPasswordResetToken(user.id);
      const emailData = {
        name: user.name,
        url: `${config.frontendUrl.replace(/\/$/, '')}/reset-password?token=${token}`,
        expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
      };
      sendEmail({
        to: user.email,
        subject: 'Reset your TRFC password',
        html: buildPasswordResetEmailHTML(emailData),
        text: buildPasswordResetEmailText(emailData),
      }).catch((error: Error) => {
        console.error(`Failed to send password reset email to user ${user.id}: ${error.message}`);
      });
    }

    res.json({ message: FORGOT_PASSWORD_MESSAGE });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not start password reset. Please try again.' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body ?? {};

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const user = await consumePasswordResetToken(token, password);
    if (!user) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired.' });
    }

    sendEmail({
      to: user.email,
      subject: 'Your TRFC password was changed',
      html: buildPasswordChangedEmailHTML({ name: user.name }),
      text: buildPasswordChangedEmailText({ name: user.name }),
    }).catch((error: Error) => {
      console.error(`Failed to send password changed email to user ${user.id}: ${error.message}`);
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not reset password. Please try again.' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await query(
      `SELECT ${PROFILE_FIELDS}, privacy_accepted_at, privacy_version_accepted, marketing_prompt_seen_at FROM users WHERE id = $1`,
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { privacy_accepted_at, marketing_prompt_seen_at, ...user } = result.rows[0];
    const consent = await getConsentStatus({ privacy_accepted_at, marketing_prompt_seen_at, marketing_opt_in: user.marketing_opt_in });
    res.json({ user: { ...user, ...consent } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

/** Agreeing again at login: Box 1 and the 18+ box are required; Box 2 is shown once, unticked. */
export const acceptConsent = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const body = req.body ?? {};
    const ipHash = hashIp(req.ip);
    const status = await getConsentStatusForUser(userId);

    if (status.needs_consent) {
      const version = await checkSignupConsent(body);
      await acceptPrivacy(userId, { version, source: 'login_prompt', ipHash });
    }
    if (status.needs_marketing_prompt) {
      if (body.marketingOptIn === true) {
        await setMarketing(userId, true, { source: 'login_prompt', ipHash });
      } else {
        await query('UPDATE users SET marketing_prompt_seen_at = NOW() WHERE id = $1', [userId]);
      }
    }
    res.json({ ok: true, ...(await getConsentStatusForUser(userId)) });
  } catch (error) {
    if (consentErrorResponse(res, error)) return;
    console.error(error);
    res.status(500).json({ error: 'Could not save your answer. Please try again.' });
  }
};

export const updateMyProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const fieldsResult = validateProfileFields(req.body ?? {});
    if ('error' in fieldsResult) {
      return res.status(400).json({ error: fieldsResult.error });
    }
    const { name, email, phone, phoneMsisdn, whatsappMsisdn } = fieldsResult;
    const marketingChoice = typeof req.body?.marketingOptIn === 'boolean' ? req.body.marketingOptIn : null;

    const emailOwner = await query('SELECT id FROM users WHERE LOWER(email) = $1 AND id <> $2 LIMIT 1', [
      email,
      userId,
    ]);
    if (emailOwner.rows.length > 0) {
      return res.status(400).json({ error: 'That email is already used by another account' });
    }

    const phoneOwner = await query('SELECT id FROM users WHERE phone_normalized = $1 AND id <> $2 LIMIT 1', [
      phoneMsisdn,
      userId,
    ]);
    if (phoneOwner.rows.length > 0) {
      return res.status(400).json({ error: 'That phone number is already used by another account' });
    }

    let result = await query(
      `UPDATE users
       SET name = $1, email = $2, phone = $3, phone_normalized = $4, whatsapp = $5
       WHERE id = $6
       RETURNING ${PROFILE_FIELDS}`,
      [name, email, phone, phoneMsisdn, whatsappMsisdn, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (marketingChoice !== null && marketingChoice !== Boolean(result.rows[0].marketing_opt_in)) {
      await setMarketing(userId, marketingChoice, { source: 'settings', ipHash: hashIp(req.ip) });
      result = await query(`SELECT ${PROFILE_FIELDS} FROM users WHERE id = $1`, [userId]);
    }

    const user = result.rows[0];
    const token = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email, role: user.role });
    res.json({ user, token, refreshToken });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update your profile' });
  }
};

export const changeMyPassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = req.body ?? {};

    const result = await query('SELECT id, name, email, role, password_hash FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (!user.password_hash) {
      return res
        .status(400)
        .json({ error: 'Your account has no password yet. Use "Forgot password" on the sign-in page to set one.' });
    }
    if (typeof currentPassword !== 'string' || !(await bcrypt.compare(currentPassword, user.password_hash))) {
      return res.status(400).json({ error: 'Your current password is incorrect' });
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    // App-clock timestamp so the tokens issued below are never older than it (DB clock skew would sign this tab out).
    await query('UPDATE users SET password_hash = $1, password_changed_at = $2 WHERE id = $3', [
      passwordHash,
      new Date(),
      userId,
    ]);

    if (user.email) {
      sendEmail({
        to: user.email,
        subject: 'Your TRFC password was changed',
        html: buildPasswordChangedEmailHTML({ name: user.name }),
        text: buildPasswordChangedEmailText({ name: user.name }),
      }).catch((error: Error) => {
        console.error(`Failed to send password changed email to user ${user.id}: ${error.message}`);
      });
    }

    const token = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email, role: user.role });
    res.json({ message: 'Password updated', token, refreshToken });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not change your password. Please try again.' });
  }
};

const GOOGLE_NOT_CONFIGURED = { error: 'Google sign-in is not configured' };
const GOOGLE_BLOCKED_MESSAGE = 'This account must sign in with a password.';
const GOOGLE_IN_USE_MESSAGE = 'This Google account is connected to another TRFC account.';

export const googleAuth = async (req: Request, res: Response) => {
  if (!isGoogleConfigured()) return res.status(503).json(GOOGLE_NOT_CONFIGURED);
  try {
    const profile = await verifyGoogleCredential(req.body?.credential);

    const linked = await query(
      `SELECT id, name, email, phone, role, avatar_url, deletion_requested_at, privacy_accepted_at,
              marketing_prompt_seen_at, marketing_opt_in
       FROM users WHERE google_id = $1 LIMIT 1`,
      [profile.sub]
    );
    const row = linked.rows[0];
    if (row) {
      const { deletion_requested_at, privacy_accepted_at, marketing_prompt_seen_at, marketing_opt_in, ...user } = row;
      if (deletion_requested_at) {
        return res.status(401).json({ error: DELETED_ACCOUNT_MESSAGE });
      }
      if (isGoogleBlockedRole(user.role)) {
        return res.status(403).json({ error: GOOGLE_BLOCKED_MESSAGE });
      }
      const token = generateAccessToken({ id: user.id, email: user.email, role: user.role });
      const refreshToken = generateRefreshToken({ id: user.id, email: user.email, role: user.role });
      void touchLastActive(user.id);
      const linkedPurchases = await claimGuestPurchasesSafely(user.id, user.email, user.phone);
      const consent = await getConsentStatus({ privacy_accepted_at, marketing_prompt_seen_at, marketing_opt_in });
      return res.json({ token, refreshToken, user: { ...user, ...consent }, linked_purchases: linkedPurchases });
    }

    const emailOwner = await query('SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1', [profile.email]);
    if (emailOwner.rows.length > 0) {
      return res
        .status(409)
        .json({ error: LINK_REQUIRED_MESSAGE, code: 'GOOGLE_LINK_REQUIRED', email: profile.email });
    }

    res.json({
      needsProfile: true,
      signupToken: signGoogleSignupToken(profile),
      profile: { name: profile.name, email: profile.email, picture: profile.picture },
    });
  } catch (error) {
    if (error instanceof GoogleAuthError) return res.status(401).json({ error: error.message });
    console.error(error);
    res.status(500).json({ error: 'Google sign-in failed. Please try again.' });
  }
};

export const completeGoogleSignup = async (req: Request, res: Response) => {
  if (!isGoogleConfigured()) return res.status(503).json(GOOGLE_NOT_CONFIGURED);
  try {
    const body = req.body ?? {};
    const profile = verifyGoogleSignupToken(body.signupToken);
    if (!profile) {
      return res.status(401).json({ error: 'Your Google sign-up expired. Please continue with Google again.' });
    }

    const fieldsResult = validateProfileFields({ ...body, name: profile.name, email: profile.email });
    if ('error' in fieldsResult) {
      return res.status(400).json({ error: fieldsResult.error });
    }

    const policyVersion = await checkSignupConsent(body);

    const googleOwner = await query('SELECT id FROM users WHERE google_id = $1 LIMIT 1', [profile.sub]);
    if (googleOwner.rows.length > 0) {
      return res.status(409).json({ error: 'This Google account already has a TRFC account. Sign in with Google.' });
    }

    const { phoneOwner, emailTaken } = await findSignupOwners(fieldsResult.phoneMsisdn, fieldsResult.email);
    if (emailTaken || phoneOwner?.password_hash) {
      return res.status(409).json({ error: LINK_REQUIRED_MESSAGE, code: 'GOOGLE_LINK_REQUIRED' });
    }

    const payload = await createOrClaimMember({
      fields: fieldsResult,
      passwordHash: null,
      google: { id: profile.sub, avatarUrl: profile.picture },
      existingId: phoneOwner?.id,
      body,
      policyVersion,
      ipHash: hashIp(req.ip),
    });
    res.status(201).json(payload);
  } catch (error) {
    if (consentErrorResponse(res, error)) return;
    console.error(error);
    res.status(500).json({ error: 'Registration failed' });
  }
};

export const linkGoogle = async (req: Request, res: Response) => {
  if (!isGoogleConfigured()) return res.status(503).json(GOOGLE_NOT_CONFIGURED);
  try {
    const userId = req.user!.id;
    const current = await query('SELECT id, role FROM users WHERE id = $1', [userId]);
    const user = current.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (isGoogleBlockedRole(user.role)) {
      return res.status(403).json({ error: GOOGLE_BLOCKED_MESSAGE });
    }

    const profile = await verifyGoogleCredential(req.body?.credential);
    const owner = await query('SELECT id FROM users WHERE google_id = $1 AND id <> $2 LIMIT 1', [profile.sub, userId]);
    if (owner.rows.length > 0) {
      return res.status(409).json({ error: GOOGLE_IN_USE_MESSAGE });
    }

    const result = await query(
      `UPDATE users SET google_id = $1, avatar_url = COALESCE(avatar_url, $2) WHERE id = $3 RETURNING ${PROFILE_FIELDS}`,
      [profile.sub, profile.picture, userId]
    );
    res.json({ user: result.rows[0] });
  } catch (error) {
    if (error instanceof GoogleAuthError) return res.status(401).json({ error: error.message });
    console.error(error);
    res.status(500).json({ error: 'Could not connect your Google account. Please try again.' });
  }
};

export const unlinkGoogle = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const current = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (!current.rows[0].password_hash) {
      return res.status(400).json({ error: "Set a password first so you don't lose access to your account." });
    }

    const result = await query(`UPDATE users SET google_id = NULL WHERE id = $1 RETURNING ${PROFILE_FIELDS}`, [
      userId,
    ]);
    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Could not disconnect your Google account. Please try again.' });
  }
};
