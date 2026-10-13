import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection packet
      const initEvent = `event: connected\ndata: ${JSON.stringify({ status: 'connected', time: new Date().toISOString() })}\n\n`;
      controller.enqueue(encoder.encode(initEvent));

      // Emit simulated periodic heartbeat and telemetry events every 6 seconds
      const interval = setInterval(() => {
        try {
          const sampleMerchants = ['AWS Cloud Services', 'RunPod GPU Hub', 'GitHub Copilot', 'OpenAI API', 'HuggingFace Pro'];
          const merchant = sampleMerchants[Math.floor(Math.random() * sampleMerchants.length)];
          const amount = Math.floor(20 + Math.random() * 80);
          
          const eventPayload = {
            id: `evt-${Date.now()}`,
            type: 'TELEMETRY_HEARTBEAT',
            merchant,
            amount,
            status: 'in-policy',
            timestamp: new Date().toLocaleTimeString(),
          };

          const sseMsg = `event: telemetry\ndata: ${JSON.stringify(eventPayload)}\n\n`;
          controller.enqueue(encoder.encode(sseMsg));
        } catch (e) {
          clearInterval(interval);
        }
      }, 6000);

      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
