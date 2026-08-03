# Agnes AI 实验室 — Plan 4: 入口聚合页与收尾实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: 用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现。步骤用 checkbox（`- [ ]`）跟踪。

**Goal:** 新增入口聚合页 `/ai`（三张入口卡＋完整免责声明），把 Plan 1 临时指向 `/ai/chat` 的导航改指 `/ai`，三个子页统一加「返回入口＋完整免责」，BaseLayout 支持 per-page title，确认 sitemap 收录与整体回归。

**Architecture:** 入口页为**纯静态** `.astro`（三张链接卡，无 JS，最轻）。免责声明抽为 Astro 组件 `AiDisclaimer.astro` 复用。BaseLayout 接受 `title` prop（默认值向后兼容）。

**Tech Stack:** Astro（静态）＋ Tailwind v4 ＋ 现有玻璃拟态/双主题。

**前置依赖:** Plan 1（导航入口、chat 页）、Plan 2（image 页）、Plan 3（video 页）完成。

**关联:** spec 第 5.1、7.3、11、12 节。

---

## 文件结构

**新建:**
| 文件 | 职责 |
|---|---|
| `src/components/astro/AiDisclaimer.astro` | 完整版 AI 二创免责声明卡片（复用） |
| `src/pages/ai/index.astro` | 入口聚合页（静态，三卡＋免责） |
| `__tests__/e2e/ai-hub.spec.ts` | 入口页导航 e2e |

**修改:**
| 文件 | 改动 |
|---|---|
| `src/layouts/BaseLayout.astro` | 接受 `title` prop（默认 `克罗雅的小网站`），`<title>`/`og:title` 用 prop；导航「AI」href 改 `/ai/` |
| `src/pages/ai/chat.astro` | 套返回链接＋`<AiDisclaimer />`＋传 title |
| `src/pages/ai/image.astro` | 同上 |
| `src/pages/ai/video.astro` | 同上 |

> 注：入口页用 emoji（💬🎨🎬）做图标，避免为静态页引入 React island。

---

## Task 1: AiDisclaimer 共享组件

**Files:**
- Create: `src/components/astro/AiDisclaimer.astro`

- [ ] **Step 1: 写 `src/components/astro/AiDisclaimer.astro`**

```astro
---
// 完整版 AI 二创免责声明，复用于入口页与各子页
---
<div class="glass rounded-2xl p-5 md:p-6 text-left max-w-3xl mx-auto" data-testid="ai-disclaimer">
  <div class="flex items-center gap-2 mb-3">
    <span class="text-lg">⚠️</span>
    <h2 class="font-serif text-lg font-bold" style="color: var(--accent-primary);">关于本页 AI 功能</h2>
  </div>
  <div class="space-y-2 text-sm leading-relaxed" style="color: var(--text-secondary);">
    <p>本页为非官方粉丝站的<strong>实验性 AI 功能</strong>。所有由 AI 生成的文字、图像、视频均为二次创作，<strong>不代表克罗雅本人言论或官方形象</strong>，可能与官方设定不符。</p>
    <p>生成内容仅在本次会话展示，不做保存；视频与图片链接可能失效，请及时下载。</p>
    <p>本站与克罗雅及相关公司无任何直接或许可关系。如发现不当内容，请联系 <a href="mailto:qwqtest1@outlook.com" class="underline" style="color: var(--accent-primary);">qwqtest1@outlook.com</a>。</p>
  </div>
</div>
```

- [ ] **Step 2: build 确认无语法错**

```bash
bun run build
```
Expected: 通过（组件未被引用也无碍）。

- [ ] **Step 3: Commit**

```bash
git add src/components/astro/AiDisclaimer.astro
git commit -m "feat(ai): AiDisclaimer 共享免责声明组件"
```

---

## Task 2: 入口聚合页 `/ai`

**Files:**
- Create: `src/pages/ai/index.astro`

- [ ] **Step 1: 写 `src/pages/ai/index.astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import AiDisclaimer from '../../components/astro/AiDisclaimer.astro';

const cards = [
  { href: '/ai/chat/', emoji: '💬', title: '和克罗雅聊天', desc: '天使或恶魔的方式回应你', accent: 'oklch(0.78 0.10 15)' },
  { href: '/ai/image/', emoji: '🎨', title: '给克罗雅换装', desc: '立绘变赛博朋克/水彩/像素', accent: 'oklch(0.72 0.12 15)' },
  { href: '/ai/video/', emoji: '🎬', title: '让克罗雅动起来', desc: '静态立绘 → 短视频', accent: 'oklch(0.64 0.10 240)' },
];
---
<BaseLayout title="AI 实验室 · 克罗雅">
  <section class="w-full max-w-5xl mx-auto px-4 py-12 pb-32">
    <div class="text-center mb-10">
      <div class="text-xs tracking-[0.3em] opacity-60 mb-2">EXPERIMENTAL · 非官方二创</div>
      <h1 class="font-serif text-4xl md:text-5xl font-bold mb-2"
          style="background: linear-gradient(120deg, var(--accent-primary), var(--accent-secondary)); -webkit-background-clip: text; background-clip: text; color: transparent;">
        AI 实验室
      </h1>
      <p class="text-sm" style="color: var(--text-secondary);">
        和克罗雅一起玩的实验性 AI 小工具 · 可能随时爆炸 💣
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
      {cards.map((c) => (
        <a href={c.href} class="glass rounded-2xl p-6 text-center hover:scale-[1.02] transition-transform duration-300 block">
          <div class="text-4xl mb-3">{c.emoji}</div>
          <div class="font-serif text-xl font-bold mb-1" style={`color: ${c.accent};`}>{c.title}</div>
          <div class="text-sm" style="color: var(--text-secondary);">{c.desc}</div>
          <div class="text-xs mt-4 opacity-70" style="color: var(--accent-primary);">进入 →</div>
        </a>
      ))}
    </div>

    <AiDisclaimer />
  </section>
</BaseLayout>
```

- [ ] **Step 2: build 确认 `dist/ai/index.html` 生成**

```bash
bun run build
```
Expected: 通过；存在 `dist/ai/index.html`。

- [ ] **Step 3: Commit**

```bash
git add src/pages/ai/index.astro
git commit -m "feat(ai): /ai 入口聚合页（三卡＋免责）"
```

---

## Task 3: BaseLayout 支持 title + 导航改指 `/ai`

**Files:**
- Modify: `src/layouts/BaseLayout.astro`

- [ ] **Step 1: BaseLayout frontmatter 接受 title**

把 BaseLayout.astro 第 1-18 行 frontmatter 的首部改为：

```astro
---
import '../styles/global.css';
import ThemeToggle from '../components/ui/ThemeToggle.tsx';
import ToasterWrapper from '../components/ui/ToasterWrapper.tsx';
import { Heart, Music as MusicIcon, User, Volume2, Sparkles } from 'lucide-react';

const { title = '克罗雅的小网站' } = Astro.props;

// Canonical URL for SEO / Open Graph (requires `site` in astro.config)
const canonicalURL = new URL(Astro.url.pathname, Astro.site);

// Get current year dynamically
const currentYear = new Date().getFullYear();
const startYear = 2026;

// Format year display: "2026" or "2026 - 2027"
const yearDisplay = currentYear === startYear
  ? `${startYear}`
  : `${startYear} - ${currentYear}`;
---
```

- [ ] **Step 2: `<title>` 与 `og:title` 用 prop**

把 head 中：
```astro
<title>克罗雅的小网站</title>
```
改为：
```astro
<title>{title}</title>
```
把：
```astro
<meta property="og:title" content="克罗雅的小网站" />
```
改为：
```astro
<meta property="og:title" content={title} />
```

- [ ] **Step 3: 导航「AI」href 改指 `/ai/`**

桌面顶栏（原 Plan 1 加的）：
```astro
<a href="/ai/chat/" class="nav-link">AI</a>
```
改为：
```astro
<a href="/ai/" class="nav-link">AI 实验室</a>
```

移动底栏（原 Plan 1 加的 `<a href="/ai/chat/" class="mobile-nav-link">…AI…</a>`）改为 `href="/ai/"`，文字保持「AI」。

- [ ] **Step 4: 类型检查 + build**

```bash
bun run build
```
Expected: 通过。默认 title 仍为「克罗雅的小网站」（向后兼容现有页面）。

- [ ] **Step 5: Commit**

```bash
git add src/layouts/BaseLayout.astro
git commit -m "feat(ai): BaseLayout 支持 per-page title，导航改指 /ai 入口页"
```

---

## Task 4: 三子页加返回链接 + 免责 + title

**Files:**
- Modify: `src/pages/ai/chat.astro`
- Modify: `src/pages/ai/image.astro`
- Modify: `src/pages/ai/video.astro`

- [ ] **Step 1: 改 `src/pages/ai/chat.astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import AiDisclaimer from '../../components/astro/AiDisclaimer.astro';
import ChatStudio from '../../components/react/ai/ChatStudio';
---
<BaseLayout title="和克罗雅聊天 · AI 实验室">
  <div class="max-w-3xl mx-auto px-4 pt-4">
    <a href="/ai/" class="text-sm underline" style="color: var(--text-secondary);">← 返回 AI 实验室</a>
  </div>
  <ChatStudio client:idle />
  <div class="px-4 pb-16">
    <AiDisclaimer />
  </div>
</BaseLayout>
```

- [ ] **Step 2: 改 `src/pages/ai/image.astro`（同样结构）**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import AiDisclaimer from '../../components/astro/AiDisclaimer.astro';
import ImageStudio from '../../components/react/ai/ImageStudio';
---
<BaseLayout title="给克罗雅换装 · AI 实验室">
  <div class="max-w-3xl mx-auto px-4 pt-4">
    <a href="/ai/" class="text-sm underline" style="color: var(--text-secondary);">← 返回 AI 实验室</a>
  </div>
  <ImageStudio client:idle />
  <div class="px-4 pb-16">
    <AiDisclaimer />
  </div>
</BaseLayout>
```

- [ ] **Step 3: 改 `src/pages/ai/video.astro`（同样结构）**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import AiDisclaimer from '../../components/astro/AiDisclaimer.astro';
import VideoStudio from '../../components/react/ai/VideoStudio';
---
<BaseLayout title="让克罗雅动起来 · AI 实验室">
  <div class="max-w-3xl mx-auto px-4 pt-4">
    <a href="/ai/" class="text-sm underline" style="color: var(--text-secondary);">← 返回 AI 实验室</a>
  </div>
  <VideoStudio client:idle />
  <div class="px-4 pb-16">
    <AiDisclaimer />
  </div>
</BaseLayout>
```

- [ ] **Step 4: build + 全量单测确认无回归**

```bash
bun run build && bun run test
```
Expected: 通过。

- [ ] **Step 5: Commit**

```bash
git add src/pages/ai/chat.astro src/pages/ai/image.astro src/pages/ai/video.astro
git commit -m "feat(ai): 三子页加返回入口、免责声明与 per-page title"
```

---

## Task 5: e2e 入口导航 + sitemap 确认

**Files:**
- Create: `__tests__/e2e/ai-hub.spec.ts`

- [ ] **Step 1: 写 `__tests__/e2e/ai-hub.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test.describe('AI 入口聚合页', () => {
  test('三张入口卡导航到对应子页', async ({ page }) => {
    await page.goto('/ai/');
    await expect(page.getByRole('heading', { name: 'AI 实验室' })).toBeVisible();
    await expect(page.getByTestId('ai-disclaimer')).toBeVisible();

    await page.getByRole('link', { name: /和克罗雅聊天/ }).click();
    await expect(page).toHaveURL(/\/ai\/chat\//);

    await page.goto('/ai/');
    await page.getByRole('link', { name: /给克罗雅换装/ }).click();
    await expect(page).toHaveURL(/\/ai\/image\//);

    await page.goto('/ai/');
    await page.getByRole('link', { name: /让克罗雅动起来/ }).click();
    await expect(page).toHaveURL(/\/ai\/video\//);
  });

  test('导航栏 AI 入口指向 /ai/', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'AI 实验室' }).first().click();
    await expect(page).toHaveURL(/\/ai\/$/);
  });
});
```

- [ ] **Step 2: 跑 e2e**

```bash
bun run test:e2e:raw ai-hub.spec.ts
```
Expected: PASS（2 tests）。

- [ ] **Step 3: 跑全量 e2e 确认无回归**

```bash
bun run test:e2e
```
Expected: 全部 PASS（含既有 music 等 + 新增 ai-*）。

- [ ] **Step 4: 确认 sitemap 收录新页**

```bash
bun run build && grep -E "/ai(/chat|/image|/video)?/?" dist/sitemap*.xml
```
Expected: 输出包含 `/ai/`、`/ai/chat/`、`/ai/image/`、`/ai/video/`。

- [ ] **Step 5: Commit**

```bash
git add __tests__/e2e/ai-hub.spec.ts
git commit -m "test(ai): 入口聚合页导航 e2e 与 sitemap 确认"
```

---

## 整体冒烟 Checklist（部署后手动执行）

部署到生产后，逐项验证（需 `AGNES_API_KEY` 已在 Cloudflare Workers 的 Variables and Secrets 配置为 Secret/Production）：

- [ ] `https://kloa.fans/ai/` 打开，三张卡可见，免责声明可见。
- [ ] 导航栏「AI 实验室」→ `/ai/`。
- [ ] **对话**：选话题/输入 → 流式回复逐字出现 → 切天使/恶魔语气不同 → AI 标记可见。
- [ ] **绘图**：选风格 → 生成 → 出图 → 下载可用。
- [ ] **视频**：选动作 → 提交 → 进度更新 → 完成播放/下载；离开页面后回来不残留任务。
- [ ] 限流：连续快速请求 ~10 次后出现「操作太频繁」。
- [ ] 三个子页底部免责声明 + 返回入口链接可见。
- [ ] 桌面/移动端导航正常；Angel/Demon 双主题下 AI 页面观感正常。
- [ ] 浏览器 `<title>` 各页不同；`https://kloa.fans/sitemap-index.xml` 含 AI 页面。

---

## Self-Review

- **Spec 覆盖**：5.1 入口页、7.3 完整免责（入口＋子页）、11 文件清单（AiDisclaimer、ai/index.astro、BaseLayout title）、12 sitemap/SEO。✅
- **一致性**：入口卡 href 与子页路由一致（`/ai/chat/` 等）；导航三处（桌面/移动/Plan 1 临时）统一改指 `/ai/`；title 命名风格统一（`X · AI 实验室`）。✅
- **占位符**：无；冒烟为部署后手动 checklist（真实步骤，非占位符）。✅
- **风险点**：BaseLayout 改动影响所有页面 title——用默认值 `克罗雅的小网站` 保证向后兼容，既有页面不传 title 不受影响（Task 3 已 build 验证）。
