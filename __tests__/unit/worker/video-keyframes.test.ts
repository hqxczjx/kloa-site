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

const OK_UPSTREAM = () => Promise.resolve(new Response(
  JSON.stringify({ video_id: 'vid_kf', status: 'queued' }), { status: 200 }
));

const KF_REQ = {
  prompt: 'the character walks from the garden gate to the fountain',
  first_frame: 'https://cdn/k0.png',
  last_frame: 'https://cdn/k1.png',
  duration: 5,
};

describe('video create endpoint — keyframes 分支', () => {
  beforeEach(() => vi.resetModules());

  it('关键帧模式：extra_body.image 顺序为首尾，mode=keyframes，顶层无 image', async () => {
    const fetchMock = vi.fn().mockImplementation(OK_UPSTREAM);
    const res = await call(KF_REQ, { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(200);
    expect((await res.json()).video_id).toBe('vid_kf');
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.model).toBe('agnes-video-v2.0');
    expect(sent.extra_body).toEqual({ image: ['https://cdn/k0.png', 'https://cdn/k1.png'], mode: 'keyframes' });
    expect(sent.image).toBeUndefined();
    expect(sent.num_frames).toBe(121);
    expect(sent.frame_rate).toBe(24);
  });

  it('关键帧模式：duration 缺省映射 3s preset（81 帧）', async () => {
    const fetchMock = vi.fn().mockImplementation(OK_UPSTREAM);
    const res = await call({ ...KF_REQ, duration: undefined }, { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(200);
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.num_frames).toBe(81);
  });

  it('关键帧模式：prompt 缺失返回 400', async () => {
    const res = await call({ first_frame: 'https://a/1.png', last_frame: 'https://a/2.png' }, { AGNES_API_KEY: 'k' }, vi.fn());
    expect(res.status).toBe(400);
  });

  it('关键帧模式：first_frame 非法 URL 返回 400', async () => {
    const res = await call({ ...KF_REQ, first_frame: 'not-a-url' }, { AGNES_API_KEY: 'k' }, vi.fn());
    expect(res.status).toBe(400);
  });

  it('关键帧模式：只传一端帧返回 400', async () => {
    const res = await call({ prompt: 'x', first_frame: 'https://a/1.png' }, { AGNES_API_KEY: 'k' }, vi.fn());
    expect(res.status).toBe(400);
  });

  it('动作模式回归：仍走顶层 image 且不受影响', async () => {
    const fetchMock = vi.fn().mockImplementation(OK_UPSTREAM);
    const res = await call({ action: '微微笑', duration: 5 }, { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(200);
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.image).toContain('kloa.fans');
    expect(sent.extra_body).toBeUndefined();
  });
});
