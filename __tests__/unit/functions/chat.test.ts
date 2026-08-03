import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ChatRequest } from '../../../functions/_lib/types';

// 把全局 caches / fetch 替换成可控 mock
function makeCache() {
  const store = new Map<string, Response>();
  return {
    async match(req: Request) { const h = store.get(new URL(req.url).pathname); return h ? h.clone() : undefined; },
    async put(req: Request, res: Response) { store.set(new URL(req.url).pathname, res.clone()); },
  } as unknown as Cache;
}

let sharedCache: Cache;
async function callEndpoint(body: unknown, env: { AGNES_API_KEY: string }, fetchMock: typeof fetch) {
  const mod = await import('../../../functions/api/chat');
  globalThis.fetch = fetchMock as typeof fetch;
  if (!sharedCache) sharedCache = makeCache();
  globalThis.caches = { default: sharedCache } as unknown as typeof caches;
  const request = new Request('https://kloa.fans/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '1.1.1.1' },
    body: JSON.stringify(body),
  });
  return mod.onRequestPost({ request, env, waitUntil: async () => {}, params: {} } as any);
}

describe('chat endpoint', () => {
  beforeEach(() => { vi.resetModules(); sharedCache = undefined as any; });

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

  it('同一 IP 超过限流阈值返回 429', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('data: [DONE]\n\n', { status: 200 }));
    for (let i = 0; i < 10; i++) {
      await callEndpoint({ form: 'angel', message: 'hi', history: [] }, { AGNES_API_KEY: 'k' }, fetchMock);
    }
    const res = await callEndpoint({ form: 'angel', message: 'hi', history: [] }, { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(429);
  });
});
