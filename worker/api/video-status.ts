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
  const data = await upstream.json() as any;
  const status = normalizeStatus(data.status);
  // agnes 完成时 video URL 的实际位置待确认（文档说 metadata.url，但实测 status 返 completed 却无 url）。
  // 先鲁棒尝试几个常见位置；同时透出 _raw 供前端/日志诊断真实结构。确认后移除 _raw。
  const rawUrl = data?.metadata?.url || data?.url || data?.video_url || data?.output?.url || data?.result?.url;
  const url = status === 'completed' ? rawUrl : undefined;
  console.log('[video-status] agnes raw:', JSON.stringify(data));
  return json({ status, progress: typeof data.progress === 'number' ? data.progress : 0, url, _raw: data }, 200);
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
