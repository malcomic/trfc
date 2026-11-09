import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { config } from '../config/env.js';

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
}

export const GOOGLE_BLOCKED_ROLES = ['admin', 'scanner'];

export const isGoogleBlockedRole = (role: string | null | undefined): boolean =>
  GOOGLE_BLOCKED_ROLES.includes(role ?? '');

export const isGoogleConfigured = (): boolean => Boolean(config.googleClientId);

export class GoogleAuthError extends Error {}

let client: OAuth2Client | null = null;

export async function verifyGoogleCredential(credential: unknown): Promise<GoogleProfile> {
  if (typeof credential !== 'string' || !credential) {
    throw new GoogleAuthError('Missing Google credential');
  }
  client ??= new OAuth2Client(config.googleClientId);

  let payload;
  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: config.googleClientId });
    payload = ticket.getPayload();
  } catch {
    throw new GoogleAuthError('Google sign-in failed. Please try again.');
  }

  if (!payload?.sub || !payload.email) {
    throw new GoogleAuthError('Google sign-in failed. Please try again.');
  }
  if (!payload.email_verified) {
    throw new GoogleAuthError('Your Google account email is not verified.');
  }

  return {
    sub: payload.sub,
    email: payload.email.trim().toLowerCase(),
    name: (payload.name || payload.given_name || payload.email.split('@')[0]).trim(),
    picture: payload.picture ?? null,
  };
}

// Separate secret so a signup token can never pass authMiddleware as an access token.
const signupSecret = () => `${config.jwtSecret}:google-signup`;

export const signGoogleSignupToken = (profile: GoogleProfile): string =>
  jwt.sign(profile, signupSecret(), { expiresIn: '15m' });

export const verifyGoogleSignupToken = (token: unknown): GoogleProfile | null => {
  if (typeof token !== 'string' || !token) return null;
  try {
    const decoded = jwt.verify(token, signupSecret()) as Partial<GoogleProfile>;
    if (!decoded.sub || !decoded.email || !decoded.name) return null;
    return { sub: decoded.sub, email: decoded.email, name: decoded.name, picture: decoded.picture ?? null };
  } catch {
    return null;
  }
};
