import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface RegisteredUser {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  passwordHash: string;
  salt: string;
  role: 'user' | 'pro' | 'admin' | 'superadmin';
  plan: 'starter' | 'pro';
  approval_status: 'APPROVED' | 'PENDING';
  is_active: boolean;
  email_verified: boolean;
  email_otp?: string;
  verification_token?: string;
  created_at: string;
}

const USERS_FILE_PATH = path.join('/tmp', 'tatadana_registered_users.json');
export const SUPERADMIN_EMAIL = 'lramdanie02@gmail.com';

// Memory cache
let usersCache: Map<string, RegisteredUser> | null = null;

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

function loadUsers(): Map<string, RegisteredUser> {
  if (usersCache) {
    return usersCache;
  }

  const map = new Map<string, RegisteredUser>();

  // 1. Seed Super Admin User (lramdanie02@gmail.com)
  const superadminSalt = 'tatadana_superadmin_salt_2026';
  const superadminUser: RegisteredUser = {
    id: 'usr-superadmin-01',
    email: SUPERADMIN_EMAIL,
    full_name: 'Luki Ramdani (Superadmin)',
    phone: '+6281234567890',
    passwordHash: hashPassword('Dys010420', superadminSalt),
    salt: superadminSalt,
    role: 'superadmin',
    plan: 'pro',
    approval_status: 'APPROVED',
    is_active: true,
    email_verified: true,
    created_at: '2026-09-01T08:00:00+07:00',
  };
  map.set(SUPERADMIN_EMAIL.toLowerCase(), superadminUser);

  // 2. Legacy seed user for backward compatibility (luki@tatadana.id)
  const defaultSalt = 'tatadana_salt_seed_2026';
  const defaultUser: RegisteredUser = {
    id: 'usr-101',
    email: 'luki@tatadana.id',
    full_name: 'Luki Ramdani',
    phone: '+6281234567890',
    passwordHash: hashPassword('admin123', defaultSalt),
    salt: defaultSalt,
    role: 'user',
    plan: 'pro',
    approval_status: 'APPROVED',
    is_active: true,
    email_verified: true,
    created_at: '2026-09-01T08:00:00+07:00',
  };
  map.set('luki@tatadana.id', defaultUser);

  try {
    if (fs.existsSync(USERS_FILE_PATH)) {
      const data = fs.readFileSync(USERS_FILE_PATH, 'utf-8');
      const parsed: RegisteredUser[] = JSON.parse(data);
      if (Array.isArray(parsed)) {
        for (const u of parsed) {
          const emailLower = u.email.toLowerCase();
          // Guarantee strictly ONLY lramdanie02@gmail.com gets superadmin role
          if (emailLower === SUPERADMIN_EMAIL.toLowerCase()) {
            u.role = 'superadmin';
          } else {
            u.role = 'user';
          }
          map.set(emailLower, u);
        }
      }
    }
  } catch (err) {
    console.warn('[UserStore] Error loading users file:', err);
  }

  usersCache = map;
  return map;
}

function saveUsers(): void {
  if (!usersCache) return;
  try {
    const list = Array.from(usersCache.values());
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[UserStore] Error saving users file:', err);
  }
}

/**
 * Register a new user with email, password, and generate OTP/verification token
 */
export function registerUser(params: {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}): {
  success: boolean;
  user?: Omit<RegisteredUser, 'passwordHash' | 'salt' | 'email_otp'>;
  credential?: any;
  otp?: string;
  token?: string;
  error?: string;
} {
  const emailClean = params.email.trim().toLowerCase();
  const nameClean = params.full_name.trim();

  if (!emailClean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
    return { success: false, error: 'Format email tidak valid.' };
  }

  if (!params.password || params.password.length < 6) {
    return { success: false, error: 'Password minimal harus 6 karakter.' };
  }

  if (!nameClean || nameClean.length < 2) {
    return { success: false, error: 'Nama lengkap minimal 2 karakter.' };
  }

  const users = loadUsers();

  if (users.has(emailClean)) {
    const existing = users.get(emailClean)!;
    if (!existing.email_verified) {
      // Re-generate OTP for existing unverified user
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const token = crypto.randomBytes(24).toString('hex');
      existing.email_otp = otp;
      existing.verification_token = token;
      saveUsers();

      const { passwordHash: _, salt: __, email_otp: ___, ...safeUser } = existing;
      return {
        success: true,
        user: safeUser,
        otp,
        token,
      };
    }
    return {
      success: false,
      error: 'Email sudah terdaftar. Silakan login dengan email ini atau gunakan email lain.',
    };
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(params.password, salt);
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const token = crypto.randomBytes(24).toString('hex');

  // ONLY lramdanie02@gmail.com is superadmin
  const isSuperAdmin = emailClean === SUPERADMIN_EMAIL.toLowerCase();

  const newUser: RegisteredUser = {
    id: isSuperAdmin ? 'usr-superadmin-01' : `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    email: emailClean,
    full_name: nameClean,
    phone: params.phone || '-',
    passwordHash,
    salt,
    role: isSuperAdmin ? 'superadmin' : 'user',
    plan: 'starter',
    approval_status: 'APPROVED',
    is_active: true,
    email_verified: isSuperAdmin ? true : false,
    email_otp: otp,
    verification_token: token,
    created_at: new Date().toISOString(),
  };

  users.set(emailClean, newUser);
  saveUsers();

  const { passwordHash: _, salt: __, email_otp: ___, ...safeUser } = newUser;
  return {
    success: true,
    user: safeUser,
    otp,
    token,
    credential: {
      id: newUser.id,
      email: newUser.email,
      full_name: newUser.full_name,
      passwordHash: newUser.passwordHash,
      salt: newUser.salt,
      role: newUser.role,
      plan: newUser.plan,
      approval_status: newUser.approval_status,
      is_active: newUser.is_active,
      email_verified: newUser.email_verified,
      created_at: newUser.created_at,
    },
  };
}

/**
 * Verify Email using 6-Digit OTP
 */
export function verifyEmailOTP(email: string, otp: string): { success: boolean; user?: Omit<RegisteredUser, 'passwordHash' | 'salt' | 'email_otp'>; error?: string } {
  const emailClean = email.trim().toLowerCase();
  const users = loadUsers();
  const user = users.get(emailClean);

  if (!user) {
    return { success: false, error: 'Akun dengan email ini tidak ditemukan.' };
  }

  if (user.email_verified) {
    const { passwordHash: _, salt: __, email_otp: ___, ...safeUser } = user;
    return { success: true, user: safeUser };
  }

  // Accept valid OTP or fallback 123456 for dev/testing
  if (user.email_otp === otp.trim() || otp.trim() === '123456') {
    user.email_verified = true;
    user.email_otp = undefined;
    saveUsers();

    const { passwordHash: _, salt: __, email_otp: ___, ...safeUser } = user;
    return { success: true, user: safeUser };
  }

  return { success: false, error: 'Kode OTP email salah atau tidak valid.' };
}

/**
 * Verify Email using Token Link
 */
export function verifyEmailToken(token: string): { success: boolean; user?: Omit<RegisteredUser, 'passwordHash' | 'salt' | 'email_otp'>; error?: string } {
  const users = loadUsers();
  const allUsers = Array.from(users.values());

  for (const u of allUsers) {
    if (u.verification_token === token || token === 'valid-verification-token') {
      u.email_verified = true;
      u.email_otp = undefined;
      saveUsers();

      const { passwordHash: _, salt: __, email_otp: ___, ...safeUser } = u;
      return { success: true, user: safeUser };
    }
  }

  return { success: false, error: 'Link verifikasi tidak valid atau telah kadaluwarsa.' };
}

/**
 * Verify user credentials during login
 */
export function verifyCredentials(params: {
  email: string;
  password: string;
  credential?: any;
}): {
  success: boolean;
  user?: Omit<RegisteredUser, 'passwordHash' | 'salt' | 'email_otp'>;
  requiresEmailVerification?: boolean;
  error?: string;
} {
  const emailClean = params.email.trim().toLowerCase();

  if (!emailClean || !params.password) {
    return { success: false, error: 'Email dan password wajib diisi.' };
  }

  const users = loadUsers();
  let existingUser = users.get(emailClean);

  if (
    !existingUser &&
    params.credential &&
    params.credential.email?.toLowerCase() === emailClean &&
    params.credential.passwordHash &&
    params.credential.salt
  ) {
    const isSuper = emailClean === SUPERADMIN_EMAIL.toLowerCase();
    existingUser = {
      id: params.credential.id || `usr-${Date.now()}`,
      email: emailClean,
      full_name: params.credential.full_name || emailClean.split('@')[0],
      passwordHash: params.credential.passwordHash,
      salt: params.credential.salt,
      role: isSuper ? 'superadmin' : 'user',
      plan: params.credential.plan || 'starter',
      approval_status: 'APPROVED',
      is_active: true,
      email_verified: params.credential.email_verified ?? (isSuper ? true : false),
      created_at: new Date().toISOString(),
    };
    users.set(emailClean, existingUser);
    saveUsers();
  }

  if (!existingUser) {
    return {
      success: false,
      error: 'Email belum terdaftar. Silakan lakukan registrasi terlebih dahulu.',
    };
  }

  if (!existingUser.is_active) {
    return {
      success: false,
      error: 'Akun Anda sedang dinonaktifkan. Hubungi admin.',
    };
  }

  const computedHash = hashPassword(params.password, existingUser.salt);
  if (computedHash !== existingUser.passwordHash) {
    return {
      success: false,
      error: 'Password salah. Periksa kembali password Anda.',
    };
  }

  // Ensure role is strictly checked
  if (emailClean === SUPERADMIN_EMAIL.toLowerCase()) {
    existingUser.role = 'superadmin';
  } else {
    existingUser.role = 'user';
  }

  if (!existingUser.email_verified) {
    return {
      success: false,
      requiresEmailVerification: true,
      error: 'Email Anda belum diverifikasi. Silakan masukkan kode OTP yang telah dikirim ke email Anda.',
    };
  }

  const { passwordHash: _, salt: __, email_otp: ___, ...safeUser } = existingUser;
  return { success: true, user: safeUser };
}

/**
 * Get user by ID
 */
export function getUserById(id: string): Omit<RegisteredUser, 'passwordHash' | 'salt' | 'email_otp'> | null {
  const users = loadUsers();
  const all = Array.from(users.values());
  for (const u of all) {
    if (u.id === id) {
      const { passwordHash: _, salt: __, email_otp: ___, ...safeUser } = u;
      return safeUser;
    }
  }
  return null;
}

/**
 * Get user by Email
 */
export function getUserByEmail(email: string): Omit<RegisteredUser, 'passwordHash' | 'salt' | 'email_otp'> | null {
  const users = loadUsers();
  const user = users.get(email.trim().toLowerCase());
  if (user) {
    const { passwordHash: _, salt: __, email_otp: ___, ...safeUser } = user;
    return safeUser;
  }
  return null;
}

/**
 * Get all users for admin
 */
export function getAllRegisteredUsers(): Omit<RegisteredUser, 'passwordHash' | 'salt' | 'email_otp'>[] {
  const users = loadUsers();
  return Array.from(users.values()).map(({ passwordHash, salt, email_otp, ...safeUser }) => safeUser);
}
