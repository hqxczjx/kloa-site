import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('页面Meta标签', () => {
  it('index.astro应该存在', () => {
    const indexPath = join(__dirname, '../../../src/pages/index.astro');
    const content = readFileSync(indexPath, 'utf-8');
    expect(content).toContain('BaseLayout');
  });

  it('music.astro应该存在', () => {
    const musicPath = join(__dirname, '../../../src/pages/music.astro');
    const content = readFileSync(musicPath, 'utf-8');
    expect(content).toContain('BaseLayout');
  });

  it('about.astro应该存在', () => {
    const aboutPath = join(__dirname, '../../../src/pages/about.astro');
    const content = readFileSync(aboutPath, 'utf-8');
    expect(content).toContain('BaseLayout');
  });

  it('所有页面应该有description meta', () => {
    const layoutContent = readFileSync(join(__dirname, '../../../src/layouts/BaseLayout.astro'), 'utf-8');
    expect(layoutContent).toContain('name="description"');
  });

  it('所有页面应该有viewport meta', () => {
    const layoutContent = readFileSync(join(__dirname, '../../../src/layouts/BaseLayout.astro'), 'utf-8');
    expect(layoutContent).toContain('name="viewport"');
  });

  it('所有页面应该有lang="zh-CN"', () => {
    const layoutContent = readFileSync(join(__dirname, '../../../src/layouts/BaseLayout.astro'), 'utf-8');
    expect(layoutContent).toContain('lang="zh-CN"');
  });
});
