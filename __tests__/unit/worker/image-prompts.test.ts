import { describe, it, expect } from 'vitest';
import { STYLE_PROMPTS, buildImagePrompt } from '../../../worker/_lib/prompts';

describe('image prompts', () => {
  it('STYLE_PROMPTS 含五个风格', () => {
    expect(Object.keys(STYLE_PROMPTS).length).toBeGreaterThanOrEqual(5);
    expect(STYLE_PROMPTS['赛博朋克霓虹']).toBeTruthy();
  });

  it('buildImagePrompt 拼装 风格＋preserve，extra 在前', () => {
    const p = buildImagePrompt('水彩手绘', '加一点星空');
    expect(p).toContain('watercolor');
    expect(p).toContain('加一点星空');
    expect(p).toContain('preserve original composition');
  });

  it('无 extra 时只有风格＋preserve', () => {
    const p = buildImagePrompt('复古像素');
    expect(p).toContain('pixel');
    expect(p).toContain('preserve original composition');
  });

  it('未知风格回退为原值', () => {
    expect(buildImagePrompt('随便').toLowerCase()).toContain('随便');
  });
});
