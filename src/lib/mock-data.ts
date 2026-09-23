import { Wallet, Category, Budget, Transaction, UserProfile, AIProviderConfig, AILog } from './types';

export const initialProfile: UserProfile = {
  id: 'usr-101',
  phone: '+628****7890',
  full_name: 'Luki Ramdani',
  default_currency: 'IDR',
  timezone: 'Asia/Jakarta',
  plan: 'starter',
  telegram_user_id: 182938491,
  telegram_chat_id: 182938491,
  telegram_bot_token: '7293849182:AAH9fklmN2xLpQ09v-example',
  is_phone_verified: true,
  created_at: '2026-09-01T08:00:00+07:00',
};

export const initialWallets: Wallet[] = [
  {
    id: 'w-1',
    user_id: 'usr-101',
    name: 'BCA Utama',
    type: 'bank',
    balance: 0,
    initial_balance: 0,
    is_default: true,
    icon: '🏦',
    color: '#0066AE',
    account_number: '5420-9182-33',
  },
  {
    id: 'w-2',
    user_id: 'usr-101',
    name: 'Mandiri Tabungan',
    type: 'bank',
    balance: 0,
    initial_balance: 0,
    is_default: false,
    icon: '💳',
    color: '#003D79',
    account_number: '137-00-19283-1',
  },
  {
    id: 'w-3',
    user_id: 'usr-101',
    name: 'GoPay',
    type: 'ewallet',
    balance: 0,
    initial_balance: 0,
    is_default: false,
    icon: '📱',
    color: '#00AED6',
    account_number: '+62 812-3456-7890',
  },
];

export const initialCategories: Category[] = [
  { id: 'c-1', name: 'Makanan & Minuman', type: 'expense', icon: '🍜', color: '#FF5A1F', is_default: true },
  { id: 'c-2', name: 'Transportasi', type: 'expense', icon: '🚗', color: '#F59E0B', is_default: true },
  { id: 'c-3', name: 'Tagihan & Utilitas', type: 'expense', icon: '🏠', color: '#EF4444', is_default: true },
  { id: 'c-4', name: 'Belanja', type: 'expense', icon: '👕', color: '#3B82F6', is_default: true },
  { id: 'c-5', name: 'Hiburan', type: 'expense', icon: '🎮', color: '#8B5CF6', is_default: true },
  { id: 'c-6', name: 'Kesehatan', type: 'expense', icon: '💊', color: '#10B981', is_default: true },
  { id: 'c-tabungan', name: 'Tabungan', type: 'expense', icon: '🏦', color: '#06B6D4', is_default: true },
  { id: 'c-investasi', name: 'Investasi', type: 'expense', icon: '📈', color: '#10B981', is_default: true },
  { id: 'c-7', name: 'Gaji Bulanan', type: 'income', icon: '💼', color: '#10B981', is_default: true },
  { id: 'c-8', name: 'Freelance & Bonus', type: 'income', icon: '💰', color: '#059669', is_default: true },
];

export const initialBudgets: Budget[] = [
  {
    id: 'b-1',
    user_id: 'usr-101',
    category_id: 'c-1',
    category_name: 'Makanan & Minuman',
    category_icon: '🍜',
    monthly_limit: 1500000,
    current_spent: 0,
    month: 9,
    year: 2026,
    alert_80_sent: false,
    alert_100_sent: false,
  },
  {
    id: 'b-2',
    user_id: 'usr-101',
    category_id: 'c-2',
    category_name: 'Transportasi',
    category_icon: '🚗',
    monthly_limit: 600000,
    current_spent: 0,
    month: 9,
    year: 2026,
    alert_80_sent: false,
    alert_100_sent: false,
  },
];

export const initialTransactions: Transaction[] = [];

export const initialAIProviders: AIProviderConfig[] = [
  {
    id: 'ai-1',
    name: 'gemini',
    displayName: 'Google Gemini (AI Studio)',
    isActive: true,
    priority: 1,
    encryptedKey: 'AIzaSy...Configured',
    modelName: 'gemini-2.5-flash',
    mode: 'single',
    avgLatencyMs: 180,
    status: 'operational',
  },
];

export const initialAILogs: AILog[] = [];
