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

async function call(body: unknown, env: { AGNES_API_KEY: string }, fetchMock: typeof fetch) {
  const mod = await import('../../../worker/api/video');
  globalThis.fetch = fetchMock as typeof fetch;
  globalThis.caches = { default: makeCache() } as unknown as typeof caches;
  const request = new Request('https://kloa.fans/api/video', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '3.3.3.3' },
    body: JSON.stringify(body),
  });
  return mod.createVideoHandler(request, { ...env, RATE_LIMITER: allowAll });
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

  it('关键帧模式：非字符串 prompt 返回 400', async () => {
    const res = await call({ prompt: 5, first_frame: 'https://a/1.png', last_frame: 'https://a/2.png' }, { AGNES_API_KEY: 'k' }, vi.fn());
    expect(res.status).toBe(400);
  });

  it('body 为 null 返回 400', async () => {
    const res = await call(null, { AGNES_API_KEY: 'k' }, vi.fn());
    expect(res.status).toBe(400);
  });

  it('关键帧模式：javascript: 协议 URL 返回 400（协议白名单）', async () => {
    const res = await call({ ...KF_REQ, first_frame: 'javascript:alert(1)' }, { AGNES_API_KEY: 'k' }, vi.fn());
    expect(res.status).toBe(400);
  });

  it('关键帧模式：LLM 长度 motion（实测约 190-230 字符）通过——上限 500', async () => {
    // 回归：上限曾为 200，真实 storyboard 输出 226 字符的 motion 被自家网关拒掉（3 段废 2 段）
    const fetchMock = vi.fn().mockImplementation(OK_UPSTREAM);
    const realLenMotion = 'Camera tracks low and forward through the garden path following Kloa as she runs between flower beds, arms pumping, hair and dress flowing in wind, dress hem catching light, she leaps gracefully over a low stone border with petals scattering around her, landing softly and continuing forward with joyful determined expression.'.slice(0, 226);
    const res = await call({ ...KF_REQ, prompt: realLenMotion }, { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(200);
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.prompt).toBe(realLenMotion);
  });

  it('关键帧模式：prompt 超过 500 字符返回 400（动作描述过长）', async () => {
    const res = await call({ ...KF_REQ, prompt: 'a'.repeat(501) }, { AGNES_API_KEY: 'k' }, vi.fn());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('动作描述过长');
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
