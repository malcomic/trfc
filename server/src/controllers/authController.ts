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
import { findCaptainSummary } from '../utils/captainSummary.js';
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

const FORGOT_PASSWORD_MESSAGE = "If that email is registered, we've sent a link to reset your password.";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PROFILE_FIELDS = 'id, name, email, phone, whatsapp, marketing_opt_in, role, created_at';

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

export const register = async (req: Request, res: Response) => {
  try {
    const { password, referralCode, captainId, marketingOptIn } = req.body ?? {};

    const fieldsResult = validateProfileFields(req.body ?? {});
    if ('error' in fieldsResult) {
      return res.status(400).json({ error: fieldsResult.error });
    }
    const { name: trimmedName, email: normalizedEmail, phone, phoneMsisdn, whatsappMsisdn } = fieldsResult;

    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    // Members who joined through onboarding have a phone-only account; registering claims it.
    const phoneOwner = await query(
      'SELECT id, password_hash FROM users WHERE phone_normalized = $1 ORDER BY created_at ASC LIMIT 1',
      [phoneMsisdn]
    );
    const existingByPhone = phoneOwner.rows[0];
    if (existingByPhone?.password_hash) {
      return res
        .status(400)
        .json({ error: 'An account with this phone number already exists. Sign in instead.' });
    }

    const emailOwner = await query('SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1', [normalizedEmail]);
    if (emailOwner.rows.length > 0 && emailOwner.rows[0].id !== existingByPhone?.id) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const optedIn = marketingOptIn === true;
    const fields = [trimmedName, normalizedEmail, phone, phoneMsisdn, passwordHash, whatsappMsisdn, optedIn];

    const result = existingByPhone
      ? await query(
          `UPDATE users
           SET name = $1, email = $2, phone = $3, phone_normalized = $4, password_hash = $5,
               whatsapp = $6, marketing_opt_in = $7,
               marketing_opt_in_at = CASE WHEN $7 THEN NOW() ELSE NULL END
           WHERE id = $8
           RETURNING id, name, email, phone, role`,
          [...fields, existingByPhone.id]
        )
      : await query(
          `INSERT INTO users
             (name, email, phone, phone_normalized, password_hash, whatsapp, marketing_opt_in, marketing_opt_in_at, role)
           VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $7 THEN NOW() ELSE NULL END, 'member')
           RETURNING id, name, email, phone, role`,
          fields
        );

    const user = result.rows[0];
    const referred = referralCode ? await applyReferral(user.id, referralCode) : false;
    if (!referred && captainId) {
      await assignChosenCaptain(user.id, captainId);
    }
    const captain = await findCaptainSummary(user.id);

    void sendAccountWelcomeOnce(user.id);

    const token = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email, role: user.role });

    res.status(201).json({ token, refreshToken, user: { ...user, captain } });
  } catch (error) {
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

    const token = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id, email: user.email, role: user.role });

    res.json({ token, refreshToken, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
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
      'SELECT id, name, email, phone, role, password_changed_at FROM users WHERE id = $1',
      [decoded.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { password_changed_at: passwordChangedAt, ...user } = result.rows[0];
    if (isTokenStale(decoded.iat, passwordChangedAt)) {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }

    const newAccessToken = generateAccessToken({ id: user.id, email: user.email, role: user.role });
    const newRefreshToken = generateRefreshToken({ id: user.id, email: user.email, role: user.role });

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

    const result = await query(`SELECT ${PROFILE_FIELDS} FROM users WHERE id = $1`, [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch profile' });
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
    const optedIn = req.body?.marketingOptIn === true;

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

    const result = await query(
      `UPDATE users
       SET name = $1, email = $2, phone = $3, phone_normalized = $4, whatsapp = $5,
           marketing_opt_in_at = CASE
             WHEN $6 AND NOT COALESCE(marketing_opt_in, false) THEN NOW()
             WHEN NOT $6 THEN NULL
             ELSE marketing_opt_in_at
           END,
           marketing_opt_in = $6
       WHERE id = $7
       RETURNING ${PROFILE_FIELDS}`,
      [name, email, phone, phoneMsisdn, whatsappMsisdn, optedIn, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
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
