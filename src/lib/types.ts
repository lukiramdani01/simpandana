export type PlanType = 'starter' | 'pro';

export interface UserProfile {
  id: string;
  phone: string;
  full_name: string;
  avatar_url?: string;
  default_currency: string;
  timezone: string;
  plan: PlanType;
  role?: string;
  approval_status?: string;
  telegram_user_id?: number;
  telegram_chat_id?: number;
  telegram_bot_token?: string;
  is_phone_verified: boolean;
  created_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  name: string;
  type: 'bank' | 'ewallet' | 'cash' | 'other';
  balance: number;
  initial_balance?: number;
  is_default: boolean;
  icon: string;
  color: string;
  account_number?: string;
}

export interface Category {
  id: string;
  user_id?: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  is_default: boolean;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  category_name?: string;
  category_icon?: string;
  monthly_limit: number;
  current_spent: number;
  month: number;
  year: number;
  alert_80_sent: boolean;
  alert_100_sent: boolean;
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  item_name: string;
  quantity: number;
  price: number;
  category_id?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  wallet_id: string;
  wallet_name?: string;
  category_id?: string;
  category_name?: string;
  category_icon?: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  date: string;
  time_wib: string;
  notes: string;
  source: 'web' | 'telegram_text' | 'telegram_photo' | 'telegram_voice';
  receipt_url?: string;
  items?: TransactionItem[];
  created_at: string;
}

export interface AIProviderConfig {
  id: string;
  name: 'gemini' | 'openai' | 'deepseek';
  displayName: string;
  isActive: boolean;
  priority: number;
  encryptedKey: string;
  modelName: string;
  mode: 'single' | 'parallel';
  avgLatencyMs: number;
  status: 'operational' | 'degraded' | 'standby';
}

export interface AILog {
  id: string;
  provider: string;
  action: string;
  prompt_tokens: number;
  completion_tokens: number;
  latency_ms: number;
  status: 'success' | 'failed' | 'fallback';
  created_at: string;
}
