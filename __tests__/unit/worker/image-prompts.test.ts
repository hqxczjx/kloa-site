import { describe, it, expect } from 'vitest';
import { STYLE_PROMPTS, RATIO_COMPOSITION_PROMPTS, buildImagePrompt } from '../../../worker/_lib/prompts';

describe('image prompts', () => {
  it('STYLE_PROMPTS 含五个风格', () => {
    expect(Object.keys(STYLE_PROMPTS).length).toBeGreaterThanOrEqual(5);
    expect(STYLE_PROMPTS['赛博朋克霓虹']).toBeTruthy();
  });

  it('buildImagePrompt 拼装 风格＋构图词＋preserve，extra 在前', () => {
    const p = buildImagePrompt('水彩手绘', '加一点星空', '3:4');
    expect(p).toContain('watercolor');
    expect(p).toContain('加一点星空');
    expect(p).toContain('waist-up portrait composition');
    expect(p).toContain('preserve original composition');
  });

  it('无 extra 时只有风格＋构图词＋preserve', () => {
    const p = buildImagePrompt('复古像素', undefined, '9:16');
    expect(p).toContain('pixel');
    expect(p).toContain('knee-up illustration composition');
    expect(p).toContain('preserve original composition');
  });

  it('未知风格回退为原值', () => {
    expect(buildImagePrompt('随便', undefined, '1:1').toLowerCase()).toContain('随便');
  });

  it('RATIO_COMPOSITION_PROMPTS 恰好覆盖五档比例（与 RATIO_FRAMES 一一对应）', () => {
    expect(Object.keys(RATIO_COMPOSITION_PROMPTS)).toEqual(['1:1', '3:4', '9:16', '9:16-full', '16:9']);
    expect(RATIO_COMPOSITION_PROMPTS['1:1']).toBe('upper-body portrait composition');
    expect(RATIO_COMPOSITION_PROMPTS['3:4']).toBe('waist-up portrait composition');
    expect(RATIO_COMPOSITION_PROMPTS['9:16']).toBe('knee-up illustration composition');
    expect(RATIO_COMPOSITION_PROMPTS['9:16-full']).toBe('full-body illustration composition, entire figure from head to feet');
    expect(RATIO_COMPOSITION_PROMPTS['16:9']).toBe('cinematic widescreen composition');
  });

  it('未知比例构图词回退 upper-body（与 1:1 参考图兜底一致）', () => {
    expect(buildImagePrompt('水彩手绘', undefined, '4:3')).toContain('upper-body portrait composition');
  });
});
