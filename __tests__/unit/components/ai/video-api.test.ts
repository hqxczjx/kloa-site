import { describe, it, expect, vi } from 'vitest';
import { createVideo, getVideoStatus, ACTIONS } from '../../../../src/components/react/ai/api';

describe('video api', () => {
  it('createVideo 返回 video_id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ video_id: 'v1' }), { status: 200 })));
    expect(await createVideo({ action: '微微笑', duration: 3 })).toBe('v1');
  });
  it('getVideoStatus 返回归一状态', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'completed', progress: 100, url: 'https://cdn/v.mp4' }), { status: 200 })));
    const r = await getVideoStatus('v1');
    expect(r.status).toBe('completed');
    expect(r.url).toBe('https://cdn/v.mp4');
  });
  it('createVideo 错误抛文案', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: '繁忙' }), { status: 503 })));
    await expect(createVideo({ action: '微微笑', duration: 3 })).rejects.toThrow('繁忙');
  });
  it('ACTIONS 列表 ≥5', () => { expect(ACTIONS.length).toBeGreaterThanOrEqual(5); });
});
