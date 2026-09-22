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
  created_at: string;
}

const USERS_FILE_PATH = path.join('/tmp', 'tatadana_registered_users.json');

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

  // Default seed user (Luki Ramdani / Owner)
  const defaultSalt = 'tatadana_salt_seed_2026';
  const defaultUser: RegisteredUser = {
    id: 'usr-101',
    email: 'luki@tatadana.id',
    full_name: 'Luki Ramdani',
    phone: '+6281234567890',
    passwordHash: hashPassword('admin123', defaultSalt),
    salt: defaultSalt,
    role: 'superadmin',
    plan: 'pro',
    approval_status: 'APPROVED',
    is_active: true,
    created_at: '2026-09-01T08:00:00+07:00',
  };
  map.set(defaultUser.email.toLowerCase(), defaultUser);

  try {
    if (fs.existsSync(USERS_FILE_PATH)) {
      const data = fs.readFileSync(USERS_FILE_PATH, 'utf-8');
      const parsed: RegisteredUser[] = JSON.parse(data);
      if (Array.isArray(parsed)) {
        for (const u of parsed) {
          map.set(u.email.toLowerCase(), u);
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
 * Register a new user with email and password
 */
export function registerUser(params: {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
}): { success: boolean; user?: Omit<RegisteredUser, 'passwordHash' | 'salt'>; error?: string } {
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
    return {
      success: false,
      error: 'Email sudah terdaftar. Silakan login dengan email ini atau gunakan email lain.',
    };
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(params.password, salt);

  const newUser: RegisteredUser = {
    id: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    email: emailClean,
    full_name: nameClean,
    phone: params.phone || '-',
    passwordHash,
    salt,
    role: 'user',
    plan: 'starter',
    approval_status: 'APPROVED',
    is_active: true,
    created_at: new Date().toISOString(),
  };

  users.set(emailClean, newUser);
  saveUsers();

  const { passwordHash: _, salt: __, ...safeUser } = newUser;
  return { success: true, user: safeUser };
}

/**
 * Verify user credentials during login
 */
export function verifyCredentials(params: {
  email: string;
  password: string;
}): { success: boolean; user?: Omit<RegisteredUser, 'passwordHash' | 'salt'>; error?: string } {
  const emailClean = params.email.trim().toLowerCase();

  if (!emailClean || !params.password) {
    return { success: false, error: 'Email dan password wajib diisi.' };
  }

  const users = loadUsers();
  const existingUser = users.get(emailClean);

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

  const { passwordHash: _, salt: __, ...safeUser } = existingUser;
  return { success: true, user: safeUser };
}

/**
 * Get user by ID
 */
export function getUserById(id: string): Omit<RegisteredUser, 'passwordHash' | 'salt'> | null {
  const users = loadUsers();
  const all = Array.from(users.values());
  for (const u of all) {
    if (u.id === id) {
      const { passwordHash: _, salt: __, ...safeUser } = u;
      return safeUser;
    }
  }
  return null;
}

/**
 * Get all users for admin
 */
export function getAllRegisteredUsers(): Omit<RegisteredUser, 'passwordHash' | 'salt'>[] {
  const users = loadUsers();
  return Array.from(users.values()).map(({ passwordHash, salt, ...safeUser }) => safeUser);
}
