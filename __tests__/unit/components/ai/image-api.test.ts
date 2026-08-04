import { describe, it, expect, vi } from 'vitest';
import { generateImage, STYLES } from '../../../../src/components/react/ai/api';

describe('generateImage', () => {
  it('成功返回 url', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ url: 'https://cdn/x.png' }), { status: 200 })));
    const url = await generateImage({ style: '水彩手绘', size: '1K', ratio: '1:1' });
    expect(url).toBe('https://cdn/x.png');
  });
  it('HTTP 错误抛带文案', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: '繁忙' }), { status: 503 })));
    await expect(generateImage({ style: '水彩手绘', size: '1K', ratio: '1:1' })).rejects.toThrow('繁忙');
  });
  it('STYLES 列表与后端 key 对齐', () => {
    expect(STYLES.length).toBeGreaterThanOrEqual(5);
  });
});
