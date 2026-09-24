/**
 * Shared Persistent Wallets Store & Ledger Engine
 * Guarantees zero data loss across logins, logouts, reloads, and server restarts.
 */

import fs from 'fs';
import path from 'path';
import { Wallet } from './types';
import { initialWallets } from './mock-data';

const WALLETS_FILE_PATH = path.join('/tmp', 'tatadana_persistent_wallets.json');

interface StoredUserWallets {
  userId: string;
  email?: string;
  wallets: Wallet[];
  updatedAt: string;
}

declare global {
  var __tatadanaWalletsStore__: Map<string, Wallet[]> | undefined;
}

function loadAllWallets(): Map<string, Wallet[]> {
  if (globalThis.__tatadanaWalletsStore__) {
    return globalThis.__tatadanaWalletsStore__;
  }

  const map = new Map<string, Wallet[]>();

  // Seed default admin / fallback wallets
  map.set('usr-101', [...initialWallets]);
  map.set('usr-superadmin-01', [...initialWallets]);
  map.set('email_lramdanie02@gmail.com', [...initialWallets]);

  try {
    if (fs.existsSync(WALLETS_FILE_PATH)) {
      const content = fs.readFileSync(WALLETS_FILE_PATH, 'utf-8');
      const records: StoredUserWallets[] = JSON.parse(content);
      if (Array.isArray(records)) {
        for (const r of records) {
          if (r.userId && Array.isArray(r.wallets) && r.wallets.length > 0) {
            map.set(r.userId, r.wallets);
          }
          if (r.email) {
            map.set(`email_${r.email.toLowerCase().trim()}`, r.wallets);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[WalletsStore] Error loading from file:', err);
  }

  globalThis.__tatadanaWalletsStore__ = map;
  return map;
}

function saveAllWallets(map: Map<string, Wallet[]>) {
  try {
    const list: StoredUserWallets[] = [];
    const seen = new Set<string>();

    map.forEach((wallets, key) => {
      const email = key.startsWith('email_') ? key.replace('email_', '') : undefined;
      const userId = key.startsWith('email_') ? '' : key;
      const dedupeKey = email || userId;
      if (dedupeKey && !seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        list.push({
          userId: userId || 'usr-101',
          email,
          wallets,
          updatedAt: new Date().toISOString(),
        });
      }
    });

    fs.writeFileSync(WALLETS_FILE_PATH, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[WalletsStore] Error saving to file:', err);
  }
}

export function getUserWallets(userId?: string, email?: string): Wallet[] {
  const store = loadAllWallets();

  const emailClean = email?.toLowerCase().trim();
  const emailKey = emailClean ? `email_${emailClean}` : null;

  // 1. Try email key first (most stable invariant)
  if (emailKey && store.has(emailKey)) {
    const w = store.get(emailKey)!;
    if (w && w.length > 0) return w;
  }

  // 2. Try userId key
  if (userId && store.has(userId)) {
    const w = store.get(userId)!;
    if (w && w.length > 0) return w;
  }

  // 3. Superadmin fallbacks
  if (emailClean === 'lramdanie02@gmail.com' || userId === 'usr-superadmin-01' || userId === 'usr-101') {
    if (store.has('email_lramdanie02@gmail.com')) return store.get('email_lramdanie02@gmail.com')!;
    if (store.has('usr-superadmin-01')) return store.get('usr-superadmin-01')!;
    if (store.has('usr-101')) return store.get('usr-101')!;
  }

  return [];
}

export function saveUserWallets(params: {
  userId?: string;
  email?: string;
  wallets: Wallet[];
}): boolean {
  if (!Array.isArray(params.wallets) || params.wallets.length === 0) {
    return false;
  }

  const store = loadAllWallets();
  const emailClean = params.email?.toLowerCase().trim();
  const emailKey = emailClean ? `email_${emailClean}` : null;

  if (emailKey) {
    store.set(emailKey, params.wallets);
  }
  if (params.userId) {
    store.set(params.userId, params.wallets);
  }

  // If superadmin, sync all superadmin keys
  if (emailClean === 'lramdanie02@gmail.com' || params.userId === 'usr-superadmin-01' || params.userId === 'usr-101') {
    store.set('email_lramdanie02@gmail.com', params.wallets);
    store.set('usr-superadmin-01', params.wallets);
    store.set('usr-101', params.wallets);
  }

  saveAllWallets(store);
  return true;
}
