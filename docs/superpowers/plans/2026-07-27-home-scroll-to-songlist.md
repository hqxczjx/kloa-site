# 首页滚动即见歌单 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让首页 Hero 下方直接内嵌完整歌单，用户向下滚动即可使用，无需点击跳转；同时保留 `/music` 作为纯歌单页的独立入口。

**Architecture:** 抽取共享 Astro 组件 `SongListSection.astro`（封装「页头 + SongList + PersistentPlayer」），首页与 `/music` 同时复用，保证两处永远一致。Hero 的「进入歌单」CTA 改为锚点 `#songs`，借助全局 `scroll-behavior: smooth` 实现同页平滑滚动；新增 `scroll-padding-top` 避免固定导航遮挡，顺带修复 sticky 筛选条的同类遮挡瑕疵。

**Tech Stack:** Astro 7（`.astro` 组件 + 动态标签）、React 19（`SongList` / `PersistentPlayer`，`client:visible` / `client:idle` 水合）、Tailwind CSS v4、Playwright（e2e）、Vitest（单测）。

**Spec:** `docs/superpowers/specs/2026-07-27-home-scroll-to-songlist-design.md`

---

## 文件结构

| 文件 | 责任 | 改动 |
|---|---|---|
| `src/components/astro/SongListSection.astro` | 共享歌单区：页头（标题+说明+可选返回链接）+ `<SongList>` + `<PersistentPlayer>` | **新建** |
| `src/pages/music.astro` | `/music` 路由：仅包装 `<SongListSection showBackLink={true} />` | 重构（精简） |
| `src/pages/index.astro` | 首页：`<Hero/>` + `<SongListSection showBackLink={false} />` | 加一行 |
| `src/components/astro/Hero.astro` | Hero CTA 按钮指向 `#songs` + 向下箭头 | 改 href / 图标 / import |
| `src/styles/global.css` | `html` 加 `scroll-padding-top: 5rem` | 加一行 |
| `src/components/react/SongList.tsx` | sticky 筛选条容器 `top-2 z-20` → `top-20 z-30` | 改一行（第 78 行） |
| `__tests__/e2e/home.spec.ts` | 新增「首页内嵌歌单」「Hero CTA 滚动」两个用例 | 追加测试 |

**测试策略**：Astro 组件本身无单测（项目惯例：`Hero.test.tsx` 为占位），改用 e2e 作为验证主力。
- **回归保护**：重构 `music.astro` 前后跑 `music.spec.ts`；改 `SongList.tsx` 前后跑 `SongList.test.tsx`。先确认绿、再改、再确认仍绿。
- **TDD 先行**：首页内嵌歌单、Hero CTA 滚动——先写失败 e2e，再实现，再转绿。
- **`/music` 水合变化**：`SongList` 由 `client:load` → `client:visible`。因 `/music` 打开时歌单即在初始视口内，IntersectionObserver 立即触发水合，行为与原先无感知差异；`music.spec.ts` 全量回归作为验证。若出现 flaky，降级回 `client:load`（见 Task 2 注记）。

---

## Task 1: 创建共享组件 `SongListSection.astro`

**Files:**
- Create: `src/components/astro/SongListSection.astro`

- [ ] **Step 1: 新建组件文件**

写入 `src/components/astro/SongListSection.astro`：

```astro
---
import SongList from '../react/SongList';
import PersistentPlayer from '../react/PersistentPlayer';
import songs from '../../data/songs.json';
import { ArrowLeft, Music as MusicIcon } from 'lucide-react';

interface Props {
  /** 是否显示「返回首页」链接：/music 用 true，首页内嵌用 false */
  showBackLink?: boolean;
  /** 歌单区锚点 id，供 Hero CTA 与平滑滚动定位 */
  anchorId?: string;
}

const { showBackLink = false, anchorId = 'songs' } = Astro.props;
// 独立 /music（无 Hero）用 h1；首页内嵌（Hero 已占 h1「克罗雅」）用 h2，保证每页一个 h1
const Title = showBackLink ? 'h1' : 'h2';
---

<section id={anchorId} class="min-h-screen" style="background: var(--bg-primary);">
  {/* Page Header */}
  <div class="max-w-4xl mx-auto px-4 py-8">
    {/* Back to Home Link — 仅独立 /music 显示 */}
    {showBackLink && (
      <a
        href="/"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-xl glass transition-all duration-300 hover:scale-105 active:scale-95 mb-6 group"
      >
        <ArrowLeft className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" style={{ color: 'var(--accent-primary)' }} />
        <span class="font-medium" style={{ color: 'var(--text-primary)' }}>
          返回首页
        </span>
      </a>
    )}

    {/* Page Title（动态级别：h1 / h2） */}
    <div class="mb-8">
      <Title class="text-3xl md:text-4xl font-serif font-bold mb-2 flex items-center gap-3">
        <MusicIcon className="w-8 h-8 md:w-10 md:h-10" style={{ color: 'var(--accent-primary)' }} />
        <span class="bg-linear-to-br from-pink-500 to-blue-500 bg-clip-text text-transparent">
          歌单（{songs.length}首）
        </span>
      </Title>
      <p class="text-base md:text-lg" style={{ color: 'var(--text-secondary)' }}>
        点击歌曲名称或复制按钮，快速复制歌名到剪贴板（歌名、标签均为AI识别，可能存在误差，仅供参考）
      </p>
    </div>
  </div>

  {/* Song List — client:visible：首页不拖累首屏；/music 视口内立即水合 */}
  <SongList client:visible songs={songs} />

  {/* Global Player — client:idle：空闲加载，不阻塞首屏 */}
  <PersistentPlayer client:idle />
</section>
```

- [ ] **Step 2: 类型检查 + 构建验证编译通过**

Run: `bun run astro-check`
Expected: 无新增错误（exit 0；既有无关警告可忽略）。

Run: `bun run build`
Expected: 构建成功，`dist/` 生成 `/index.html` 与 `/music/index.html`，二者均含歌单 DOM（可 `grep -c 'data-testid="song-row"' dist/index.html` 确认 SSR 已渲染，但注意 VirtualList 首屏可能只渲染少量行——只要 `dist/` 产出即可）。

- [ ] **Step 3: Commit**

```bash
git add src/components/astro/SongListSection.astro
git commit -m "feat(songlist): 抽取共享 SongListSection 组件（首页与/music 复用）"
```

---

## Task 2: 重构 `/music` 复用 `SongListSection`（回归保护）

**Files:**
- Modify: `src/pages/music.astro`（整体精简为组件调用）

- [ ] **Step 1: 建立回归基线 — 确认 `music.spec.ts` 当前全绿**

Run: `bun run test:e2e:raw -- music.spec.ts`
Expected: 所有 9 个用例 PASS（页面加载 / 搜索框 / 搜索 / 语言过滤 / SC 开关 / 排序 / 复制 toast / 空状态 / 返回首页）。这是回归安全网。

- [ ] **Step 2: 重写 `music.astro`**

将 `src/pages/music.astro` 全文替换为：

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import SongListSection from '../components/astro/SongListSection.astro';
---

<BaseLayout title="歌单">
  <SongListSection showBackLink={true} />
</BaseLayout>
```

> 说明：`songs` 数据 import、`SongList` / `PersistentPlayer`、页头、「返回首页」链接、说明文字全部移入 `SongListSection`，行为与原页面一致。

- [ ] **Step 3: 回归 — 确认 `music.spec.ts` 仍全绿**

Run: `bun run test:e2e:raw -- music.spec.ts`
Expected: 全部 9 个用例 PASS。

> **注记（仅当失败时执行）**：若 `复制 toast` / `搜索` / `过滤` / `排序` 等交互类用例出现 flaky 或失败，原因是 `client:visible` 水合时序。降级处理：把 `SongListSection.astro` 中的 `<SongList client:visible ... />` 改回 `<SongList client:load ... />`，重新跑本测试确认通过。降级后首页首屏会加载歌单 JS（可接受，VirtualList 仍懒渲染行）。

- [ ] **Step 4: Commit**

```bash
git add src/pages/music.astro src/components/astro/SongListSection.astro
git commit -m "refactor(music): /music 改用共享 SongListSection（showBackLink）"
```

---

## Task 3: 首页内嵌完整歌单（TDD — e2e 先行）

**Files:**
- Test: `__tests__/e2e/home.spec.ts`（在 `describe` 块末尾追加）
- Modify: `src/pages/index.astro`

- [ ] **Step 1: 写失败 e2e — 首页应内嵌歌单区**

在 `__tests__/e2e/home.spec.ts` 的 `test.describe('Home Page', () => { ... })` 内，最后一个 `test(...)` 之后（第 127 行 `});` 之前）追加：

```ts
  test('should display song list section on home (scroll to see)', async ({ page }) => {
    // 首页应内嵌歌单区
    const songSection = page.locator('#songs');
    await expect(songSection).toBeAttached();

    // 滚动到歌单区
    await songSection.scrollIntoViewIfNeeded();

    // 歌曲行可见（SongList 水合 + VirtualList 渲染可见行）
    await expect(page.locator('[data-testid="song-row"]').first()).toBeVisible();
  });
```

- [ ] **Step 2: 运行新测试，确认失败**

Run: `bun run test:e2e:raw -- home.spec.ts -g "should display song list section on home"`
Expected: FAIL（首页目前无 `#songs` 区，`toBeAttached()` 超时失败）。

- [ ] **Step 3: 实现 — 首页引入 `SongListSection`**

将 `src/pages/index.astro` 全文替换为：

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Hero from '../components/astro/Hero.astro';
import SongListSection from '../components/astro/SongListSection.astro';
---

<BaseLayout title="首页">
  <Hero />
  <SongListSection showBackLink={false} />
</BaseLayout>
```

- [ ] **Step 4: 运行新测试，确认通过**

Run: `bun run test:e2e:raw -- home.spec.ts -g "should display song list section on home"`
Expected: PASS。

- [ ] **Step 5: 回归 — 首页其余用例不受影响**

Run: `bun run test:e2e:raw -- home.spec.ts`
Expected: 全部用例 PASS（含既有的导航、主题、footer、meta 等用例 + 新增用例）。

- [ ] **Step 6: Commit**

```bash
git add src/pages/index.astro __tests__/e2e/home.spec.ts
git commit -m "feat(home): 首页内嵌完整歌单，滚动即见"
```

---

## Task 4: Hero CTA 平滑滚动到歌单区（TDD — e2e 先行）

**Files:**
- Test: `__tests__/e2e/home.spec.ts`（追加）
- Modify: `src/components/astro/Hero.astro`（第 3 行 import；第 131、141 行 CTA）

- [ ] **Step 1: 写失败 e2e — 点击 Hero「进入歌单」应同页滚动到 #songs**

在 `__tests__/e2e/home.spec.ts` 的 `describe` 块内追加（紧接 Task 3 新增的测试之后）：

```ts
  test('should scroll to song list via hero CTA (no navigation)', async ({ page }) => {
    const cta = page.getByRole('link', { name: /进入歌单/ });
    await expect(cta).toBeVisible();

    await cta.click();

    // 仍停留在首页，URL 含 #songs（锚点跳转，非 /music 导航）
    await expect(page).toHaveURL(/#songs/);
    await expect(page).not.toHaveURL(/\/music/);
  });
```

- [ ] **Step 2: 运行新测试，确认失败**

Run: `bun run test:e2e:raw -- home.spec.ts -g "should scroll to song list via hero CTA"`
Expected: FAIL（CTA 当前 `href="/music"`，点击后跳转 `/music`，`toHaveURL(/#songs/)` 不匹配；且会触发跨页导航）。

- [ ] **Step 3: 实现 — 改 Hero CTA 指向 `#songs` + 向下箭头**

对 `src/components/astro/Hero.astro` 做三处精确替换：

① 第 3 行 import，移除 `ArrowRight`、加入 `ArrowDown`：

```diff
- import { ArrowRight, Tv, Volume2 } from 'lucide-react';
+ import { ArrowDown, Tv, Volume2 } from 'lucide-react';
```

② 第 131 行 CTA 的 `href`：

```diff
-     href="/music"
+     href="#songs"
```

③ 第 141 行图标组件 + hover 方向（横向 → 纵向，暗示「向下滚动」）：

```diff
- <ArrowRight className="relative z-10 w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" style={{ color: 'var(--accent-primary)' }} />
+ <ArrowDown className="relative z-10 w-5 h-5 transition-transform duration-300 group-hover:translate-y-1" style={{ color: 'var(--accent-primary)' }} />
```

> 其余结构（玻璃态样式、`group-hover` 缩放、glow 效果、「进入歌单」文字）保持不变。

- [ ] **Step 4: 运行新测试，确认通过**

Run: `bun run test:e2e:raw -- home.spec.ts -g "should scroll to song list via hero CTA"`
Expected: PASS。

- [ ] **Step 5: 回归 — 既有「导航到 music」用例仍通过（它测的是导航栏链接，非 CTA）**

Run: `bun run test:e2e:raw -- home.spec.ts`
Expected: 全部 PASS。

- [ ] **Step 6: Commit**

```bash
git add src/components/astro/Hero.astro __tests__/e2e/home.spec.ts
git commit -m "feat(hero): 「进入歌单」CTA 改为平滑滚动到 #songs"
```

---

## Task 5: CSS — 锚点避让导航 + 修复 sticky 筛选条遮挡

**Files:**
- Modify: `src/styles/global.css`（`html` 规则，约第 96-99 行）
- Modify: `src/components/react/SongList.tsx`（第 78 行 sticky 容器）
- Test（回归安全网）: `__tests__/unit/components/SongList.test.tsx`

- [ ] **Step 1: 建立单测基线 — 确认 `SongList.test.tsx` 当前全绿**

Run: `bun run test:run -- SongList`
Expected: 全部 13 个用例 PASS。

- [ ] **Step 2: 改 `global.css` — `html` 加 `scroll-padding-top`**

在 `src/styles/global.css` 第 96-99 行的 `html { ... }` 规则内追加一行：

```diff
  html {
    scroll-behavior: smooth;
    overflow-x: hidden;
+   scroll-padding-top: 5rem;
  }
```

> 作用：所有锚点跳转（含 Hero CTA → `#songs`）自动预留顶部固定导航（约 64–80px）的高度，标题不被遮挡。

- [ ] **Step 3: 改 `SongList.tsx` — sticky 筛选条避开导航**

将 `src/components/react/SongList.tsx` 第 78 行：

```diff
-     <div className="sticky top-2 z-20 mb-4">
+     <div className="sticky top-20 z-30 mb-4">
```

> `top-20`（5rem）让筛选条 sticky 停在导航栏正下方；`z-30` 提升到歌单内容之上、导航（z-50）之下。此修复同时改善首页与 `/music`。

- [ ] **Step 4: 单测回归 — 确认仍全绿**

Run: `bun run test:run -- SongList`
Expected: 全部 13 个用例 PASS（这些用例只断言 testid/role/text，不涉及 sticky className）。

- [ ] **Step 5: e2e 回归 — 滚动类用例仍通过**

Run: `bun run test:e2e:raw -- home.spec.ts music.spec.ts`
Expected: 全部 PASS。

- [ ] **Step 6: Commit**

```bash
git add src/styles/global.css src/components/react/SongList.tsx
git commit -m "fix(ui): 锚点 scroll-padding-top + sticky 筛选条避开固定导航"
```

---

## Task 6: 全量回归与类型检查

**Files:** 无（仅验证）

- [ ] **Step 1: 类型检查**

Run: `bun run astro-check`
Expected: exit 0，无错误。

- [ ] **Step 2: 全量单测**

Run: `bun run test:run`
Expected: 全部 PASS（含 `SongList.test.tsx`、`Hero.test.tsx` 占位用例、`PersistentPlayer.test.tsx` 等）。

- [ ] **Step 3: 全量 e2e（含 responsive，最近改过选择器）**

Run: `bun run test:e2e`
Expected: 全部 PASS（home / music / about / theme / responsive 五个 spec）。

> 若 `responsive.spec.ts` 因首页新增歌单区出现断言失败（例如「首屏只应含 Hero」之类），按其断言语义调整：首页现在合法地包含 Hero + 歌单区。优先调整测试以匹配新设计，而非回退功能。

- [ ] **Step 4: 构建产物验证**

Run: `bun run build`
Expected: 构建成功。`astro check` 与 build 均通过即可。

- [ ] **Step 5: （可选）手动目视确认**

本地 `bun run dev`，确认：
- 首页向下滚动能见到完整歌单；筛选条 sticky 在导航下方不被遮挡。
- 点 Hero「进入歌单」平滑滚到歌单区，URL 变为 `/#songs`，不跳转。
- `/music` 仍有「返回首页」、纯歌单体验正常。
- 桌面/移动导航栏「歌单」仍跳 `/music`。

---

## 自审

**1. Spec 覆盖**：
- 决策 1（完整歌单）→ Task 1（SongListSection 含完整 SongList）+ Task 3（首页引入）。✓
- 决策 2（保留 /music 双入口）→ Task 2（/music 复用组件，导航栏不变）。✓
- 决策 3（Hero CTA 平滑滚动）→ Task 4。✓
- 决策 4（抽取共享组件，路径 A）→ Task 1。✓
- 决策 5（顺带修 sticky 筛选条）→ Task 5 Step 3。✓
- spec 第 7.a（scroll-padding-top）→ Task 5 Step 2。✓
- spec 第 8（client:visible / client:idle）→ Task 1 组件内已采用。✓
- spec 第 9（测试，含不破坏既有 music e2e）→ Task 2/3/4/5/6 均含回归步骤。✓
- spec 第 10（SEO：首页 h1 不变，歌单 h2）→ Task 1 动态 Title 逻辑。✓
- spec 第 12（受影响文件清单）→ 全部覆盖。

**2. 占位符扫描**：无 TBD/TODO/「适当处理」。每个代码步骤含完整代码；降级分支（Task 2 Step 3 注记）给出具体动作与命令。

**3. 类型/命名一致性**：
- 组件名 `SongListSection`、Props `showBackLink` / `anchorId`、锚点 `songs` 在所有任务中一致。
- `Title` 动态标签变量名一致。
- 文件路径与 spec 第 12 节一致。

**4. 风险点**：
- `/music` 的 `client:visible` 水合时序 → Task 2 Step 3 有降级 fallback。
- `responsive.spec.ts` 可能受首页布局变化影响 → Task 6 Step 3 有处理指引。
