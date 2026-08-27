import { AGNES_API_ROOT, VIDEO_STATUS_RATE_LIMIT_MAX, VIDEO_STATUS_RATE_LIMIT_WINDOW_SEC, VIDEO_STATUS_CACHE_TTL_SEC } from '../_lib/config';
import { agnesHeaders, normalizeAgnesError } from '../_lib/agnes';
import { checkRateLimit, clientIP } from '../_lib/ratelimit';
import { readCache, writeCache, cacheKey } from '../_lib/aicache';
import type { Env } from '../_lib/types';

type NormStatus = 'queued' | 'in_progress' | 'completed' | 'failed';
function normalizeStatus(s?: string): NormStatus {
  if (s === 'completed' || s === 'failed' || s === 'in_progress') return s;
  return 'queued';
}

interface StatusPayload {
  status: NormStatus;
  progress: number;
  url?: string;
}

export async function videoStatusHandler(request: Request, env: Env): Promise<Response> {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ error: '缺少 id' }, 400);

  // 独立命名空间限流：客户端 5s 轮询曾无任何限制；独立桶避免耗尽其他端点共享的 10/60s
  const rl = await checkRateLimit(clientIP(request), caches.default, {
    max: VIDEO_STATUS_RATE_LIMIT_MAX,
    windowSec: VIDEO_STATUS_RATE_LIMIT_WINDOW_SEC,
    namespace: '__rlvs',
  });
  if (!rl.allowed) {
    const res = json({ error: '查询太频繁，请稍后再试' }, 429);
    res.headers.set('Retry-After', String(rl.retryAfterSec));
    return res;
  }

  if (!env.AGNES_API_KEY) return json({ error: '服务未配置' }, 503);

  // completed 终态短缓存：完成后客户端的剩余轮询直接命中，不再打上游（非终态不缓存）
  const vsKey = cacheKey('__vs', encodeURIComponent(id));
  const hit = await readCache<StatusPayload>(caches.default, vsKey);
  if (hit?.status === 'completed') return json(hit, 200);

  const upstream = await fetch(`${AGNES_API_ROOT}/agnesapi?video_id=${encodeURIComponent(id)}`, {
    headers: agnesHeaders(env.AGNES_API_KEY),
  });
  if (!upstream.ok) {
    const { status, message } = normalizeAgnesError(upstream.status);
    return json({ error: message }, status);
  }
  const data = await upstream.json() as any;
  const status = normalizeStatus(data.status);
  // agnes 实测：completed 时视频 URL 在顶层 data.url（非文档所述的 metadata.url），保留 metadata.url 兜底
  const url = status === 'completed' ? (data?.url || data?.metadata?.url) : undefined;
  const payload: StatusPayload = { status, progress: typeof data.progress === 'number' ? data.progress : 0, url };
  if (status === 'completed' && url) {
    await writeCache(caches.default, vsKey, payload, VIDEO_STATUS_CACHE_TTL_SEC);
  }
  return json(payload, 200);
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
