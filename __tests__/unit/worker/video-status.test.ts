import { describe, it, expect, vi, beforeEach } from 'vitest';

function makeCache() {
  const store = new Map<string, Response>();
  return {
    async match(r: Request) { const h = store.get(new URL(r.url).pathname); return h ? h.clone() : undefined; },
    async put(r: Request, res: Response) { store.set(new URL(r.url).pathname, res.clone()); },
  } as unknown as Cache;
}

// 内存版 Rate Limiting binding：按 key 计数（limit 对齐 wrangler.jsonc 的 RATE_LIMITER_STATUS 60/60s）
function makeLimiter(limit: number) {
  const counts = new Map<string, number>();
  return {
    async limit({ key }: { key: string }) {
      const n = (counts.get(key) ?? 0) + 1;
      counts.set(key, n);
      return { success: n <= limit };
    },
  } as unknown as RateLimit;
}

const allowAll = { limit: async () => ({ success: true }) } as unknown as RateLimit;

async function call(
  query: string,
  env: { AGNES_API_KEY: string },
  fetchMock: typeof fetch,
  cache?: Cache,
  limiter: RateLimit = allowAll,
) {
  const mod = await import('../../../worker/api/video-status');
  globalThis.fetch = fetchMock as typeof fetch;
  globalThis.caches = { default: cache ?? makeCache() } as unknown as typeof caches;
  const request = new Request(`https://kloa.fans/api/video/status${query}`);
  return mod.videoStatusHandler(request, { ...env, RATE_LIMITER_STATUS: limiter });
}

function statusResponse(body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

describe('video status endpoint', () => {
  beforeEach(() => vi.resetModules());

  it('缺 id 返回 400', async () => {
    const res = await call('', { AGNES_API_KEY: 'k' }, vi.fn());
    expect(res.status).toBe(400);
  });

  it('命中 agnesapi（root，非 /v1）并归一 status', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      statusResponse({ status: 'in_progress', progress: 42 })
    );
    const res = await call('?id=vid_1', { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('in_progress');
    expect(body.progress).toBe(42);
    const calledUrl = (fetchMock.mock.calls[0][0] as string);
    expect(calledUrl).toContain('/agnesapi?video_id=vid_1');
    expect(calledUrl).not.toContain('/v1/agnesapi');
  });

  it('completed 时返顶层 url（agnes 实测结构）', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      statusResponse({ status: 'completed', progress: 100, url: 'https://cdn/v.mp4' })
    );
    const res = await call('?id=vid_2', { AGNES_API_KEY: 'k' }, fetchMock);
    expect((await res.json()).url).toBe('https://cdn/v.mp4');
  });

  it('completed 时顶层 url 缺失则回退 metadata.url', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      statusResponse({ status: 'completed', progress: 100, metadata: { url: 'https://cdn/fallback.mp4' } })
    );
    const res = await call('?id=vid_2b', { AGNES_API_KEY: 'k' }, fetchMock);
    expect((await res.json()).url).toBe('https://cdn/fallback.mp4');
  });

  it('未知 status 归一为 queued', async () => {
    const fetchMock = vi.fn().mockResolvedValue(statusResponse({ status: 'weird', progress: 0 }));
    const res = await call('?id=vid_3', { AGNES_API_KEY: 'k' }, fetchMock);
    expect((await res.json()).status).toBe('queued');
  });

  it('上游非 200(500)归一为 502 + 生成失败文案', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 500 }));
    const res = await call('?id=vid_4', { AGNES_API_KEY: 'k' }, fetchMock);
    // normalizeAgnesError:非 401/503 的 status>=500 → { 502, '生成失败，请重试' }
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBe('生成失败，请重试');
  });

  it('独立限流：60 次/60s 内放行，第 61 次返回 429 且不打上游', async () => {
    const cache = makeCache();
    const limiter = makeLimiter(60);
    // happy-dom Response body 单次消费，多轮调用须每次返回新 Response
    const fetchMock = vi.fn().mockImplementation(async () => statusResponse({ status: 'queued', progress: 0 }));
    for (let i = 0; i < 60; i++) {
      const res = await call('?id=rl_1', { AGNES_API_KEY: 'k' }, fetchMock, cache, limiter);
      expect(res.status).toBe(200);
    }
    const res = await call('?id=rl_1', { AGNES_API_KEY: 'k' }, fetchMock, cache, limiter);
    expect(res.status).toBe(429);
    expect((await res.json()).error).toContain('频繁');
    // Retry-After 精确等于 binding 窗口周期（VIDEO_STATUS_RATE_LIMIT_WINDOW_SEC = 60，无取整/放大）
    expect(res.headers.get('Retry-After')).toBe('60');
    expect(fetchMock).toHaveBeenCalledTimes(60);
  });

  it('completed 结果缓存 60s：第二次查询直接命中，不打上游', async () => {
    const cache = makeCache();
    const fetchMock = vi.fn().mockImplementation(async () =>
      statusResponse({ status: 'completed', progress: 100, url: 'https://cdn/c.mp4' })
    );
    const first = await call('?id=cc_1', { AGNES_API_KEY: 'k' }, fetchMock, cache);
    const second = await call('?id=cc_1', { AGNES_API_KEY: 'k' }, fetchMock, cache);
    expect(first.status).toBe(200);
    expect((await second.json()).url).toBe('https://cdn/c.mp4');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('非终态（in_progress）不缓存：每次查询都打上游', async () => {
    const cache = makeCache();
    const fetchMock = vi.fn().mockImplementation(async () =>
      statusResponse({ status: 'in_progress', progress: 40 })
    );
    await call('?id=ip_1', { AGNES_API_KEY: 'k' }, fetchMock, cache);
    await call('?id=ip_1', { AGNES_API_KEY: 'k' }, fetchMock, cache);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
