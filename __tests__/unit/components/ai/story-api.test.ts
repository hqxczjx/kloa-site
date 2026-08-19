import { describe, it, expect, vi } from 'vitest';
import { createStoryboard, createKeyframeVideo } from '../../../../src/components/react/ai/api';

describe('story api', () => {
  it('createStoryboard 返回 frames/motions', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ frames: ['f0', 'f1', 'f2', 'f3'], motions: ['m0', 'm1', 'm2'] }), { status: 200 }
    )));
    const sb = await createStoryboard('克罗雅追蝴蝶');
    expect(sb.frames).toHaveLength(4);
    expect(sb.motions).toHaveLength(3);
    const sent = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
    expect(sent).toEqual({ idea: '克罗雅追蝴蝶' });
  });

  it('createStoryboard 错误抛文案', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: '分镜生成失败，请重试' }), { status: 502 })));
    await expect(createStoryboard('x')).rejects.toThrow('分镜生成失败，请重试');
  });

  it('createKeyframeVideo 发送关键帧字段并返回 video_id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ video_id: 'v9' }), { status: 200 })));
    const id = await createKeyframeVideo({ prompt: 'walk', first_frame: 'https://a/1.png', last_frame: 'https://a/2.png', duration: 5 });
    expect(id).toBe('v9');
    const sent = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
    expect(sent).toEqual({ prompt: 'walk', first_frame: 'https://a/1.png', last_frame: 'https://a/2.png', duration: 5 });
  });

  it('createKeyframeVideo 错误抛文案', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: '关键帧 URL 有误' }), { status: 400 })));
    await expect(createKeyframeVideo({ prompt: 'x', first_frame: 'bad', last_frame: 'bad', duration: 5 })).rejects.toThrow('关键帧 URL 有误');
  });
});
