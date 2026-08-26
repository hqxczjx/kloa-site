import { describe, it, expect } from 'vitest';
import { aiCacheKey, readCache, writeCache } from '../../../worker/_lib/aicache';

function makeCache() {
  const store = new Map<string, Response>();
  return {
    async match(r: Request) { const h = store.get(new URL(r.url).pathname); return h ? h.clone() : undefined; },
    async put(r: Request, res: Response) { store.set(new URL(r.url).pathname, res.clone()); },
  } as unknown as Cache;
}

describe('aiCache', () => {
  it('字段序不同 + 首尾空白 + undefined 字段（含嵌套）→ 同一缓存 key', async () => {
    const a = await aiCacheKey('image', {
      size: '1K', style: ' 水彩 ', ratio: '1:1', extra: undefined,
      extra_body: { response_format: 'url', image: ['https://kloa.fans/x.webp'] },
    });
    const b = await aiCacheKey('image', {
      extra_body: { image: ['https://kloa.fans/x.webp'], response_format: 'url' },
      ratio: '1:1', style: '水彩', size: '1K',
    });
    expect(a.url).toBe(b.url);
  });

  it('入参不同 → key 不同', async () => {
    const a = await aiCacheKey('image', { style: '水彩' });
    const b = await aiCacheKey('image', { style: '油画' });
    expect(a.url).not.toBe(b.url);
  });

  it('端点不同 → key 不同', async () => {
    const a = await aiCacheKey('image', { idea: '去海边' });
    const b = await aiCacheKey('storyboard', { idea: '去海边' });
    expect(a.url).not.toBe(b.url);
  });

  it('key 落在 __aicache/<endpoint>/<sha256-hex> 命名空间', async () => {
    const key = await aiCacheKey('image', { style: '水彩' });
    expect(new URL(key.url).pathname).toMatch(/^\/__aicache\/image\/[0-9a-f]{64}$/);
  });

  it('writeCache → readCache 往返一致', async () => {
    const cache = makeCache();
    const key = await aiCacheKey('image', { style: '水彩' });
    await writeCache(cache, key, { url: 'https://cdn/x.png' }, 86400);
    expect(await readCache<{ url: string }>(cache, key)).toEqual({ url: 'https://cdn/x.png' });
  });

  it('写入的响应带 public, max-age=<ttl> 缓存头', async () => {
    let stored: Response | undefined;
    const cache = {
      async match() { return undefined; },
      async put(_r: Request, res: Response) { stored = res.clone(); },
    } as unknown as Cache;
    const key = await aiCacheKey('image', { style: '水彩' });
    await writeCache(cache, key, { url: 'x' }, 86400);
    expect(stored?.headers.get('cache-control')).toBe('public, max-age=86400');
  });

  it('未命中返回 undefined', async () => {
    const cache = makeCache();
    const key = await aiCacheKey('image', { style: '水彩' });
    expect(await readCache(cache, key)).toBeUndefined();
  });

  it('writeCache 容错：put 抛错不 reject（dev 缓存不可写不阻塞主流程）', async () => {
    const boom = {
      async match() { return undefined; },
      async put() { throw new Error('cache readonly'); },
    } as unknown as Cache;
    const key = await aiCacheKey('image', { style: '水彩' });
    await expect(writeCache(boom, key, { url: 'x' }, 60)).resolves.toBeUndefined();
  });

  it('readCache 容错：条目损坏（非 JSON）按未命中处理', async () => {
    const cache = makeCache();
    const key = await aiCacheKey('image', { style: '水彩' });
    await cache.put(key, new Response('not-json', { headers: { 'content-type': 'application/json' } }));
    expect(await readCache(cache, key)).toBeUndefined();
  });
});
