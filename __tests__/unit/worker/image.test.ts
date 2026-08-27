import { describe, it, expect, vi, beforeEach } from 'vitest';

function makeCache() {
  const store = new Map<string, Response>();
  return {
    async match(r: Request) { const h = store.get(new URL(r.url).pathname); return h ? h.clone() : undefined; },
    async put(r: Request, res: Response) { store.set(new URL(r.url).pathname, res.clone()); },
  } as unknown as Cache;
}

// 恒放行的 Rate Limiting binding mock（限流行为由 ratelimit.test.ts / chat / video-status 覆盖）
const allowAll = { limit: async () => ({ success: true }) } as unknown as RateLimit;

async function call(body: unknown, env: { AGNES_API_KEY: string; AGNES_CHARACTER_URL?: string }, fetchMock: typeof fetch) {
  const mod = await import('../../../worker/api/image');
  globalThis.fetch = fetchMock as typeof fetch;
  globalThis.caches = { default: makeCache() } as unknown as typeof caches;
  return mod.imageHandler(
    new Request('https://kloa.fans/api/image', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '2.2.2.2' },
      body: JSON.stringify(body),
    }),
    { ...env, RATE_LIMITER: allowAll }
  );
}

describe('image endpoint', () => {
  beforeEach(() => vi.resetModules());

  it('缺 style 返回 400', async () => {
    const res = await call({ size: '1K', ratio: '1:1' }, { AGNES_API_KEY: 'k' }, vi.fn());
    expect(res.status).toBe(400);
  });

  it('extra 超长返回 400', async () => {
    const res = await call({ style: '水彩手绘', extra: '字'.repeat(51), size: '1K' }, { AGNES_API_KEY: 'k' }, vi.fn());
    expect(res.status).toBe(400);
  });

  it('无 key 返回 503', async () => {
    const res = await call({ style: '水彩手绘', size: '1K' }, { AGNES_API_KEY: '' }, vi.fn());
    expect(res.status).toBe(503);
  });

  it('上游成功返回 data[0].url', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ data: [{ url: 'https://cdn/x.png' }] }), { status: 200 }
    ));
    const res = await call({ style: '水彩手绘', size: '2K', ratio: '3:4' }, { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(200);
    expect((await res.json()).url).toBe('https://cdn/x.png');
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.extra_body.image).toBeInstanceOf(Array);
    expect(sent.extra_body.response_format).toBe('url');
    expect(sent.model).toBe('agnes-image-2.1-flash');
  });

  it('上游 503 归一为 503', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 503 }));
    const res = await call({ style: '水彩手绘', size: '1K' }, { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(503);
  });

  it('ratio 选中对应裁切参考图', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ data: [{ url: 'https://cdn/x.png' }] }), { status: 200 }
    ));
    const res = await call({ style: '水彩手绘', size: '1K', ratio: '9:16' }, { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(200);
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.extra_body.image).toEqual(['https://kloa.fans/images/illustration-9x16.webp']);
    expect(sent.prompt).toContain('knee-up illustration composition');
  });

  it('9:16 全身档选 letterbox 参考图且画布上送仍为 9:16', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ data: [{ url: 'https://cdn/x.png' }] }), { status: 200 }
    ));
    const res = await call({ style: '水彩手绘', size: '1K', ratio: '9:16-full' }, { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(200);
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.extra_body.image).toEqual(['https://kloa.fans/images/illustration-9x16-full.webp']);
    expect(sent.ratio).toBe('9:16');
    expect(sent.prompt).toContain('full-body illustration composition');
  });

  it('AGNES_CHARACTER_URL 覆盖所有比例的选图（本地联调后门）', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ data: [{ url: 'https://cdn/x.png' }] }), { status: 200 }
    ));
    const res = await call(
      { style: '水彩手绘', size: '1K', ratio: '3:4' },
      { AGNES_API_KEY: 'k', AGNES_CHARACTER_URL: 'https://example.com/tmp.png' },
      fetchMock
    );
    expect(res.status).toBe(200);
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.extra_body.image).toEqual(['https://example.com/tmp.png']);
  });

  it('非法 ratio 回退 1:1 参考图', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ data: [{ url: 'https://cdn/x.png' }] }), { status: 200 }
    ));
    const res = await call({ style: '水彩手绘', size: '1K', ratio: '4:3' }, { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(200);
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.extra_body.image).toEqual(['https://kloa.fans/images/illustration-1x1.webp']);
  });

  it('16:9 保留原全身立绘（小剧场关键帧链路）', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ data: [{ url: 'https://cdn/x.png' }] }), { status: 200 }
    ));
    const res = await call({ style: '水彩手绘', size: '1K', ratio: '16:9' }, { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(200);
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.extra_body.image).toEqual(['https://kloa.fans/images/illustration.webp']);
    expect(sent.prompt).toContain('cinematic widescreen composition');
  });

  it('空串 AGNES_CHARACTER_URL 穿透查表（环境变量语义）', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ data: [{ url: 'https://cdn/x.png' }] }), { status: 200 }
    ));
    const res = await call(
      { style: '水彩手绘', size: '1K', ratio: '3:4' },
      { AGNES_API_KEY: 'k', AGNES_CHARACTER_URL: '' },
      fetchMock
    );
    expect(res.status).toBe(200);
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.extra_body.image).toEqual(['https://kloa.fans/images/illustration-3x4.webp']);
  });

  it('同入参第二次命中缓存秒回，不打上游', async () => {
    const mod = await import('../../../worker/api/image');
    // happy-dom Response body 单次消费，多轮调用须每次返回新 Response
    const fetchMock = vi.fn().mockImplementation(async () => new Response(
      JSON.stringify({ data: [{ url: 'https://cdn/x.png' }] }), { status: 200 }
    ));
    globalThis.fetch = fetchMock as typeof fetch;
    const cache = makeCache();
    globalThis.caches = { default: cache } as unknown as typeof caches;
    const makeReq = () => new Request('https://kloa.fans/api/image', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '2.2.2.2' },
      body: JSON.stringify({ style: '水彩手绘', size: '1K', ratio: '1:1' }),
    });
    const first = await mod.imageHandler(makeReq(), { AGNES_API_KEY: 'k', RATE_LIMITER: allowAll });
    const second = await mod.imageHandler(makeReq(), { AGNES_API_KEY: 'k', RATE_LIMITER: allowAll });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((await second.json()).url).toBe('https://cdn/x.png');
    expect(fetchMock).toHaveBeenCalledOnce(); // 第二次走缓存
  });

  it('上游失败不写缓存：下次仍打上游', async () => {
    const mod = await import('../../../worker/api/image');
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ data: [{ url: 'https://cdn/x.png' }] }), { status: 200 }
      ));
    globalThis.fetch = fetchMock as typeof fetch;
    const cache = makeCache();
    globalThis.caches = { default: cache } as unknown as typeof caches;
    const makeReq = () => new Request('https://kloa.fans/api/image', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '2.2.2.2' },
      body: JSON.stringify({ style: '水彩手绘', size: '1K' }),
    });
    const first = await mod.imageHandler(makeReq(), { AGNES_API_KEY: 'k', RATE_LIMITER: allowAll });
    const second = await mod.imageHandler(makeReq(), { AGNES_API_KEY: 'k', RATE_LIMITER: allowAll });
    expect(first.status).toBe(503);
    expect(second.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2); // 失败未缓存，重试真打上游
  });
});
