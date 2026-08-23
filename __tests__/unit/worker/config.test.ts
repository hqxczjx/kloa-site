import { describe, it, expect } from 'vitest';
import { AGNES_BASE_URL, CHAT_MODEL, RATE_LIMIT_MAX, MAX_INPUT_CHARS, DEFAULT_CHARACTER_IMAGE_URL, RATIO_FRAMES } from '../../../worker/_lib/config';

describe('config', () => {
  it('指向 agnes v1 base url', () => {
    expect(AGNES_BASE_URL).toBe('https://api.agnes-ai.cn/v1');
  });
  it('对话模型为 2.5-flash', () => {
    expect(CHAT_MODEL).toBe('agnes-2.5-flash');
  });
  it('限流与字数阈值为正数', () => {
    expect(RATE_LIMIT_MAX).toBeGreaterThan(0);
    expect(MAX_INPUT_CHARS).toBeGreaterThan(0);
  });
  it('生图基准立绘与前端预览共用 illustration.webp（防漂移回旧图）', () => {
    expect(DEFAULT_CHARACTER_IMAGE_URL).toBe('https://kloa.fans/images/illustration.webp');
  });
  it('比例参考图映射恰好五档：三档裁切＋全身 letterbox＋小剧场横版', () => {
    expect(Object.keys(RATIO_FRAMES)).toEqual(['1:1', '3:4', '9:16', '9:16-full', '16:9']);
    expect(RATIO_FRAMES['1:1']).toEqual({ image: 'https://kloa.fans/images/illustration-1x1.webp', apiRatio: '1:1' });
    expect(RATIO_FRAMES['3:4']).toEqual({ image: 'https://kloa.fans/images/illustration-3x4.webp', apiRatio: '3:4' });
    expect(RATIO_FRAMES['9:16']).toEqual({ image: 'https://kloa.fans/images/illustration-9x16.webp', apiRatio: '9:16' });
    // 全身档：letterbox 参考图，画布仍上送 API 最竖的 9:16
    expect(RATIO_FRAMES['9:16-full']).toEqual({ image: 'https://kloa.fans/images/illustration-9x16-full.webp', apiRatio: '9:16' });
    expect(RATIO_FRAMES['16:9']).toEqual({ image: 'https://kloa.fans/images/illustration.webp', apiRatio: '16:9' });
  });
});
