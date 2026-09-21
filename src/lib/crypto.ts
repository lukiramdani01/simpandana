import crypto from 'crypto';

const SECRET = process.env.ENCRYPTION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'simpanuang-default-secure-encryption-key-32b';
const KEY = crypto.createHash('sha256').update(SECRET).digest();

/**
 * Encrypts sensitive string (e.g. Telegram Bot Token or AI Provider API Key) using AES-256-GCM
 */
export function encryptToken(plainText: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts sensitive string previously encrypted with AES-256-GCM
 */
export function decryptToken(cipherText: string): string {
  if (!cipherText) return '';
  // If not in encrypted format (e.g. legacy plain text), return as is
  if (!cipherText.includes(':')) return cipherText;
  
  try {
    const [ivHex, authTagHex, encrypted] = cipherText.split(':');
    if (!ivHex || !authTagHex || !encrypted) return cipherText;
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.warn('[Crypto] Failed to decrypt token, returning fallback:', err);
    return cipherText;
  }
}
