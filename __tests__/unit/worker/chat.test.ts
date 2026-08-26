import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChatRequest } from '../../../worker/_lib/types';
import songs from '../../../src/data/songs.json';

// 把全局 caches / fetch 替换成可控 mock
function makeCache() {
  const store = new Map<string, Response>();
  return {
    async match(req: Request) { const h = store.get(new URL(req.url).pathname); return h ? h.clone() : undefined; },
    async put(req: Request, res: Response) { store.set(new URL(req.url).pathname, res.clone()); },
  } as unknown as Cache;
}

let sharedCache: Cache;
async function callEndpoint(
  body: unknown,
  env: { AGNES_API_KEY: string },
  fetchMock: typeof fetch,
  method: 'GET' | 'POST' = 'POST',
) {
  const mod = await import('../../../worker/api/chat');
  globalThis.fetch = fetchMock as typeof fetch;
  if (!sharedCache) sharedCache = makeCache();
  globalThis.caches = { default: sharedCache } as unknown as typeof caches;
  const request = new Request('https://kloa.fans/api/chat', {
    method,
    headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '1.1.1.1' },
    ...(method === 'POST' ? { body: JSON.stringify(body) } : {}), // GET 带 body 会抛错
  });
  return mod.chatHandler(request, env);
}

describe('chat endpoint', () => {
  beforeEach(() => { vi.resetModules(); sharedCache = undefined as any; });

  it('GET 请求返回 405', async () => {
    const res = await callEndpoint(undefined, { AGNES_API_KEY: 'k' }, vi.fn(), 'GET');
    expect(res.status).toBe(405);
    expect((await res.json()).error).toBe('Method Not Allowed');
  });

  it('缺 message 返回 400', async () => {
    const res = await callEndpoint({ form: 'angel', history: [] }, { AGNES_API_KEY: 'k' }, vi.fn());
    expect(res.status).toBe(400);
  });

  it('超长输入返回 400', async () => {
    const res = await callEndpoint({ form: 'angel', message: '字'.repeat(101), history: [] }, { AGNES_API_KEY: 'k' }, vi.fn());
    expect(res.status).toBe(400);
  });

  it('无 key 返回 503', async () => {
    const res = await callEndpoint({ form: 'angel', message: 'hi', history: [] }, { AGNES_API_KEY: '' }, vi.fn());
    expect(res.status).toBe(503);
  });

  it('上游成功时透传 SSE 流（content-type=text/event-stream）', async () => {
    const upstreamBody = 'data: {"choices":[{"delta":{"content":"你"}}]}\n\ndata: [DONE]\n\n';
    const fetchMock = vi.fn().mockResolvedValue(new Response(upstreamBody, { status: 200 }));
    const res = await callEndpoint({ form: 'angel', message: 'hi', history: [] } satisfies ChatRequest, { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    expect(await res.text()).toContain('你');
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('上游 503 归一为 503 + 友好文案', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 503 }));
    const res = await callEndpoint({ form: 'demon', message: 'hi', history: [] } satisfies ChatRequest, { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(503);
    expect((await res.json()).error).toContain('繁忙');
  });

  it('上游请求体带 temperature 且 system 含人设素材', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('data: [DONE]\n\n', { status: 200 }));
    await callEndpoint({ form: 'angel', message: 'hi', history: [] } satisfies ChatRequest, { AGNES_API_KEY: 'k' }, fetchMock);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(init.body)) as { temperature?: number; messages?: { content?: string }[] };
    expect(body.temperature).toBe(0.8);
    expect(body.messages?.[0]?.content).toContain('雅团子');
  });

  it('消息命中推荐歌意图时注入曲库节选（真实曲库中的歌）', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('data: [DONE]\n\n', { status: 200 }));
    await callEndpoint({ form: 'angel', message: '推荐一首歌', history: [] } satisfies ChatRequest, { AGNES_API_KEY: 'k' }, fetchMock);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(init.body)) as { messages?: { content?: string }[] };
    const sys = body.messages?.[0]?.content ?? '';
    expect(sys).toContain('曲库节选');
    expect(songs.some((s) => sys.includes(s.title))).toBe(true);
  });

  it('普通消息不注入曲库节选', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('data: [DONE]\n\n', { status: 200 }));
    await callEndpoint({ form: 'angel', message: '今天天气怎么样', history: [] } satisfies ChatRequest, { AGNES_API_KEY: 'k' }, fetchMock);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(String(init.body)) as { messages?: { content?: string }[] };
    expect(body.messages?.[0]?.content ?? '').not.toContain('曲库节选');
  });

  it('同一 IP 超过限流阈值返回 429', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('data: [DONE]\n\n', { status: 200 }));
    for (let i = 0; i < 10; i++) {
      await callEndpoint({ form: 'angel', message: 'hi', history: [] }, { AGNES_API_KEY: 'k' }, fetchMock);
    }
    const res = await callEndpoint({ form: 'angel', message: 'hi', history: [] }, { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(429);
  });

  it('body 超过 64KB 上限返回 413', async () => {
    const res = await callEndpoint(
      { form: 'angel', message: 'x'.repeat(70 * 1024), history: [] },
      { AGNES_API_KEY: 'k' },
      vi.fn()
    );
    expect(res.status).toBe(413);
  });

  it('非 JSON Content-Type 返回 415', async () => {
    const mod = await import('../../../worker/api/chat');
    globalThis.fetch = vi.fn() as unknown as typeof fetch;
    globalThis.caches = { default: makeCache() } as unknown as typeof caches;
    const request = new Request('https://kloa.fans/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'text/plain', 'CF-Connecting-IP': '1.1.1.1' },
      body: 'hello',
    });
    const res = await mod.chatHandler(request, { AGNES_API_KEY: 'k' });
    expect(res.status).toBe(415);
  });
});
