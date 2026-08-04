import { describe, it, expect } from 'vitest';
import { ACTION_PROMPTS, buildVideoPrompt } from '../../../worker/_lib/prompts';
import { VIDEO_DURATION_PRESETS } from '../../../worker/_lib/config';

describe('video prompts', () => {
  it('ACTION_PROMPTS 含五个动作', () => {
    expect(Object.keys(ACTION_PROMPTS).length).toBeGreaterThanOrEqual(5);
  });
  it('buildVideoPrompt 拼装 action＋extra', () => {
    expect(buildVideoPrompt('微微笑', '夕阳光')).toContain('夕阳光');
    expect(buildVideoPrompt('微微笑', '夕阳光')).toContain('smiles');
  });
  it('帧数满足 8n+1', () => {
    for (const k of [3, 5] as const) {
      const n = VIDEO_DURATION_PRESETS[k].num_frames;
      expect((n - 1) % 8).toBe(0);
      expect(n).toBeLessThanOrEqual(441);
    }
  });
});
