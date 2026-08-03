import { describe, it, expect } from 'vitest';
import { systemPrompt, buildAgnesMessages, TOPIC_HINTS } from '../../../worker/_lib/prompts';

describe('prompts', () => {
  it('systemPrompt 包含身份约束并随形态切换语气', () => {
    const angel = systemPrompt('angel');
    const demon = systemPrompt('demon');
    expect(angel).toContain('不是克罗雅本人');
    expect(demon).toContain('不是克罗雅本人');
    expect(angel).not.toBe(demon);
  });

  it('buildAgnesMessages 以 system 开头，user 消息在末尾', () => {
    const msgs = buildAgnesMessages({
      form: 'angel', message: '你好', history: [{ role: 'user', content: '早' }, { role: 'assistant', content: '早呀' }],
    });
    expect(msgs[0].role).toBe('system');
    expect(msgs[msgs.length - 1]).toEqual({ role: 'user', content: '你好' });
  });

  it('topic 命中时把提示拼到 user 内容前', () => {
    const msgs = buildAgnesMessages({ form: 'angel', topic: '推荐一首歌', message: '详细点', history: [] });
    expect(msgs.at(-1)!.content).toContain('推荐一首歌');
    expect(msgs.at(-1)!.content).toContain('详细点');
  });

  it('未知 topic 不注入', () => {
    const msgs = buildAgnesMessages({ form: 'angel', topic: '乱七八糟', message: 'hi', history: [] });
    expect(msgs.at(-1)!.content).toBe('hi');
  });

  it('TOPIC_HINTS 含四个预设话题', () => {
    expect(Object.keys(TOPIC_HINTS).length).toBeGreaterThanOrEqual(4);
  });
});
