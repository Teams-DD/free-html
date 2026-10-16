const MIN_ADMIN_SECRET_LENGTH = 43;
const AUTH_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const AUTH_ATTEMPT_LIMIT = 5;
const MAX_AUTH_ATTEMPT_KEYS = 1000;
const authAttemptWindows = new Map<string, { attempts: number; resetAt: number }>();

export function isValidAdminSecret(secret: unknown): secret is string {
  return typeof secret === 'string' && secret.trim().length >= MIN_ADMIN_SECRET_LENGTH;
}

export function consumeAuthAttempt(key: string): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  for (const [entryKey, entry] of authAttemptWindows) {
    if (entry.resetAt <= now) authAttemptWindows.delete(entryKey);
  }

  let entry = authAttemptWindows.get(key);
  if (!entry) {
    if (authAttemptWindows.size >= MAX_AUTH_ATTEMPT_KEYS) {
      const oldestKey = authAttemptWindows.keys().next().value;
      if (oldestKey) authAttemptWindows.delete(oldestKey);
    }
    entry = { attempts: 0, resetAt: now + AUTH_ATTEMPT_WINDOW_MS };
    authAttemptWindows.set(key, entry);
  }

  if (entry.attempts >= AUTH_ATTEMPT_LIMIT) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  entry.attempts += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

function getSecret(secretOverride?: string): string {
  const secret = secretOverride ?? (typeof process !== 'undefined' ? process.env?.ADMIN_SECRET : undefined);
  if (!isValidAdminSecret(secret)) {
    throw new Error('Admin signing secret is missing or too short.');
  }
  return secret;
}

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const hash = await pbkdf2(password, salt);
  return { hash, salt };
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const computedHash = await pbkdf2(password, salt);
  return computedHash === hash;
}

async function pbkdf2(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const matched = saltHex.match(/.{1,2}/g);
  const saltBytes = new Uint8Array(matched ? matched.map((byte) => parseInt(byte, 16)) : []);

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  return Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function createAdminToken(username: string, adminId?: string, secretOverride?: string): Promise<string> {
  const payload = {
    sub: username,
    adminId: adminId || username,
    role: 'vcon_admin',
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  };

  const header = { alg: 'HS256', typ: 'JWT', kid: 'admin-v2' };
  const base64UrlEncode = (obj: any) =>
    btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const data = `${encodedHeader}.${encodedPayload}`;

  const secret = getSecret(secretOverride);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${data}.${signatureBase64}`;
}

export async function verifyAdminToken(token?: string | null, secretOverride?: string): Promise<boolean> {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [encodedHeader, encodedPayload, signatureBase64] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;

  try {
    const header = JSON.parse(atob(encodedHeader.replace(/-/g, '+').replace(/_/g, '/')));
    if (header.alg !== 'HS256' || header.typ !== 'JWT' || header.kid !== 'admin-v2') return false;

    const secret = getSecret(secretOverride);
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigStr = atob(signatureBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const sigBuf = new Uint8Array(sigStr.length);
    for (let i = 0; i < sigStr.length; i++) {
      sigBuf[i] = sigStr.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify('HMAC', key, sigBuf, enc.encode(data));
    if (!isValid) return false;

    const payload = JSON.parse(atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && Date.now() > payload.exp) {
      return false;
    }

    return payload.role === 'vcon_admin';
  } catch (err) {
    return false;
  }
}
