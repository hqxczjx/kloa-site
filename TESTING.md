# TESTING.md - kloa-site 测试指南

## 1. 概览

### 1.1 测试目标
- 代码覆盖率目标：90%以上
- 所有测试必须通过
- CI/CD集成测试
- 使用中文编写测试描述

### 1.2 测试类型
- **单元测试**: 组件级别的测试（Vitest + Testing Library）
- **E2E测试**: 端到端用户流程测试（Playwright）
- **Astro页面**: 通过读取源文件内容或 E2E 验证（无专用 Astro 测试框架）

### 1.3 当前测试状态
- 单元测试：**266 个用例 / 25 个文件**
- E2E测试：**75 个用例 / 5 个文件**
- 覆盖率：阈值 90%（statements/branches/functions/lines）

## 2. 测试工具栈

### 2.1 核心工具
- **Vitest v4.0.18**: 单元测试框架
- **Playwright v1.58.1**: E2E测试框架
- **Testing Library**: React组件渲染和查询
  - @testing-library/react v16.3.2
  - @testing-library/jest-dom v6.9.1
  - @testing-library/user-event v14.6.1

### 2.2 辅助工具
- **happy-dom v20.5.0**: 浏览器环境模拟（vitest 默认环境，比 jsdom 启动快 2-3 倍）
- **jsdom v28.0.0**: 备用 DOM 模拟（未启用）
- **@vitest/coverage-v8**: 代码覆盖率报告

### 2.3 React相关
- **React 19.2.4**: UI库
- **@vitejs/plugin-react**: Vitest React支持

## 3. 运行测试

### 3.1 单元测试
```bash
# 运行单元测试（一次）
bun test
# 等价于 bun test（package.json 的 test 脚本即 vitest run）
bun test:run

# watch 模式（监听文件变更自动重跑）
bun test:watch

# 运行单个测试文件（透传给 vitest）
bun test -- SongList.test.tsx

# 运行特定测试（通过名称匹配）
bun test -- -t "应该渲染"

# 带UI运行
bun test:ui

# 生成覆盖率报告
bun test:coverage
```

> **注意**：`bun test` 与 `bun test:run` 都是「运行一次」（`vitest run`）。需要监听模式请用 `bun test:watch`。

### 3.2 E2E测试
```bash
# 运行所有E2E测试（包装脚本会自动检查/安装浏览器）
bun test:e2e

# 运行单个测试文件 / 按名称过滤
# ⚠️ 必须用 :raw 透传参数；test:e2e 包装脚本不透传命令行参数
bun run test:e2e:raw music.spec.ts
bun run test:e2e:raw -g "theme toggle"

# 直接调用 Playwright（等价于 :raw）
bun run test:e2e:raw

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

# 预装 Playwright 浏览器（约 200MB）
bun run setup:e2e
```

## 4. 单元测试规范

### 4.1 文件组织
```
__tests__/
├── unit/
│   ├── components/
│   │   ├── SongList.test.tsx
│   │   ├── songlist-SongTable.test.tsx
│   │   ├── songlist-SongRow.test.tsx
│   │   ├── songlist-FilterBar.test.tsx
│   │   ├── songlist-ScBadge.test.tsx
│   │   ├── songlist-pinyin.test.ts
│   │   ├── songlist-utils.test.ts
│   │   ├── ThemeToggle.test.tsx
│   │   ├── PersistentPlayer.test.tsx
│   │   ├── AboutPage.test.tsx
│   │   ├── VirtualList.test.tsx
│   │   ├── ToasterWrapper.test.tsx
│   │   ├── BrandIcons.test.tsx
│   │   ├── Hero.test.tsx
│   │   └── AnniversaryCard.test.tsx
│   ├── layouts/
│   │   └── BaseLayout.test.tsx
│   ├── pages/
│   │   └── meta.test.tsx
│   ├── optimizations/
│   │   ├── hydration.test.ts
│   │   ├── prefetch.test.ts
│   │   ├── dependencies.test.ts
│   │   ├── font-loading.test.ts
│   │   ├── image-optimization.test.ts
│   │   ├── assets-seo.test.ts
│   │   ├── transitions.test.ts
│   │   └── code-quality.test.ts
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

> `songlist-*` 前缀的文件是对同一主组件（SongTable/FilterBar 等）按子模块拆分的测试，便于聚焦维护。

### 4.2 命名约定
- **文件名**: `ComponentName.test.tsx`（组件）/ `module.test.ts`（纯逻辑）
- **测试描述**: 使用中文，清晰描述测试目的
- **测试用例**: `it('应该做什么', () => {})`

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

### 4.4 全局 Mock 配置

在 `__tests__/unit/setup.ts` 中通过 `beforeEach` 配置全局 mock（以实际文件为准，以下为当前内容概要）：

```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi, beforeEach } from 'vitest';

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  // 清理 document 上的主题类
  document.documentElement.classList.remove('dark');

  // Mock window.matchMedia
  Object.defineProperty(globalThis, 'matchMedia', {
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
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock as unknown as Storage,
    writable: true,
    configurable: true,
  });

  // Mock navigator.clipboard
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: vi.fn(() => Promise.resolve()) },
    writable: true,
    configurable: true,
  });

  // Mock scrollTo / 音视频播放
  globalThis.scrollTo = vi.fn();
  HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
  HTMLMediaElement.prototype.pause = vi.fn();
});
```

在测试文件中 mock 特定模块：

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
});
```

### 5.4 测试配置

配置文件为 `playwright.config.ts`（以下为当前实际配置，**以源文件为准**）：

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './__tests__/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
    launchOptions: {
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-extensions',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], /* ... */ },
    },
  ],
  webServer: {
    // 用 astro build + preview（生产静态产物）而非 dev：避免 vite 逐页编译导致
    // 加载超时/flaky，e2e 更快更稳；preview 也不触发 astro 的 AI-agent 后台 daemon。
    // 直接 astro build 跳过 astro check（类型检查由 test.yml 负责），省 ~5s。
    command: 'PUBLIC_ASTRO_DEV_TOOLBAR_DISABLED=true bunx astro build && bun run preview',
    url: 'http://localhost:4321',
    timeout: 120000,
  },
});
```

要点：
- **仅 chromium** 一个 project（CI 上安装也只装 chromium）。
- `workers: process.env.CI ? 2 : 1` + `fullyParallel: false`：CI 上 2 个 worker 跨文件并行（同文件内仍串行），本地保持 1 便于调试。历史上全串行是为规避 flaky，现已修好水合时序（见 music `beforeEach` 的 `networkidle`），可安全并行。
- `webServer` 用 **astro build + preview**（跳过 astro check，类型检查由 test.yml 负责），不是 `bun run dev`。

## 6. Astro 页面测试

### 6.1 当前做法
`@astrojs/test` 暂未启用，Astro 页面/组件通过两种方式验证：

**方式1：读取源文件内容**（见 `__tests__/unit/optimizations/code-quality.test.ts`、`assets-seo.test.ts` 等）
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

**方式2：通过 E2E 验证渲染后的真实页面**（见 `__tests__/e2e/`）。

## 7. 测试数据管理

### 7.1 Fixtures目录
将测试数据放在 `__tests__/fixtures/` 目录：

```
__tests__/fixtures/
├── songs.json
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

> 全局场景已在 `setup.ts` 统一配置（见 4.4），通常无需在各测试文件重复。

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
bun test -- SongList.test.tsx
bun test -- -t "应该渲染"
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
当前配置（`vitest.config.ts`）：
```typescript
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

CI 配置在 `.github/workflows/`（**以源文件为准**），共 4 个 workflow：

| Workflow | 触发 | 职责 |
|----------|------|------|
| `test.yml` | push/PR → main, develop | astro-check + type-check + 单元测试 + Codecov |
| `e2e.yml` | push/PR → main, develop | Playwright E2E（build + preview） |
| `coverage.yml` | PR → main | 单元测试带覆盖率 + PR 覆盖率评论 |
| `sync-songs.yml` | 定时 cron + 手动 | 从远程同步歌单到 `src/data/songs.json` |

### 10.1 关键优化（已落地）

- **依赖缓存**：所有 workflow 用 `actions/cache` 缓存 `~/.bun/install/cache`（按 `bun.lock` 哈希；`setup-node`/`setup-bun` 均不内置 bun 依赖缓存），`bun install` 从 ~40s 降到 ~5s。
- **Playwright 浏览器缓存**：`e2e.yml` 用 `actions/cache` 按 Playwright 版本号缓存 `~/.cache/ms-playwright`；命中时直接复用（ubuntu runner 已预装浏览器运行所需的全部系统库，故跳过 `install-deps`，省 ~15s apt 字体安装）。
- **路径过滤**：`test.yml`/`e2e.yml`/`coverage.yml` 配置 `paths-ignore`，纯文档/数据（`**.md`、`docs/`、`src/data/` 等）变更不触发测试；并保留 `workflow_dispatch` 以便手动触发。

### 10.2 本地复现 CI 的测试流程

```bash
bun install
bun run astro-check
bun run type-check
bun test:run          # 单元
bun run setup:e2e     # 首次安装浏览器
bun test:e2e          # E2E（会自动 build + preview）
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

---

**最后更新**: 2026年7月
**维护者**: kloa-site 开发团队
