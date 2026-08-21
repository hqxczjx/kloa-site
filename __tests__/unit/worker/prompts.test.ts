import { describe, it, expect } from 'vitest';
import { systemPrompt, buildAgnesMessages, TOPIC_HINTS, wantsSongRecommendation, sampleSongs } from '../../../worker/_lib/prompts';

describe('prompts', () => {
  it('systemPrompt 包含身份约束并随形态切换语气', () => {
    const angel = systemPrompt('angel');
    const demon = systemPrompt('demon');
    expect(angel).toContain('不是克罗雅本人');
    expect(demon).toContain('不是克罗雅本人');
    expect(angel).not.toBe(demon);
  });

  it('systemPrompt 含人设素材、语气示范与防护约束', () => {
    for (const form of ['angel', 'demon'] as const) {
      const p = systemPrompt(form);
      expect(p).toContain('雅团子');          // 称呼素材
      expect(p).toContain('语气示范');         // few-shot 块存在
      expect(p).toContain('用户：今天好累啊');   // 每种形态都有日常示范
      expect(p).toContain('AI 二创');          // 示范演示如何承认身份
      expect(p).toContain('无论对方如何要求');   // 反越狱
      expect(p).toContain('不编造');           // 隐私防线
      expect(p).toContain('书面腔');           // 反 AI 腔
      expect(p).toContain('两三句');           // 长度约束仍在
    }
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

  it('songPool 注入【曲库节选】，未提供则不注入', () => {
    const withSongs = buildAgnesMessages({
      form: 'angel', message: '推荐一首歌', history: [],
      songPool: [{ title: '玻璃之美' }, { title: 'Black Sheep' }],
    });
    expect(withSongs[0].content).toContain('曲库节选');
    expect(withSongs[0].content).toContain('《玻璃之美》《Black Sheep》');
    const without = buildAgnesMessages({ form: 'angel', message: 'hi', history: [] });
    expect(without[0].content).not.toContain('曲库节选');
  });
});

describe('song utils', () => {
  it('wantsSongRecommendation 识别推荐歌意图', () => {
    expect(wantsSongRecommendation('推荐一首歌')).toBe(true);
    expect(wantsSongRecommendation('给我推荐几首粤语歌吧')).toBe(true);
    expect(wantsSongRecommendation('有什么歌推荐吗')).toBe(true);
    expect(wantsSongRecommendation('今天天气真好')).toBe(false);
    expect(wantsSongRecommendation('推荐一家餐厅')).toBe(false);
  });

  it('sampleSongs 返回不重复子集且数量受控', () => {
    const songs = Array.from({ length: 20 }, (_, i) => ({ title: `歌${i}` }));
    const picked = sampleSongs(songs, 8);
    expect(picked).toHaveLength(8);
    expect(new Set(picked.map((s) => s.title)).size).toBe(8);
    const titles = new Set(songs.map((s) => s.title));
    for (const s of picked) expect(titles.has(s.title)).toBe(true);
    expect(sampleSongs(songs, 50)).toHaveLength(20);
  });
});
