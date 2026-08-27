import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRateLimit, clientIP } from '../../../worker/_lib/ratelimit';

// 构造一个内存版 Cache，模拟 caches.default
function makeCache() {
  const store = new Map<string, Response>();
  const cache = {
    async match(req: Request) {
      const hit = store.get(new URL(req.url).pathname);
      return hit ? hit.clone() : undefined;
    },
    async put(req: Request, res: Response) {
      store.set(new URL(req.url).pathname, res.clone());
    },
  } as unknown as Cache;
  return cache;
}

describe('ratelimit', () => {
  beforeEach(() => vi.useFakeTimers());

  it('窗口内未超阈值时放行，并递减剩余', async () => {
    const cache = makeCache();
    const r = await checkRateLimit('1.2.3.4', cache);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(9);
  });

  it('超过阈值后拒绝', async () => {
    const cache = makeCache();
    for (let i = 0; i < 10; i++) {
      await checkRateLimit('5.6.7.8', cache);
    }
    const r = await checkRateLimit('5.6.7.8', cache);
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
  });

  it('不同 IP 互不影响', async () => {
    const cache = makeCache();
    await checkRateLimit('a', cache);
    const r = await checkRateLimit('b', cache);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(9);
  });

  it('clientIP 优先 CF-Connecting-IP', () => {
    const req = new Request('https://x/', { headers: { 'CF-Connecting-IP': '9.9.9.9' } });
    expect(clientIP(req)).toBe('9.9.9.9');
  });

  it('自定义上限/命名空间独立生效，不影响默认桶', async () => {
    const cache = makeCache();
    const opt = { max: 2, windowSec: 60, namespace: '__rlvs' };
    expect((await checkRateLimit('1.1.1.1', cache, opt)).allowed).toBe(true);
    expect((await checkRateLimit('1.1.1.1', cache, opt)).allowed).toBe(true);
    expect((await checkRateLimit('1.1.1.1', cache, opt)).allowed).toBe(false);
    // 同 IP 默认命名空间仍从 0 计数（隔离，不连带限流）
    expect((await checkRateLimit('1.1.1.1', cache)).remaining).toBe(9);
  });

  it('拒绝时 retryAfterSec = 距窗口重置的剩余秒数（供 429 Retry-After 头）', async () => {
    vi.setSystemTime(1_700_000_000_000);
    const cache = makeCache();
    const opt = { max: 1, windowSec: 60 };
    expect((await checkRateLimit('2.2.2.2', cache, opt)).allowed).toBe(true);
    const denied = await checkRateLimit('2.2.2.2', cache, opt);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterSec).toBe(60);
  });

  it('cache.put 抛错时容错：不 reject、仍返回计数（dev 只读缓存不 500）', async () => {
    const boom = {
      async match() { return undefined; },
      async put() { throw new Error('cache readonly'); },
    } as unknown as Cache;
    const r = await checkRateLimit('3.3.3.3', boom);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(9);
  });

  it('clientIP 缺失时回退 unknown', () => {
    const req = new Request('https://x/');
    expect(clientIP(req)).toBe('unknown');
  });
});
