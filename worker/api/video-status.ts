import { AGNES_API_ROOT } from '../_lib/config';
import { agnesHeaders, normalizeAgnesError } from '../_lib/agnes';
import type { Env } from '../_lib/types';

type NormStatus = 'queued' | 'in_progress' | 'completed' | 'failed';
function normalizeStatus(s?: string): NormStatus {
  if (s === 'completed' || s === 'failed' || s === 'in_progress') return s;
  return 'queued';
}

export async function videoStatusHandler(request: Request, env: Env): Promise<Response> {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ error: '缺少 id' }, 400);
  if (!env.AGNES_API_KEY) return json({ error: '服务未配置' }, 503);

  const upstream = await fetch(`${AGNES_API_ROOT}/agnesapi?video_id=${encodeURIComponent(id)}`, {
    headers: agnesHeaders(env.AGNES_API_KEY),
  });
  if (!upstream.ok) {
    const { status, message } = normalizeAgnesError(upstream.status);
    return json({ error: message }, status);
  }
  const data = await upstream.json() as { status?: string; progress?: number; metadata?: { url?: string } };
  const status = normalizeStatus(data.status);
  const url = status === 'completed' ? data.metadata?.url : undefined;
  return json({ status, progress: typeof data.progress === 'number' ? data.progress : 0, url }, 200);
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
