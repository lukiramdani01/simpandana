export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          phone: string | null;
          full_name: string;
          avatar_url: string | null;
          default_currency: string;
          timezone: string;
          plan: 'starter' | 'pro';
          role: 'user' | 'superadmin';
          approval_status: 'pending_approval' | 'approved' | 'rejected' | 'suspended';
          is_active: boolean;
          telegram_user_id: number | null;
          telegram_chat_id: number | null;
          telegram_username: string | null;
          telegram_bot_token: string | null;
          telegram_welcome_sent?: boolean | null;
          telegram_welcome_sent_at?: string | null;
          is_phone_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          phone?: string | null;
          full_name?: string;
          avatar_url?: string | null;
          default_currency?: string;
          timezone?: string;
          plan?: 'starter' | 'pro';
          role?: 'user' | 'superadmin';
          approval_status?: 'pending_approval' | 'approved' | 'rejected' | 'suspended';
          is_active?: boolean;
          telegram_user_id?: number | null;
          telegram_chat_id?: number | null;
          telegram_username?: string | null;
          telegram_bot_token?: string | null;
          telegram_welcome_sent?: boolean | null;
          telegram_welcome_sent_at?: string | null;
          is_phone_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          phone?: string | null;
          full_name?: string;
          avatar_url?: string | null;
          default_currency?: string;
          timezone?: string;
          plan?: 'starter' | 'pro';
          role?: 'user' | 'superadmin';
          approval_status?: 'pending_approval' | 'approved' | 'rejected' | 'suspended';
          is_active?: boolean;
          telegram_user_id?: number | null;
          telegram_chat_id?: number | null;
          telegram_username?: string | null;
          telegram_bot_token?: string | null;
          telegram_welcome_sent?: boolean | null;
          telegram_welcome_sent_at?: string | null;
          is_phone_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      wallets: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: 'bank' | 'ewallet' | 'cash';
          balance: number;
          is_default: boolean;
          icon: string;
          color: string;
          account_number: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type?: 'bank' | 'ewallet' | 'cash';
          balance?: number;
          is_default?: boolean;
          icon?: string;
          color?: string;
          account_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: 'bank' | 'ewallet' | 'cash';
          balance?: number;
          is_default?: boolean;
          icon?: string;
          color?: string;
          account_number?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'wallets_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: 'income' | 'expense';
          icon: string;
          color: string;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: 'income' | 'expense';
          icon?: string;
          color?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: 'income' | 'expense';
          icon?: string;
          color?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'categories_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          monthly_limit: number;
          current_spent: number;
          month: number;
          year: number;
          alert_80_sent: boolean;
          alert_100_sent: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          monthly_limit: number;
          current_spent?: number;
          month: number;
          year: number;
          alert_80_sent?: boolean;
          alert_100_sent?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string;
          monthly_limit?: number;
          current_spent?: number;
          month?: number;
          year?: number;
          alert_80_sent?: boolean;
          alert_100_sent?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'budgets_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'budgets_category_id_fkey';
            columns: ['category_id'];
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          }
        ];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          wallet_id: string;
          to_wallet_id: string | null;
          category_id: string | null;
          type: 'income' | 'expense' | 'transfer';
          amount: number;
          date: string;
          time_wib: string;
          notes: string | null;
          source: 'web' | 'telegram' | 'telegram_text' | 'telegram_photo' | 'telegram_voice' | string;
          receipt_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          wallet_id: string;
          to_wallet_id?: string | null;
          category_id?: string | null;
          type: 'income' | 'expense' | 'transfer';
          amount: number;
          date?: string;
          time_wib?: string;
          notes?: string | null;
          source?: 'web' | 'telegram' | 'telegram_text' | 'telegram_photo' | 'telegram_voice' | string;
          receipt_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          wallet_id?: string;
          to_wallet_id?: string | null;
          category_id?: string | null;
          type?: 'income' | 'expense' | 'transfer';
          amount?: number;
          date?: string;
          time_wib?: string;
          notes?: string | null;
          source?: 'web' | 'telegram' | 'telegram_text' | 'telegram_photo' | 'telegram_voice' | string;
          receipt_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'transactions_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_wallet_id_fkey';
            columns: ['wallet_id'];
            referencedRelation: 'wallets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_to_wallet_id_fkey';
            columns: ['to_wallet_id'];
            referencedRelation: 'wallets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transactions_category_id_fkey';
            columns: ['category_id'];
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          }
        ];
      };
      transaction_items: {
        Row: {
          id: string;
          transaction_id: string;
          item_name: string;
          quantity: number;
          price: number;
          category_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          item_name: string;
          quantity?: number;
          price: number;
          category_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          transaction_id?: string;
          item_name?: string;
          quantity?: number;
          price?: number;
          category_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'transaction_items_transaction_id_fkey';
            columns: ['transaction_id'];
            referencedRelation: 'transactions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'transaction_items_category_id_fkey';
            columns: ['category_id'];
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          }
        ];
      };
      reminders: {
        Row: {
          id: string;
          user_id: string;
          is_active: boolean;
          frequency: number;
          time_1: string;
          time_2: string;
          last_sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          is_active?: boolean;
          frequency?: number;
          time_1?: string;
          time_2?: string;
          last_sent_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          is_active?: boolean;
          frequency?: number;
          time_1?: string;
          time_2?: string;
          last_sent_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reminders_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      ai_providers: {
        Row: {
          id: string;
          name: 'gemini' | 'openai' | 'deepseek';
          is_active: boolean;
          priority: number;
          encrypted_api_key: string | null;
          model_name: string | null;
          base_url?: string | null;
          mode: 'single' | 'parallel';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: 'gemini' | 'openai' | 'deepseek';
          is_active?: boolean;
          priority?: number;
          encrypted_api_key?: string | null;
          model_name?: string | null;
          base_url?: string | null;
          mode?: 'single' | 'parallel';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: 'gemini' | 'openai' | 'deepseek';
          is_active?: boolean;
          priority?: number;
          encrypted_api_key?: string | null;
          model_name?: string | null;
          base_url?: string | null;
          mode?: 'single' | 'parallel';
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_logs: {
        Row: {
          id: string;
          user_id: string | null;
          provider: 'gemini' | 'openai' | 'deepseek' | 'fallback_regex';
          action: string;
          prompt_tokens: number;
          completion_tokens: number;
          latency_ms: number;
          status: 'success' | 'error' | 'failed' | 'timeout' | 'fallback';
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          provider: 'gemini' | 'openai' | 'deepseek' | 'fallback_regex';
          action?: string;
          prompt_tokens?: number;
          completion_tokens?: number;
          latency_ms?: number;
          status: 'success' | 'error' | 'failed' | 'timeout' | 'fallback';
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          provider?: 'gemini' | 'openai' | 'deepseek' | 'fallback_regex';
          action?: string;
          prompt_tokens?: number;
          completion_tokens?: number;
          latency_ms?: number;
          status?: 'success' | 'error' | 'failed' | 'timeout' | 'fallback';
          error_message?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'ai_logs_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          admin_id: string | null;
          target_user_id: string | null;
          action: string;
          reason: string | null;
          ip_address: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id?: string | null;
          target_user_id?: string | null;
          action: string;
          reason?: string | null;
          ip_address?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string | null;
          target_user_id?: string | null;
          action?: string;
          reason?: string | null;
          ip_address?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_logs_admin_id_fkey';
            columns: ['admin_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audit_logs_target_user_id_fkey';
            columns: ['target_user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan: 'starter' | 'pro';
          status: 'pending' | 'active' | 'expired' | 'cancelled' | 'pending_approval';
          midtrans_order_id: string;
          payment_type: string | null;
          amount: number;
          proof_url: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan: 'starter' | 'pro';
          status?: 'pending' | 'active' | 'expired' | 'cancelled' | 'pending_approval';
          midtrans_order_id: string;
          payment_type?: string | null;
          amount?: number;
          proof_url?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan?: 'starter' | 'pro';
          status?: 'pending' | 'active' | 'expired' | 'cancelled' | 'pending_approval';
          midtrans_order_id?: string;
          payment_type?: string | null;
          amount?: number;
          proof_url?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'subscriptions_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      telegram_webhook_updates: {
        Row: {
          update_id: number;
          user_id: string | null;
          chat_id: number | null;
          message_text: string | null;
          processed_at: string;
        };
        Insert: {
          update_id: number;
          user_id?: string | null;
          chat_id?: number | null;
          message_text?: string | null;
          processed_at?: string;
        };
        Update: {
          update_id?: number;
          user_id?: string | null;
          chat_id?: number | null;
          message_text?: string | null;
          processed_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_superadmin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Convenience Type Aliases for Application Code
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export type Wallet = Database['public']['Tables']['wallets']['Row'];
export type WalletInsert = Database['public']['Tables']['wallets']['Insert'];
export type WalletUpdate = Database['public']['Tables']['wallets']['Update'];

export type Category = Database['public']['Tables']['categories']['Row'];
export type CategoryInsert = Database['public']['Tables']['categories']['Insert'];
export type CategoryUpdate = Database['public']['Tables']['categories']['Update'];

export type Budget = Database['public']['Tables']['budgets']['Row'];
export type BudgetInsert = Database['public']['Tables']['budgets']['Insert'];
export type BudgetUpdate = Database['public']['Tables']['budgets']['Update'];

export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update'];

export type TransactionItem = Database['public']['Tables']['transaction_items']['Row'];
export type TransactionItemInsert = Database['public']['Tables']['transaction_items']['Insert'];
export type TransactionItemUpdate = Database['public']['Tables']['transaction_items']['Update'];

export type Reminder = Database['public']['Tables']['reminders']['Row'];
export type ReminderInsert = Database['public']['Tables']['reminders']['Insert'];
export type ReminderUpdate = Database['public']['Tables']['reminders']['Update'];

export type AIProvider = Database['public']['Tables']['ai_providers']['Row'];
export type AIProviderInsert = Database['public']['Tables']['ai_providers']['Insert'];
export type AIProviderUpdate = Database['public']['Tables']['ai_providers']['Update'];

export type AILog = Database['public']['Tables']['ai_logs']['Row'];
export type AILogInsert = Database['public']['Tables']['ai_logs']['Insert'];
export type AILogUpdate = Database['public']['Tables']['ai_logs']['Update'];

export type AuditLog = Database['public']['Tables']['audit_logs']['Row'];
export type AuditLogInsert = Database['public']['Tables']['audit_logs']['Insert'];
export type AuditLogUpdate = Database['public']['Tables']['audit_logs']['Update'];

export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type SubscriptionInsert = Database['public']['Tables']['subscriptions']['Insert'];
export type SubscriptionUpdate = Database['public']['Tables']['subscriptions']['Update'];

export type TelegramWebhookUpdate = Database['public']['Tables']['telegram_webhook_updates']['Row'];
export type TelegramWebhookUpdateInsert = Database['public']['Tables']['telegram_webhook_updates']['Insert'];
export type TelegramWebhookUpdateUpdate = Database['public']['Tables']['telegram_webhook_updates']['Update'];
