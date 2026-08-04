import { describe, it, expect, vi, beforeEach } from 'vitest';

function makeCache() {
  const store = new Map<string, Response>();
  return {
    async match(r: Request) { const h = store.get(new URL(r.url).pathname); return h ? h.clone() : undefined; },
    async put(r: Request, res: Response) { store.set(new URL(r.url).pathname, res.clone()); },
  } as unknown as Cache;
}

async function call(body: unknown, env: { AGNES_API_KEY: string }, fetchMock: typeof fetch) {
  const mod = await import('../../../worker/api/video');
  globalThis.fetch = fetchMock as typeof fetch;
  globalThis.caches = { default: makeCache() } as unknown as typeof caches;
  const request = new Request('https://kloa.fans/api/video', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '3.3.3.3' },
    body: JSON.stringify(body),
  });
  return mod.createVideoHandler(request, env);
}

describe('video create endpoint', () => {
  beforeEach(() => vi.resetModules());

  it('缺 action 返回 400', async () => {
    const res = await call({ duration: 3 }, { AGNES_API_KEY: 'k' }, vi.fn());
    expect(res.status).toBe(400);
  });
  it('无 key 返回 503', async () => {
    const res = await call({ action: '微微笑', duration: 3 }, { AGNES_API_KEY: '' }, vi.fn());
    expect(res.status).toBe(503);
  });
  it('成功返回 video_id，image 在顶层，duration=5 映射 121 帧', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ video_id: 'vid_123', status: 'queued' }), { status: 200 }
    ));
    const res = await call({ action: '微微笑', duration: 5, extra: '夕阳' }, { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(200);
    expect((await res.json()).video_id).toBe('vid_123');
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.image).toContain('kloa.fans');
    expect(sent.num_frames).toBe(121);
    expect(sent.frame_rate).toBe(24);
    expect(sent.model).toBe('agnes-video-v2.0');
  });
  it('上游 503 归一', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 503 }));
    const res = await call({ action: '微微笑', duration: 3 }, { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(503);
  });
});
