import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SEC } from './config';
import { cacheKey } from './aicache';

// 独立窗口/上限/命名空间（默认沿用全局 10/60s；video-status 等高频端点传自己的配置，
// 命名空间不隔离会导致高频轮询耗尽共享桶、连带封掉其他端点）
export interface RateLimitOptions {
  max?: number;
  windowSec?: number;
  namespace?: string;
}

export async function checkRateLimit(
  ip: string,
  cache: Cache,
  options: RateLimitOptions = {}
): Promise<{ allowed: boolean; remaining: number; retryAfterSec: number }> {
  const max = options.max ?? RATE_LIMIT_MAX;
  const windowSec = options.windowSec ?? RATE_LIMIT_WINDOW_SEC;
  const namespace = options.namespace ?? '__rl';
  const key = cacheKey(namespace, ip);
  const now = Math.floor(Date.now() / 1000);
  let count = 0;
  let resetAt = now + windowSec;

  const cached = await cache.match(key);
  if (cached) {
    try {
      const data = await cached.json<{ count: number; resetAt: number }>();
      if (data.resetAt > now) {
        count = data.count;
        resetAt = data.resetAt;
      }
    } catch { /* 损坏的缓存条目，按新窗口处理 */ }
  }

  count += 1;
  const allowed = count <= max;
  const remaining = Math.max(0, max - count);
  // 距窗口重置的剩余秒数：拒绝时随 429 以 Retry-After 头透出，客户端可据此退避
  const retryAfterSec = Math.max(0, resetAt - now);

  const res = new Response(JSON.stringify({ count, resetAt }), {
    headers: {
      'content-type': 'application/json',
      'cache-control': `max-age=${windowSec}`,
    },
  });
  try {
    await cache.put(key, res);
  } catch {
    // wrangler dev 下 caches.default 可能只读——写失败不阻塞限流判定（与 aicache 容错一致）
  }

  return { allowed, remaining, retryAfterSec };
}

export function clientIP(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  );
}
