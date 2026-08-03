import { describe, it, expect } from 'vitest';
import { normalizeAgnesError, agnesHeaders, agnesChatUrl } from '../../../worker/_lib/agnes';

describe('agnes', () => {
  it('401 归一为配置问题（不泄露 key）', () => {
    const r = normalizeAgnesError(401);
    expect(r.message).not.toContain('key');
    expect(r.status).toBe(502);
  });
  it('503 归一为繁忙', () => {
    expect(normalizeAgnesError(503).message).toContain('繁忙');
  });
  it('其他 5xx 归一为失败重试', () => {
    expect(normalizeAgnesError(500).status).toBe(502);
  });
  it('4xx 归一为 400', () => {
    expect(normalizeAgnesError(400).status).toBe(400);
  });
  it('headers 注入 Bearer', () => {
    const h = agnesHeaders('sk-abc') as Record<string, string>;
    expect(h.Authorization).toBe('Bearer sk-abc');
    expect(h['Content-Type']).toBe('application/json');
  });
  it('chat url 拼接到 chat/completions', () => {
    expect(agnesChatUrl()).toBe('https://api.agnes-ai.cn/v1/chat/completions');
  });
});
