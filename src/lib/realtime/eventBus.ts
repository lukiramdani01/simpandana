import { EventEmitter } from 'node:events';

declare global {
  var __realtimeEventBus__: EventEmitter | undefined;
}

if (!globalThis.__realtimeEventBus__) {
  globalThis.__realtimeEventBus__ = new EventEmitter();
  globalThis.__realtimeEventBus__.setMaxListeners(100);
}

export const realtimeEventBus: EventEmitter = globalThis.__realtimeEventBus__;
