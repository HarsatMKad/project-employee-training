import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';

export type UserRole = 'creator' | 'employee';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
}

interface TokenPayload extends AuthUser {
  iat: number;
  exp: number;
}

export const SESSION_COOKIE = 'employee_training_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [algorithm, salt, expectedHash] = storedHash.split('$');
  if (algorithm !== 'scrypt' || !salt || !expectedHash) return false;

  const actualHash = scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  return expected.length === actualHash.length && timingSafeEqual(actualHash, expected);
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production' && !secret) {
    throw new Error('JWT_SECRET must be set in production');
  }
  return secret || 'local-demo-secret-change-before-deployment';
}

export function signSessionToken(user: AuthUser): string {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString(
    'base64url',
  );
  const payload: TokenPayload = {
    ...user,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signingInput = `${header}.${encodedPayload}`;
  const signature = createHmac('sha256', getJwtSecret())
    .update(signingInput)
    .digest('base64url');
  return `${signingInput}.${signature}`;
}

export function verifySessionToken(token: string): AuthUser | undefined {
  const parts = token.split('.');
  if (parts.length !== 3) return undefined;
  const [headerPart, payloadPart, signature] = parts;
  const signingInput = `${headerPart}.${payloadPart}`;
  const expectedSignature = createHmac('sha256', getJwtSecret())
    .update(signingInput)
    .digest();
  const suppliedSignature = Buffer.from(signature, 'base64url');
  if (
    suppliedSignature.length !== expectedSignature.length ||
    !timingSafeEqual(suppliedSignature, expectedSignature)
  ) {
    return undefined;
  }

  try {
    const header = JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8')) as {
      alg?: string;
      typ?: string;
    };
    const payload = JSON.parse(
      Buffer.from(payloadPart, 'base64url').toString('utf8'),
    ) as Partial<TokenPayload>;
    if (
      header.alg !== 'HS256' ||
      !payload.id ||
      !payload.email ||
      !payload.name ||
      !payload.organizationId ||
      (payload.role !== 'creator' && payload.role !== 'employee') ||
      !payload.exp ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return undefined;
    }

    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      organizationId: payload.organizationId,
    };
  } catch {
    return undefined;
  }
}

export function sessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure}`;
}

export function expiredSessionCookie(): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;
}

export function getCookieValue(
  cookieHeader: string | undefined,
  cookieName: string,
): string | undefined {
  if (!cookieHeader) return undefined;
  const prefix = `${cookieName}=`;
  const item = cookieHeader.split(';').map((part) => part.trim()).find((part) =>
    part.startsWith(prefix),
  );
  return item ? item.slice(prefix.length) : undefined;
}
