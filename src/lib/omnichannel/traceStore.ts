import { OmnichannelChannelConfig, OmnichannelTrace, OmnichannelType } from './types';

declare global {
  var __omnichannelTraces__: OmnichannelTrace[] | undefined;
  var __omnichannelChannels__: OmnichannelChannelConfig[] | undefined;
}

const defaultChannels: OmnichannelChannelConfig[] = [
  {
    id: 'whatsapp',
    name: 'WhatsApp Official & WABA',
    description: 'Meta Cloud API & Gateway Webhook untuk pencatatan via pesan WA',
    icon: '💬',
    status: 'active',
    webhookPath: '/api/omnichannel/webhook?channel=whatsapp',
    verifyToken: 'simpandana_wa_token_2026',
    totalReceived: 42,
    totalSuccess: 42,
    avgLatencyMs: 145,
    lastActive: new Date().toISOString(),
  },
  {
    id: 'telegram',
    name: 'Telegram Bot Engine',
    description: 'Shared Telegram Bot (@simpandanabot) dengan multi-wallet sync',
    icon: '✈️',
    status: 'active',
    webhookPath: '/api/telegram/webhook',
    totalReceived: 158,
    totalSuccess: 156,
    avgLatencyMs: 120,
    lastActive: new Date().toISOString(),
  },
  {
    id: 'webchat',
    name: 'Web Chat & In-App Widget',
    description: 'Widget obrolan langsung di dalam dashboard web SimpanDana',
    icon: '🌐',
    status: 'active',
    webhookPath: '/api/omnichannel/simulate',
    totalReceived: 29,
    totalSuccess: 29,
    avgLatencyMs: 85,
    lastActive: new Date().toISOString(),
  },
  {
    id: 'webhook',
    name: 'Universal REST Webhook',
    description: 'Custom API integration untuk integrasi pihak ketiga & SaaS ERP',
    icon: '⚡',
    status: 'active',
    webhookPath: '/api/omnichannel/webhook',
    verifyToken: 'simpandana_sec_hook_2026',
    totalReceived: 18,
    totalSuccess: 18,
    avgLatencyMs: 95,
    lastActive: new Date().toISOString(),
  },
];

if (!globalThis.__omnichannelTraces__) {
  globalThis.__omnichannelTraces__ = [];
}

if (!globalThis.__omnichannelChannels__) {
  globalThis.__omnichannelChannels__ = [...defaultChannels];
}

export function getOmnichannelChannels(): OmnichannelChannelConfig[] {
  return globalThis.__omnichannelChannels__ || defaultChannels;
}

export function updateOmnichannelChannel(id: OmnichannelType, updates: Partial<OmnichannelChannelConfig>) {
  const channels = getOmnichannelChannels();
  const index = channels.findIndex((c) => c.id === id);
  if (index !== -1) {
    channels[index] = { ...channels[index], ...updates };
  }
}

export function recordOmnichannelTrace(trace: OmnichannelTrace) {
  if (!globalThis.__omnichannelTraces__) {
    globalThis.__omnichannelTraces__ = [];
  }
  globalThis.__omnichannelTraces__.unshift(trace);
  if (globalThis.__omnichannelTraces__.length > 100) {
    globalThis.__omnichannelTraces__ = globalThis.__omnichannelTraces__.slice(0, 100);
  }

  // Update channel stats
  const channels = getOmnichannelChannels();
  const ch = channels.find((c) => c.id === trace.channel);
  if (ch) {
    ch.totalReceived += 1;
    if (trace.status === 'SUCCESS') ch.totalSuccess += 1;
    ch.lastActive = new Date().toISOString();
    ch.avgLatencyMs = Math.round((ch.avgLatencyMs * 0.8) + (trace.latencyMs * 0.2));
  }
}

export function getOmnichannelTraces(limit: number = 30): OmnichannelTrace[] {
  return (globalThis.__omnichannelTraces__ || []).slice(0, limit);
}
