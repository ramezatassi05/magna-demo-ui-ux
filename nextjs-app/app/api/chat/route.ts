/**
 * Proxy route — forwards POST /api/chat to the FastAPI agent at
 * ${FASTAPI_URL}/api/chat and streams the Server-Sent Events body back
 * to the browser unchanged.
 *
 * The FastAPI backend emits custom JSON events per the AgentEvent union
 * in lib/types.ts (thinking, tool_call, tool_result, text, table, chart,
 * test_cases, done, error). This route is an opaque passthrough — all
 * parsing lives in hooks/use-agent-chat.ts.
 *
 * SSE semantics: errors flow through the stream as synthetic `error`
 * frames with HTTP 200, not as HTTP error codes, so the client reducer
 * sees them as typed events.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.FASTAPI_URL ?? 'http://localhost:8000';

const SSE_HEADERS: HeadersInit = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  // Defeat proxy buffering (nginx, Vercel edge) so frames flush immediately.
  'X-Accel-Buffering': 'no',
};

export async function POST(req: Request): Promise<Response> {
  const body = await req.text();

  try {
    const upstream = await fetch(`${BACKEND_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body,
      // Propagate client disconnects to FastAPI so it can cancel LLM work.
      signal: req.signal,
    });

    if (!upstream.ok || !upstream.body) {
      return synthErrorStream(
        `Backend returned HTTP ${upstream.status} ${upstream.statusText}`,
      );
    }

    return new Response(upstream.body, { status: 200, headers: SSE_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown proxy error';
    return synthErrorStream(message);
  }
}

/** Emits a single `error` SSE frame and closes the stream. */
function synthErrorStream(message: string): Response {
  const payload = JSON.stringify({
    type: 'error',
    seq: 0,
    run_id: 'proxy',
    message,
  });
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(`data: ${payload}\n\n`));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: SSE_HEADERS });
}
