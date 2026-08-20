import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('页面Meta标签', () => {
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
