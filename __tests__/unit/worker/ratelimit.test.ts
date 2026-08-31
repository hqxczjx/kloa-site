import { describe, it, expect } from 'vitest';
import { checkRateLimit, clientIP } from '../../../worker/_lib/ratelimit';

// 内存版 Rate Limiting binding：按 key 计数，模拟 wrangler.jsonc 声明的 limit（binding 的 limit/period 固定于配置）
function makeLimiter(limit: number) {
  const counts = new Map<string, number>();
  const seen: string[] = [];
  return {
    seen,
    async limit({ key }: { key: string }) {
      seen.push(key);
      const n = (counts.get(key) ?? 0) + 1;
      counts.set(key, n);
      return { success: n <= limit };
    },
  } as unknown as RateLimit;
}

describe('ratelimit', () => {
  it('窗口内未超阈值时放行', async () => {
    const r = await checkRateLimit('1.2.3.4', makeLimiter(10));
    expect(r.allowed).toBe(true);
    expect(r.retryAfterSec).toBe(0);
  });

  it('超过阈值后拒绝，Retry-After 取整个窗口时长（binding 无重置时刻）', async () => {
    const limiter = makeLimiter(10);
    for (let i = 0; i < 10; i++) {
      expect((await checkRateLimit('5.6.7.8', limiter)).allowed).toBe(true);
    }
    const r = await checkRateLimit('5.6.7.8', limiter);
    expect(r.allowed).toBe(false);
    expect(r.retryAfterSec).toBe(60); // 默认 windowSec = RATE_LIMIT_WINDOW_SEC
  });

  it('自定义 windowSec 透传到拒绝时的 retryAfterSec', async () => {
    const limiter = makeLimiter(1);
    expect((await checkRateLimit('2.2.2.2', limiter, { windowSec: 60 })).allowed).toBe(true);
    const denied = await checkRateLimit('2.2.2.2', limiter, { windowSec: 60 });
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterSec).toBe(60);
  });

  it('不同 IP 互不影响（binding 按 key 独立计数）', async () => {
    const limiter = makeLimiter(1);
    await checkRateLimit('a', limiter);
    const r = await checkRateLimit('b', limiter);
    expect(r.allowed).toBe(true);
  });

  it('key = 命名空间:IP——共享默认命名空间、自定义命名空间独立分桶', async () => {
    const limiter = makeLimiter(1);
    await checkRateLimit('1.1.1.1', limiter);
    // 同 IP 默认命名空间（__rl）已耗尽
    expect((await checkRateLimit('1.1.1.1', limiter)).allowed).toBe(false);
    // 同 IP 自定义命名空间独立计数，不连带限流（沿用旧 __rlvs 轮询桶语义）
    expect((await checkRateLimit('1.1.1.1', limiter, { namespace: '__rlvs' })).allowed).toBe(true);
    expect(limiter.seen).toEqual(['__rl:1.1.1.1', '__rl:1.1.1.1', '__rlvs:1.1.1.1']);
  });

  it('单次 limit() 即判定——不再有旧实现的读-改-写两步', async () => {
    const limiter = makeLimiter(10);
    await checkRateLimit('3.3.3.3', limiter);
    expect(limiter.seen).toHaveLength(1);
  });

  it('limit() 抛错时容错放行（本地未配置 binding 不 500，与旧 cache.put 失败一致）', async () => {
    const boom = {
      async limit() { throw new Error('binding unavailable'); },
    } as unknown as RateLimit;
    const r = await checkRateLimit('4.4.4.4', boom);
    expect(r.allowed).toBe(true);
    expect(r.retryAfterSec).toBe(0);
  });

  it('clientIP 优先 CF-Connecting-IP', () => {
    const req = new Request('https://x/', { headers: { 'CF-Connecting-IP': '9.9.9.9' } });
    expect(clientIP(req)).toBe('9.9.9.9');
  });

  it('clientIP 缺失时回退 unknown', () => {
    const req = new Request('https://x/');
    expect(clientIP(req)).toBe('unknown');
  });
});
