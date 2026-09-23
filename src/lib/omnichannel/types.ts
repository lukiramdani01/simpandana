export type OmnichannelType = 'whatsapp' | 'telegram' | 'webchat' | 'line' | 'instagram' | 'webhook';

export interface OmnichannelSender {
  id: string; // e.g., phone '+6281234567890', telegram user id, or session id
  name?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface OmnichannelInboundMessage {
  id?: string;
  channel: OmnichannelType;
  sender: OmnichannelSender;
  text: string;
  mediaType?: 'text' | 'image' | 'voice' | 'document';
  mediaUrl?: string;
  timestamp?: string;
  rawPayload?: any;
}

export interface OmnichannelOutboundResponse {
  ok: boolean;
  channel: OmnichannelType;
  recipientId: string;
  replyText: string;
  transaction?: any;
  walletBalanceAfter?: number;
  latencyMs: number;
  traceId: string;
  error?: string;
}

export interface OmnichannelChannelConfig {
  id: OmnichannelType;
  name: string;
  description: string;
  icon: string;
  status: 'active' | 'inactive' | 'testing';
  webhookPath: string;
  endpointUrl?: string;
  verifyToken?: string;
  totalReceived: number;
  totalSuccess: number;
  avgLatencyMs: number;
  lastActive?: string;
}

export interface OmnichannelTrace {
  id: string;
  traceId: string;
  channel: OmnichannelType;
  senderId: string;
  senderName?: string;
  rawText: string;
  parsedType?: 'income' | 'expense' | 'transfer' | 'ambiguous';
  parsedAmount?: number;
  parsedCategory?: string;
  parsedWallet?: string;
  transactionId?: string;
  latencyMs: number;
  status: 'SUCCESS' | 'FAILED' | 'AMBIGUOUS' | 'DUPLICATE';
  processedAt: string;
  replySnippet?: string;
}
