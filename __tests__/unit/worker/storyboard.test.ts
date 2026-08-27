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

function chatContent(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
}

const VALID = '{"frames":["f0","f1","f2","f3"],"motions":["m0","m1","m2"]}';

async function call(
  body: unknown,
  env: { AGNES_API_KEY: string },
  fetchMock: typeof fetch,
  method: 'GET' | 'POST' = 'POST',
) {
  const mod = await import('../../../worker/api/storyboard');
  globalThis.fetch = fetchMock as typeof fetch;
  globalThis.caches = { default: makeCache() } as unknown as typeof caches;
  const request = new Request('https://kloa.fans/api/storyboard', {
    method,
    headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '3.3.3.3' },
    ...(method === 'POST' ? { body: JSON.stringify(body) } : {}), // GET 带 body 会抛错
  });
  return mod.storyboardHandler(request, { ...env, RATE_LIMITER: allowAll });
}

describe('storyboard endpoint', () => {
  beforeEach(() => vi.resetModules());

  it('GET 请求返回 405', async () => {
    const res = await call(undefined, { AGNES_API_KEY: 'k' }, vi.fn(), 'GET');
    expect(res.status).toBe(405);
    expect((await res.json()).error).toBe('Method Not Allowed');
  });

  it('空 idea 返回 400', async () => {
    const res = await call({ idea: '  ' }, { AGNES_API_KEY: 'k' }, vi.fn());
    expect(res.status).toBe(400);
  });

  it('非字符串 idea 返回 400', async () => {
    const res = await call({ idea: 5 }, { AGNES_API_KEY: 'k' }, vi.fn());
    expect(res.status).toBe(400);
  });

  it('超长 idea 返回 400', async () => {
    const res = await call({ idea: '长'.repeat(201) }, { AGNES_API_KEY: 'k' }, vi.fn());
    expect(res.status).toBe(400);
  });

  it('无 key 返回 503', async () => {
    const res = await call({ idea: 'x' }, { AGNES_API_KEY: '' }, vi.fn());
    expect(res.status).toBe(503);
  });

  it('成功：非流式调用 chat 并返回解析后的分镜', async () => {
    const fetchMock = vi.fn().mockResolvedValue(chatContent(`\`\`\`json\n${VALID}\n\`\`\``));
    const res = await call({ idea: '克罗雅追蝴蝶' }, { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.frames).toHaveLength(4);
    expect(body.motions).toHaveLength(3);
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.stream).toBe(false);
    expect(sent.model).toBe('agnes-2.5-flash');
    expect(sent.messages[0].role).toBe('system');
    expect(sent.messages[1].content).toBe('克罗雅追蝴蝶');
  });

  it('上游输出数量不符返回 502', async () => {
    const fetchMock = vi.fn().mockResolvedValue(chatContent('{"frames":["a"],"motions":[]}'));
    const res = await call({ idea: 'x' }, { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(502);
  });

  it('上游 500 归一为 502', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 500 }));
    const res = await call({ idea: 'x' }, { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(502);
  });

  it('同 idea 第二次命中缓存秒回，不打上游', async () => {
    const mod = await import('../../../worker/api/storyboard');
    // happy-dom Response body 单次消费，多轮调用须每次返回新 Response
    const fetchMock = vi.fn().mockImplementation(async () => chatContent(VALID));
    globalThis.fetch = fetchMock as typeof fetch;
    const cache = makeCache();
    globalThis.caches = { default: cache } as unknown as typeof caches;
    const makeReq = () => new Request('https://kloa.fans/api/storyboard', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '3.3.3.3' },
      body: JSON.stringify({ idea: '克罗雅追蝴蝶' }),
    });
    const first = await mod.storyboardHandler(makeReq(), { AGNES_API_KEY: 'k', RATE_LIMITER: allowAll });
    const second = await mod.storyboardHandler(makeReq(), { AGNES_API_KEY: 'k', RATE_LIMITER: allowAll });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual({ frames: ['f0', 'f1', 'f2', 'f3'], motions: ['m0', 'm1', 'm2'] });
    expect(fetchMock).toHaveBeenCalledOnce(); // 第二次走缓存
  });
});
