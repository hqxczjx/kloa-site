import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_SEC } from './config';

export async function checkRateLimit(
  ip: string,
  cache: Cache
): Promise<{ allowed: boolean; remaining: number }> {
  const key = new Request(`https://kloa.fans/__rl/${ip}`);
  const now = Math.floor(Date.now() / 1000);
  let count = 0;
  let resetAt = now + RATE_LIMIT_WINDOW_SEC;

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
  const allowed = count <= RATE_LIMIT_MAX;
  const remaining = Math.max(0, RATE_LIMIT_MAX - count);

  const res = new Response(JSON.stringify({ count, resetAt }), {
    headers: {
      'content-type': 'application/json',
      'cache-control': `max-age=${RATE_LIMIT_WINDOW_SEC}`,
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
