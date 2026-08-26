import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SEC } from './config';

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
): Promise<{ allowed: boolean; remaining: number }> {
  const max = options.max ?? RATE_LIMIT_MAX;
  const windowSec = options.windowSec ?? RATE_LIMIT_WINDOW_SEC;
  const namespace = options.namespace ?? '__rl';
  const key = new Request(`https://kloa.fans/${namespace}/${ip}`);
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

  const res = new Response(JSON.stringify({ count, resetAt }), {
    headers: {
      'content-type': 'application/json',
      'cache-control': `max-age=${windowSec}`,
    },
  });
  await cache.put(key, res);

  return { allowed, remaining };
}

export function clientIP(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  );
}
