import { describe, it, expect } from 'vitest';
import { AGNES_BASE_URL, CHAT_MODEL, RATE_LIMIT_MAX, MAX_INPUT_CHARS } from '../../../worker/_lib/config';

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
});
