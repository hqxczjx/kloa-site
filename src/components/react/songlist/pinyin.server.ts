import { pinyin } from 'pinyin-pro';

const PINYIN_OPTS = { toneType: 'none', type: 'array' } as const;

/**
 * 服务端专用：中文 → 无声调拼音字符串。
 * 仅被 .astro frontmatter import（构建期算好 titlePinyin/artistPinyin 注入），
 * 不进客户端 bundle，从而把 pinyin-pro 从浏览器包里移除。
 */
export function pinyinKey(text: string): string {
  return pinyin(text, PINYIN_OPTS).join('').toLowerCase();
}
