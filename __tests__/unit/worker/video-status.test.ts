import { describe, it, expect, vi, beforeEach } from 'vitest';

async function call(query: string, env: { AGNES_API_KEY: string }, fetchMock: typeof fetch) {
  const mod = await import('../../../worker/api/video-status');
  globalThis.fetch = fetchMock as typeof fetch;
  const request = new Request(`https://kloa.fans/api/video/status${query}`);
  return mod.videoStatusHandler(request, env);
}

describe('video status endpoint', () => {
  beforeEach(() => vi.resetModules());

  it('缺 id 返回 400', async () => {
    const res = await call('', { AGNES_API_KEY: 'k' }, vi.fn());
    expect(res.status).toBe(400);
  });

  it('命中 agnesapi（root，非 /v1）并归一 status', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ status: 'in_progress', progress: 42 }), { status: 200 }
    ));
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
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ status: 'completed', progress: 100, url: 'https://cdn/v.mp4' }), { status: 200 }
    ));
    const res = await call('?id=vid_2', { AGNES_API_KEY: 'k' }, fetchMock);
    expect((await res.json()).url).toBe('https://cdn/v.mp4');
  });

  it('completed 时顶层 url 缺失则回退 metadata.url', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ status: 'completed', progress: 100, metadata: { url: 'https://cdn/fallback.mp4' } }), { status: 200 }
    ));
    const res = await call('?id=vid_2b', { AGNES_API_KEY: 'k' }, fetchMock);
    expect((await res.json()).url).toBe('https://cdn/fallback.mp4');
  });

  it('未知 status 归一为 queued', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ status: 'weird', progress: 0 }), { status: 200 }
    ));
    const res = await call('?id=vid_3', { AGNES_API_KEY: 'k' }, fetchMock);
    expect((await res.json()).status).toBe('queued');
  });
});
