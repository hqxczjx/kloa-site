# TESTING.md - kloa-site 测试指南

## 1. 概览

### 1.1 测试目标
- 代码覆盖率目标：90%以上
- 所有测试必须通过
- CI/CD集成测试
- 使用中文编写测试描述

### 1.2 测试类型
- **单元测试**: 组件级别的测试
- **E2E测试**: 端到端用户流程测试
- **Astro测试**: Astro组件和页面测试（待完善）

### 1.3 当前测试状态
- 单元测试：170+ 个测试用例
- E2E测试：80+ 个测试用例
- 覆盖率：部分组件达到90%+

## 2. 测试工具栈

### 2.1 核心工具
- **Vitest v4.0.18**: 单元测试框架
- **Playwright v1.58.1**: E2E测试框架
- **Testing Library**: React组件渲染和查询
  - @testing-library/react v16.3.2
  - @testing-library/jest-dom v6.9.1
  - @testing-library/user-event v14.6.1

### 2.2 辅助工具
- **jsdom v28.0.0**: 浏览器环境模拟
- **happy-dom v20.5.0**: 轻量级DOM模拟（可选）
- **@vitest/coverage-v8**: 代码覆盖率报告

### 2.3 React相关
- **React 19.2.4**: UI库
- **@vitejs/plugin-react**: Vitest React支持

## 3. 运行测试

### 3.1 单元测试
```bash
# 运行所有单元测试（watch模式）
bun test

# 运行一次
bun test:run

# 运行单个测试文件
bun test ComponentName.test.tsx

# 运行特定测试（通过名称匹配）
bun test -t "应该渲染"

# 带UI运行
bun test:ui

# 生成覆盖率报告
bun test:coverage
```

### 3.2 E2E测试
```bash
# 运行所有E2E测试
bun test:e2e

# 运行单个测试文件
bun test:e2e home.spec.ts

# 运行特定测试（通过grep）
bun test:e2e -g "theme toggle"

# 带UI运行
bun test:e2e:ui

# 调试模式
bun test:e2e:debug

# Headed模式（显示浏览器窗口）
bun test:e2e:headed
```

### 3.3 运行所有测试
```bash
# 运行单元测试和E2E测试
bun test:all
```

### 3.4 其他命令
```bash
# TypeScript类型检查
bun run type-check

# Astro类型检查
bun run astro-check
```

## 4. 单元测试规范

### 4.1 文件组织
```
__tests__/
├── unit/
│   ├── components/
│   │   ├── SongList.test.tsx
│   │   ├── ThemeToggle.test.tsx
│   │   ├── PersistentPlayer.test.tsx
│   │   ├── AboutPage.test.tsx
│   │   ├── VirtualList.test.tsx
│   │   ├── ToasterWrapper.test.tsx
│   │   ├── BrandIcons.test.tsx
│   │   └── Hero.test.tsx
│   ├── layouts/
│   │   └── BaseLayout.test.tsx
│   ├── pages/
│   │   └── meta.test.tsx
│   ├── mocks.ts
│   └── setup.ts
├── e2e/
│   ├── home.spec.ts
│   ├── music.spec.ts
│   ├── about.spec.ts
│   ├── theme.spec.ts
│   └── responsive.spec.ts
└── fixtures/
    └── songs.json
```

### 4.2 命名约定
- **文件名**: `ComponentName.test.tsx` 或 `PageName.test.astro`
- **测试描述**: 使用中文，清晰描述测试目的
- **测试用例**: `it('应该做什么', () => {})` 或 `it('应该...测试场景', () => {})`

### 4.3 测试结构模板

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Component from '../../../src/components/Component';

describe('ComponentName', () => {
  beforeEach(() => {
    // 清理mock和状态
    vi.clearAllMocks();
  });

  afterEach(() => {
    // 清理副作用
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('应该正确渲染', () => {
      render(<Component />);
      expect(screen.getByText('内容')).toBeInTheDocument();
    });

    it('应该显示所有必需元素', () => {
      render(<Component />);
      expect(screen.getByRole('heading')).toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('应该响应用户操作', async () => {
      const user = userEvent.setup();
      render(<Component />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(/* 验证结果 */);
    });

    it('应该处理表单输入', async () => {
      const user = userEvent.setup();
      render(<Component />);

      const input = screen.getByRole('textbox');
      await user.type(input, '测试文本');

      expect(input).toHaveValue('测试文本');
    });
  });

  describe('Edge Cases', () => {
    it('应该处理空值', () => {
      render(<Component value={null} />);
      expect(screen.getByText('空状态')).toBeInTheDocument();
    });

    it('应该处理错误状态', () => {
      render(<Component error={true} />);
      expect(screen.getByText('错误信息')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('应该有正确的ARIA标签', () => {
      render(<Component />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', '描述');
    });

    it('应该支持键盘导航', async () => {
      const user = userEvent.setup();
      render(<Component />);

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Enter}');

      expect(/* 验证结果 */);
    });
  });
});
```

### 4.4 Mock使用规范

在 `__tests__/unit/setup.ts` 中配置全局mock：

```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(global, 'localStorage', {
  value: localStorageMock as unknown as Storage,
  writable: true,
  configurable: true,
});

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn(() => Promise.resolve()),
  },
  writable: true,
  configurable: true,
});
```

在测试文件中mock特定模块：

```typescript
vi.mock('pinyin-pro', () => ({
  pinyin: vi.fn((text: string) => text.toLowerCase()),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));
```

## 5. E2E测试规范

### 5.1 选择器策略
**优先使用（推荐）：**
- `getByRole()`: 按角色查找（button, link, textbox等）
- `getByText()`: 按文本内容查找
- `getByTestId()`: 使用data-testid属性（必要时）
- `getByLabel()`: 按标签查找（表单元素）

**避免使用：**
- CSS选择器（`page.locator('.class')`）
- XPath（除非绝对必要）

**示例：**
```typescript
// 推荐
await expect(page.getByRole('button', { name: '提交' })).toBeVisible();
await expect(page.getByText('欢迎')).toBeVisible();

// 必要时使用
await expect(page.getByTestId('submit-button')).toBeVisible();
```

### 5.2 等待策略
Playwright会自动等待元素可操作，但有时需要显式等待：

```typescript
// 自动等待（推荐）
await expect(page.getByText('标题')).toBeVisible();

// 显式等待特定选择器
await page.waitForSelector('.selector', { state: 'visible' });

// 等待网络请求
await page.waitForResponse('**/api/data');

// 等待特定超时
await page.waitForTimeout(1000); // 不推荐，仅在必要时使用
```

### 5.3 测试模板

```typescript
import { test, expect } from '@playwright/test';

test.describe('功能名称', () => {
  test.beforeEach(async ({ page }) => {
    // 每个测试前的设置
    await page.goto('/path');
    // 清理localStorage等
    await page.evaluate(() => localStorage.clear());
  });

  test('应该显示某元素', async ({ page }) => {
    await expect(page.getByText('Text')).toBeVisible();
  });

  test('应该完成某操作', async ({ page }) => {
    const button = page.getByRole('button', { name: '点击' });
    await button.click();

    await expect(page).toHaveURL('/new-path');
    await expect(page.getByText('成功')).toBeVisible();
  });

  test('应该处理表单提交', async ({ page }) => {
    const nameInput = page.getByRole('textbox', { name: '姓名' });
    await nameInput.fill('测试用户');

    const submitButton = page.getByRole('button', { name: '提交' });
    await submitButton.click();

    await expect(page.getByText('提交成功')).toBeVisible();
  });
});
```

### 5.4 测试配置

在 `playwright.config.ts` 中配置：

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'bun run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

## 6. Astro组件测试

### 6.1 当前状态
Astro组件测试目前使用placeholder测试，因为：
- `@astrojs/test` 包暂不可用
- Astro组件需要特殊的测试框架

### 6.2 替代方案
对于Astro组件，可以采用以下测试方式：

**方案1：测试文件内容**
```typescript
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Hero组件', () => {
  it('应该包含必要的元素', () => {
    const content = readFileSync('src/components/astro/Hero.astro', 'utf-8');
    expect(content).toContain('克罗雅');
    expect(content).toContain('进入歌单');
  });
});
```

**方案2：测试页面路由**
通过E2E测试验证Astro组件的正确性。

**方案3：使用@astrojs/compiler（高级）**
```typescript
import { compile } from '@astrojs/compiler';

describe('Astro编译', () => {
  it('应该成功编译组件', async () => {
    const result = await compile(source, { filename: 'Hero.astro' });
    expect(result.errors.length).toBe(0);
  });
});
```

### 6.3 占位符测试示例
```typescript
describe('Hero组件', () => {
  it('应该渲染Hero组件', () => {
    // Placeholder - 需要正确的Astro测试框架
    expect(true).toBe(true);
  });
});
```

## 7. 测试数据管理

### 7.1 Fixtures目录
将测试数据放在 `__tests__/fixtures/` 目录：

```
__tests__/fixtures/
├── songs.json
├── users.json
└── ...
```

### 7.2 使用测试数据

```typescript
import mockSongs from '../fixtures/songs.json';

describe('SongList', () => {
  it('应该渲染歌曲列表', () => {
    render(<SongList songs={mockSongs} />);
    expect(screen.getByText('歌曲1')).toBeInTheDocument();
  });
});
```

## 8. 常见问题排查

### 8.1 Mock第三方库

**Mock localStorage:**
```typescript
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;
```

**Mock clipboard:**
```typescript
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn(() => Promise.resolve()) },
  writable: true,
});
```

**Mock matchMedia:**
```typescript
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })),
});
```

### 8.2 处理异步操作

**使用waitFor:**
```typescript
await waitFor(() => {
  expect(element).toBeVisible();
}, { timeout: 5000 });
```

**使用userEvent:**
```typescript
const user = userEvent.setup();
await user.click(button);
await user.type(input, 'text');
```

### 8.3 调试技巧

**运行单个测试：**
```bash
bun test SongList.test.tsx
bun test -t "应该渲染"
```

**使用console.log调试：**
```typescript
it('应该...', () => {
  console.log('Debug:', element);
  expect(true).toBe(true);
});
```

**查看详细输出：**
```bash
bun test --reporter=verbose
```

### 8.4 性能优化

**跳过慢速测试：**
```typescript
test.skip('慢速测试', () => {
  // 测试内容
});
```

**限制mock数据量：**
```typescript
// 使用少量数据进行测试
const mockItems = Array.from({ length: 25 }, (_, i) => ({ id: i }));
```

**并行运行测试：**
Vitest默认并行运行测试，可以通过配置调整：
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    maxConcurrency: 4, // 并行测试数量
  },
});
```

## 9. 覆盖率报告

### 9.1 生成覆盖率报告
```bash
bun test:coverage
```

### 9.2 查看报告
报告会生成在 `coverage/` 目录：
- `index.html`: HTML格式报告（推荐）
- `coverage-final.json`: JSON格式
- `lcov.info`: LCOV格式

### 9.3 覆盖率阈值
当前配置的阈值（90%）：
```typescript
// vitest.config.ts
coverage: {
  thresholds: {
    statements: 90,
    branches: 90,
    functions: 90,
    lines: 90,
  },
}
```

## 10. CI/CD集成

### 10.1 GitHub Actions示例

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: 检出代码
        uses: actions/checkout@v4

      - name: 安装Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: '1.3.6'

      - name: 安装依赖
        run: bun install

      - name: 运行类型检查
        run: bun run type-check

      - name: 运行单元测试
        run: bun test:run

      - name: 生成覆盖率报告
        run: bun test:coverage

      - name: 上传覆盖率报告
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

      - name: 启动开发服务器
        run: bun run dev &
          sleep 10

      - name: 运行E2E测试
        run: bun test:e2e

      - name: 上传Playwright报告
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

## 11. 最佳实践

### 11.1 测试原则

1. **AAA模式**: Arrange（准备）, Act（执行）, Assert（断言）
2. **一个测试一个断言**: 保持测试简洁明了
3. **测试用户行为**: 测试用户如何使用组件，而不是实现细节
4. **保持独立性**: 测试之间不应该有依赖关系

### 11.2 命名规范

- **描述性名称**: `it('应该点击按钮后显示弹窗', () => {})`
- **中文描述**: 使用中文使测试更易读
- **避免实现细节**: `it('应该显示正确的class', () => {})` 而不是 `it('应该添加.active类', () => {})`

### 11.3 可维护性

- **DRY原则**: 提取重复的测试逻辑
- **使用辅助函数**: 创建测试工具函数
- **保持测试简单**: 复杂的测试逻辑应该重构

## 12. 有用的断言

### 12.1 存在性断言
```typescript
// 存在
expect(element).toBeInTheDocument();
expect(element).toBeVisible();

// 不存在
expect(element).not.toBeInTheDocument();
expect(element).not.toBeVisible();
```

### 12.2 属性断言
```typescript
// 属性
expect(element).toHaveAttribute('href', '/path');
expect(element).toHaveAttribute('aria-label', '描述');

// Class
expect(element).toHaveClass('active');
expect(element).not.toHaveClass('disabled');
```

### 12.3 文本断言
```typescript
// 文本内容
expect(element).toHaveTextContent('Hello');
expect(element).toHaveTextContent(/regex/);

// 表单值
expect(input).toHaveValue('input value');
```

### 12.4 数量断言
```typescript
// 元素数量
expect(elements.length).toBe(3);
expect(screen.getAllByRole('button')).toHaveLength(3);
```

## 13. 附录

### 13.1 工具文档链接
- [Vitest官方文档](https://vitest.dev/)
- [Playwright官方文档](https://playwright.dev/)
- [Testing Library文档](https://testing-library.com/)
- [Astro文档](https://docs.astro.build/)

### 13.2 有用的资源
- [React Testing Library最佳实践](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Playwright测试最佳实践](https://playwright.dev/docs/best-practices)
- [测试金字塔理论](https://martinfowler.com/articles/practical-test-pyramid.html)

### 13.3 联系方式
如有问题或建议，请通过以下方式联系：
- GitHub Issues: [项目地址]
- Email: qwqtest1@outlook.com

---

**最后更新**: 2026年2月
**维护者**: kloa-site 开发团队
