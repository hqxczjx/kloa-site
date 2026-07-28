# 首页滚动即见歌单 设计文档

- **日期**: 2026-07-27
- **状态**: 待实现
- **主题**: 让首页向下滚动即可进入完整歌单，减少点击，使歌单「看起来就在首页」

## 1. 背景与目标

当前首页 `index.astro` 只渲染一个 `<Hero />`（占满首屏的入口区），歌单在独立路由 `/music`。用户想看歌单必须点击 Hero 的「进入歌单」按钮或导航栏「歌单」链接，发生一次跳转。

**目标**：用户在首页向下滚动即可直接看到并使用完整歌单，无需任何点击跳转；同时保留 `/music` 作为「纯歌单页」的独立入口。

## 2. 关键决策（已与用户确认）

1. **完整歌单**：首页 Hero 下方放完整歌单（全部复制/播放/排序/筛选功能可用），不是预览。
2. **保留 `/music` 双入口**：首页与 `/music` 共享同一份歌单组件；导航栏「歌单」仍跳转 `/music`（纯歌单页体验）。
3. **Hero CTA → 平滑滚动**：首页 Hero「进入歌单」按钮点击后平滑滚动到首页歌单区（同页，无加载），不再跳转 `/music`。
4. **实现路径 A**：抽取共享 Astro 组件 `SongListSection.astro`，首页与 `/music` 同时复用，保证两处永远一致。
5. **附带修复**：顺带修 `SongList` 内 sticky 筛选条被固定导航遮挡的既有瑕疵（`top-2` → `top-20`）。

## 3. 可行性依据

- `html { scroll-behavior: smooth }` 已在 `global.css:97` 全局生效 → Hero 按钮改为 `<a href="#songs">` 天然平滑滚动，无需 JS。
- `AnniversaryCards` 是 `position: fixed` 浮层（生日/出道日卡片），不在文档流 → 首页加歌单无需调整它们。
- `SongList` 是纯 props 组件（`{ songs: Song[] }`），可直接复用；内部已含 sticky 筛选条、随机、复制、三态排序全套功能。
- `prefers-reduced-motion` 已兼容（`global.css:665`），smooth 滚动会自动降级为瞬移。

## 4. 架构

```
index.astro   <Hero/> + <SongListSection showBackLink={false} />   ← 首页内嵌
music.astro   <SongListSection showBackLink={true} />              ← 独立页（重构）
Hero CTA      href="/music" → href="#songs"
```

两个页面共用同一个 `SongListSection`，歌单区单一来源、永远一致。

## 5. 组件设计：`src/components/astro/SongListSection.astro`

封装 `/music` 现有的「页头 + SongList + PersistentPlayer」。

**Props**：

| Prop | 类型 | 默认 | 作用 |
|---|---|---|---|
| `showBackLink` | `boolean` | `false` | `true` 显示「返回首页」链接（用于 `/music`）；`false` 隐藏（用于首页） |
| `anchorId` | `string` | `'songs'` | 歌单区容器 id，供 Hero 按钮与锚点滚动定位 |

**标题级别**：`showBackLink === true`（独立 `/music`，无 Hero）→ 渲染 `<h1>`；`false`（首页，Hero 已占 h1「克罗雅」）→ 渲染 `<h2>`。保证每个页面只有一个 `h1`，SEO 与无障碍标题层级正确。

**结构骨架**：

```astro
---
import SongList from '../react/SongList';
import PersistentPlayer from '../react/PersistentPlayer';
import songs from '../../data/songs.json';
import { ArrowLeft, Music as MusicIcon } from 'lucide-react';

interface Props { showBackLink?: boolean; anchorId?: string }
const { showBackLink = false, anchorId = 'songs' } = Astro.props;
const Title = showBackLink ? 'h1' : 'h2';
---
<section id={anchorId} style="background: var(--bg-primary);">
  <div class="max-w-4xl mx-auto px-4 py-8">
    {showBackLink && <a href="/" class="...">返回首页</a>}
    <Title class="...">歌单（{songs.length}首）</Title>
    <p class="...">说明文字（与现 /music 一致）</p>
  </div>
  <SongList client:visible songs={songs} />
  <PersistentPlayer client:idle />
</section>
```

## 6. Hero CTA 改动（`src/components/astro/Hero.astro:130-142`）

- `href="/music"` → `href="#songs"`
- 图标 `ArrowRight` → `ArrowDown`（视觉暗示「向下滚动」），`group-hover:translate-x-1` → `group-hover:translate-y-1`
- 文字「进入歌单」、玻璃态样式、hover/active 缩放与 glow 效果保持不变
- `lucide-react` 的 import 同步调整（移除 `ArrowRight`，加入 `ArrowDown`）

## 7. CSS 改动（`src/styles/global.css`）

**a) 锚点避让固定导航**（本次新增）：

固定顶部导航（桌面 64~80px）会遮住滚动目标。在现有 `html { scroll-behavior: smooth; overflow-x: hidden; }` 规则中追加：

```css
html {
  scroll-behavior: smooth;
  overflow-x: hidden;
  scroll-padding-top: 5rem;   /* 新增：锚点跳转预留顶部导航高度 */
}
```

**b) 顺带修复 sticky 筛选条遮挡**（`SongList.tsx` 内 FilterBar 容器）：

现状：`<div class="sticky top-2 z-20 mb-4">`（`SongList.tsx:78`）会被全局固定导航（z-50）盖住。改为：

```diff
- <div class="sticky top-2 z-20 mb-4">
+ <div class="sticky top-20 z-30 mb-4">
```

`top-20`（5rem）贴合导航栏高度，`z-30` 提升到导航之下、内容之上。此修复同时改善首页与 `/music` 两处。

## 8. 水合（hydration）策略

Astro 的 `client:*` 指令在编译时静态分析，无法通过 prop 动态切换，故 `SongListSection` 内部固定：

- `<SongList client:visible>` —— 首页滚到歌单区才水合，不拖累首屏；`/music` 打开时歌单已在视口内，立即触发，体验等同原 `client:load` 且更省。
- `<PersistentPlayer client:idle>` —— 浏览器空闲时加载，不阻塞首屏。

> **行为变化**：`/music` 的 `SongList` 由 `client:load` → `client:visible`。因视口内立即触发，用户无感知差异，性能更优。

## 9. 测试

沿用项目既有 `vitest`（单测）+ `playwright`（e2e）体系。

**e2e 新增/调整**：

- 首页向下滚动后能见到歌单内容（歌单行可见）
- 点击首页 Hero「进入歌单」按钮 → 平滑滚动到 `#songs`（断言 URL 含 `#songs` 或歌单区在视口）
- `/music` 仍正常：返回首页链接存在且跳转 `/`；复制、随机、三态排序、筛选均工作
- 桌面/移动导航栏「歌单」点击仍跳转 `/music`
- **风险点**：最近提交 `9a64ae8 test(e2e): 修复 music/responsive 选择器` 表明已有 music 相关 e2e。重构 `SongListSection` 时须同步检查现有 music e2e 选择器（标题、返回链接等）不被破坏；DOM 类名与 `data-testid` 保持兼容。

## 10. SEO

- 首页与 `/music` 都含完整歌单 DOM（Astro SSR 已渲染 React 组件）。两页整体结构不同（首页 Hero + 浮层卡片 vs `/music` 纯歌单 + 返回链接），且 `BaseLayout` 已用 `Astro.url.pathname` 为每页生成指向自身的 canonical → 不构成重复内容问题。
- 首页 `h1` 仍为「克罗雅」，歌单区降为 `h2`，标题层级正确。
- 无需额外 canonical 调整。

## 11. 边界与不在范围（YAGNI）

- 不改 Hero 的 `h-screen` 高度与 `pt-16 md:pt-20` 既有布局（Hero 略高于可视区是既有现象，与本次无关）。
- 不处理 `PersistentPlayer` 与移动端底部导航的浮层重叠（既有，与本次无关）。
- 不引入 scroll-snap 吸附滚动、不加入场动画——保持自然滚动，符合「往下滚即见」的朴素预期。
- 不删除 `/music` 路由，不加重定向（已确认双入口）。
- 不预加载/懒加载 songs 数据（仍静态 import JSON，与现有一致）。

## 12. 受影响文件清单

| 文件 | 改动 |
|---|---|
| `src/components/astro/SongListSection.astro` | **新建**：共享歌单区组件 |
| `src/pages/index.astro` | 在 `<Hero/>` 后加 `<SongListSection showBackLink={false} />` |
| `src/pages/music.astro` | 用 `<SongListSection showBackLink={true} />` 替换内联结构 |
| `src/components/astro/Hero.astro` | CTA `href` 与图标改动（第 130-142 行 + import） |
| `src/styles/global.css` | `html` 加 `scroll-padding-top: 5rem` |
| `src/components/react/SongList.tsx` | FilterBar 容器 `top-2 z-20` → `top-20 z-30`（第 78 行） |
| e2e 测试 | 新增首页滚动/CTA 用例；核查现有 music e2e 选择器 |
