import { describe, it, expect } from 'vitest';
import { buildStoryboardMessages, parseStoryboard } from '../../../worker/_lib/prompts';

describe('storyboard prompts', () => {
  it('buildStoryboardMessages：system 说明帧数/动作数，user 为创意', () => {
    const msgs = buildStoryboardMessages('克罗雅追蝴蝶', 3);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content).toContain('exactly 4');
    expect(msgs[0].content).toContain('exactly 3');
    expect(msgs[1]).toEqual({ role: 'user', content: '克罗雅追蝴蝶' });
  });

  it('parseStoryboard：正常 JSON', () => {
    const ok = parseStoryboard('{"frames":["a","b","c","d"],"motions":["m1","m2","m3"]}', 3);
    expect(ok).toEqual({ frames: ['a', 'b', 'c', 'd'], motions: ['m1', 'm2', 'm3'] });
  });

  it('parseStoryboard：容忍 markdown 围栏与前后噪声', () => {
    const noisy = '好的，如下：\n```json\n{"frames":["a","b","c","d"],"motions":["m1","m2","m3"]}\n```\n希望有帮助';
    expect(parseStoryboard(noisy, 3)).not.toBeNull();
  });

  it('parseStoryboard：数量不符返回 null', () => {
    expect(parseStoryboard('{"frames":["a","b"],"motions":["m1"]}', 3)).toBeNull();
  });

  it('parseStoryboard：非 JSON / 空串 / 空白项返回 null', () => {
    expect(parseStoryboard('直接聊天不输出 JSON', 3)).toBeNull();
    expect(parseStoryboard('', 3)).toBeNull();
    expect(parseStoryboard('{"frames":["a","","c","d"],"motions":["m1","m2","m3"]}', 3)).toBeNull();
  });
});
