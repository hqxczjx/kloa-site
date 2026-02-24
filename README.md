# kloa-site

Vsinger FanSite (Angel/Demon Edition) - Vtuber 角色粉丝站

## 开发环境要求

- Bun v1.3.6+
- Node.js (用于 Playwright 浏览器安装)

## 安装

```bash
# 安装项目依赖
bun install
```

> **注意**: 首次运行 E2E 测试时会自动安装 Playwright 浏览器（约 200MB），也可手动运行 `bun run setup:e2e` 预先安装。

## 开发

```bash
# 启动开发服务器
bun dev

# 构建生产版本
bun run build

# 预览生产构建
bun run preview
```

## 测试

### 单元测试

```bash
# 运行单元测试
bun test

# 运行一次
bun test:run

# UI 模式
bun test:ui

# 覆盖率报告
bun test:coverage
```

### E2E 测试

```bash
# 运行 E2E 测试
bun run test:e2e

# UI 模式
bun run test:e2e:ui

# 调试模式
bun run test:e2e:debug

# 有头模式（显示浏览器）
bun run test:e2e:headed
```

### 运行所有测试

```bash
bun run test:all
```

## 类型检查

```bash
# TypeScript 类型检查
bun run type-check

# Astro 类型检查
bun run astro-check
```

## 项目结构

- `src/` - 源代码
- `__tests__/unit/` - 单元测试
- `__tests__/e2e/` - E2E 测试
- `playwright.config.ts` - Playwright 配置

## 技术栈

- **运行时**: Bun v1.3.6
- **框架**: Astro 6.0 Beta
- **UI**: React 19
- **样式**: Tailwind CSS v4.0
- **动画**: Framer Motion
- **测试**: Vitest + Playwright

