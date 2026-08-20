import { describe, it, expect } from 'vitest';
import { readSrc } from './helpers';
describe('依赖优化：移除 framer-motion（省 ~116K JS）', () => {
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
