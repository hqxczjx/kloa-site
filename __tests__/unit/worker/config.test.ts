import { describe, it, expect } from 'vitest';
import { AGNES_BASE_URL, CHAT_MODEL, RATE_LIMIT_MAX, MAX_INPUT_CHARS, DEFAULT_CHARACTER_IMAGE_URL, RATIO_IMAGE_URLS } from '../../../worker/_lib/config';

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
  it('比例参考图映射恰好四档且 URL 与比例对应', () => {
    expect(Object.keys(RATIO_IMAGE_URLS)).toEqual(['1:1', '3:4', '9:16', '16:9']);
    expect(RATIO_IMAGE_URLS['1:1']).toBe('https://kloa.fans/images/illustration-1x1.webp');
    expect(RATIO_IMAGE_URLS['3:4']).toBe('https://kloa.fans/images/illustration-3x4.webp');
    expect(RATIO_IMAGE_URLS['9:16']).toBe('https://kloa.fans/images/illustration-9x16.webp');
    expect(RATIO_IMAGE_URLS['16:9']).toBe('https://kloa.fans/images/illustration.webp');
  });
});
