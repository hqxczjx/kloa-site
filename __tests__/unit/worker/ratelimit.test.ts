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

  it('clientIP 缺失时回退 unknown', () => {
    const req = new Request('https://x/');
    expect(clientIP(req)).toBe('unknown');
  });
});
