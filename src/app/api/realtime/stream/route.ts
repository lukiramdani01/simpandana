import { NextRequest } from 'next/server';
import { realtimeEventBus } from '@/lib/realtime/eventBus';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId') || 'usr-101';
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial handshake
      try {
        controller.enqueue(
          encoder.encode(`event: connected\ndata: {"status":"connected","userId":"${userId}"}\n\n`)
        );
      } catch {
        // Stream closed early
      }

      const onSync = (data: any) => {
        try {
          if (!data.userId || data.userId === userId || userId === 'all') {
            controller.enqueue(
              encoder.encode(`event: sync\ndata: ${JSON.stringify(data)}\n\n`)
            );
          }
        } catch {
          // Stream error or disconnected
        }
      };

      realtimeEventBus.on('sync', onSync);

      // Keepalive heartbeat every 20s
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 20000);

      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval);
        realtimeEventBus.off('sync', onSync);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
