/**
 * Proxy route — forwards POST /api/test-cases to the FastAPI backend at
 * ${FASTAPI_URL}/api/test-cases and returns the JSON response unchanged.
 *
 * Unlike /api/chat, this endpoint is NOT streaming. The backend renders
 * deterministic template-based test cases synchronously, so a single
 * request/response cycle is sufficient.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BACKEND_URL = process.env.FASTAPI_URL ?? 'http://localhost:8000';

export async function POST(req: Request): Promise<Response> {
  const body = await req.text();

  try {
    const upstream = await fetch(`${BACKEND_URL}/api/test-cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: req.signal,
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown proxy error';
    return new Response(
      JSON.stringify({ detail: `Proxy error: ${message}` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
