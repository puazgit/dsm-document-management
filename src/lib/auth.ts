import * as jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'fallback-refresh-secret';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  groupId: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(
    payload as any, 
    JWT_SECRET!,
    { expiresIn: '7d' }
  );
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(payload: Omit<RefreshTokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(
    payload as any, 
    REFRESH_TOKEN_SECRET!,
    { expiresIn: '30d' }
  );
}

/**
 * Verify JWT access token
 */
export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as JwtPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
}

/**
 * Verify JWT refresh token
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET!) as RefreshTokenPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Verify password (alias for comparePassword for NextAuth compatibility)
 */
export const verifyPassword = comparePassword;

/**
 * Extract token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Generate random token for password reset, etc.
 */
export function generateRandomToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Calculate token expiration time
 */
export function getTokenExpirationTime(token: string): number | null {
  try {
    const decoded = jwt.decode(token) as JwtPayload;
    return decoded.exp ? decoded.exp * 1000 : null; // Convert to milliseconds
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const expirationTime = getTokenExpirationTime(token);
  if (!expirationTime) return true;
  return Date.now() >= expirationTime;
}

// Re-export authOptions from next-auth configuration
export { authOptions } from './next-auth';