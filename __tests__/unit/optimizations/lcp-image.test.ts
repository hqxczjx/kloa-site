import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../../..');
const readSrc = (rel: string): string => readFileSync(join(ROOT, rel), 'utf-8');

describe('LCP 图片优先级', () => {
  it('角色立绘（LCP 元素）禁止懒加载并设为高优先级', () => {
    const hero = readSrc('src/components/astro/Hero.astro');
    expect(hero).toMatch(/loading="eager"/);
    expect(hero).toMatch(/fetchpriority="high"/i);
  });
});
