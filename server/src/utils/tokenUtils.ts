import jwt from 'jsonwebtoken';

interface TokenPayload {
  id: string;
  email: string;
  role: string;
}

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, process.env.JWT_SECRET || '', {
    expiresIn: '7d',
  });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || '', {
    expiresIn: '30d',
  });
};

export const verifyRefreshToken = (token: string): (TokenPayload & { iat?: number }) | null => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || '');
    return decoded as TokenPayload & { iat?: number };
  } catch (error) {
    return null;
  }
};

/**
 * True when a token was issued before the user's last password change. JWT `iat` has
 * one-second resolution, so the change time is floored to whole seconds before comparing.
 */
export const isTokenStale = (
  iat: number | undefined,
  passwordChangedAt: Date | string | null | undefined
): boolean => {
  if (!passwordChangedAt) return false;
  const changedMs = new Date(passwordChangedAt).getTime();
  if (Number.isNaN(changedMs)) return false;
  if (typeof iat !== 'number') return true;
  return iat < Math.floor(changedMs / 1000);
};
