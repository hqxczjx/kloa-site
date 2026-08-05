import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '../../..');

function readSrc(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf-8');
}

describe('依赖优化：移除 framer-motion（省 ~116K JS）', () => {
  it('AnniversaryCard 不再 import framer-motion', () => {
    expect(readSrc('src/components/react/AnniversaryCard.tsx')).not.toContain('framer-motion');
  });

  it('AboutPage 不再 import framer-motion', () => {
    expect(readSrc('src/components/react/AboutPage.tsx')).not.toContain('framer-motion');
  });

  it('整个 src 目录不再引用 framer-motion', () => {
    const files = [
      'src/components/react/AnniversaryCard.tsx',
      'src/components/react/AboutPage.tsx',
      'src/components/react/SongList.tsx',
      'src/components/react/PersistentPlayer.tsx',
      'src/components/react/VirtualList.tsx',
    ];
    for (const f of files) {
      expect(readSrc(f)).not.toContain('framer-motion');
    }
  });

  it('package.json 不再声明 framer-motion 依赖', () => {
    const pkg = JSON.parse(readSrc('package.json'));
    const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    expect(allDeps).not.toHaveProperty('framer-motion');
  });
});

describe('依赖：使用稳定版（非 beta）', () => {
  it('astro 使用稳定版（非 beta）', () => {
    const pkg = JSON.parse(readSrc('package.json'));
    expect(pkg.dependencies.astro).not.toMatch(/-beta/);
  });

  it('@astrojs/react 使用稳定版（非 beta）', () => {
    const pkg = JSON.parse(readSrc('package.json'));
    expect(pkg.dependencies['@astrojs/react']).not.toMatch(/-beta/);
  });
});
