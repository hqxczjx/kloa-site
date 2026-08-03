# 性能优化设计（Lighthouse 67 → 桌面 90+）

- **日期**：2026-08-03
- **状态**：已确认，待实现
- **范围**：P0→P2 全部（字体、LCP 图片、水合、预取、拼音预生成）

## 1. 背景与根因

Lighthouse 桌面性能分 67。核对源码后确认主因**不是** JS 执行（TBT 已 0ms、CLS 0.001），而是：

1. **首屏远程字体阻塞**：`BaseLayout.astro:39` 同步加载 `fonts.loli.net` 的 Noto Sans SC（4 字重）+ Noto Serif SC（2 字重），`<link rel="stylesheet">` 本身渲染阻塞，`display=swap` 无法挽救。字体占总传输约 88%（~1.4 MiB / 24 请求）。
2. **LCP 图片被当懒加载**：`Hero.astro:105` 的 `<Picture>` 未设 `loading`/`fetchpriority`，Astro 默认 `loading="lazy"`，首屏立绘（LCP 元素）优先级错误。
3. **水合不一致**：`AnniversaryCard.tsx` 渲染期用 `new Date()` 算天数；`ThemeToggle.tsx` 初始 state 读 window。SSG HTML 与客户端首次 render 必然不符。
4. **预取过激**：`astro.config.mjs` `prefetchAll:true + viewport` 首屏预取全部页面，触发 503 与 307。
5. **歌单包过大**：`SongList.js` 290 KB（未压缩），浏览器端 `pinyin-pro` 是主嫌疑。

现有 `__tests__/unit/optimizations/font-loading.test.ts:23` 把普通 `rel="stylesheet"` 误断言为"异步加载"，是假阳性，需一并修正。

## 2. 目标与验收

| 指标 | 目标 |
|---|---|
| 桌面 FCP | ≤ 1.0s |
| 桌面 LCP | ≤ 1.8s |
| 移动端 LCP | ≤ 2.5s |
| 控制台 | 无水合错误、无预取 503/307 |
| 构建 | `bun run build` 0 错 0 警告 0 提示 |
| 测试 | `bun run test:run` 全绿 |

复测方式：无扩展浏览器，桌面/移动各 3 次取中位数。

## 3. 现状基线（dist 实测，未压缩）

- `SongList.CjivgauH.js`：**290 KB**（歌单岛，含 pinyin-pro）
- `client.Dwl67fpr.js`：176 KB（Astro client runtime）
- `BaseLayout.*.css`：52.7 KB（gzip ~9.6 KB，无需动）
- LCP 图片：AVIF 22 KB / WebP 36-50 KB（压缩已达标，不动原图）
- 总 JS：542 KB / 17 文件

## 4. 设计方案

### P0-1 字体：混合方案（系统正文 + 标题本地子集）

**正文**：`src/styles/global.css:47`
```
--font-sans: "Noto Sans SC", system-ui, sans-serif;
```
改为系统中文字栈，删除 Noto Sans SC：
```
--font-sans: "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", "Source Han Sans SC", "Noto Sans CJK SC", system-ui, sans-serif;
```

**标题**：`--font-serif` 保留 Noto Serif SC，但改为**本地 woff2 子集**。在 `global.css` 顶部（`@import "tailwindcss";` 之后）新增 `@font-face`：
```css
@font-face {
  font-family: "Noto Serif SC";
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url("/fonts/noto-serif-sc-700.woff2") format("woff2");
  unicode-range: U+0000-00FF, U+2014, U+3000-303F, U+4E00-9FFF;
}
```
（600 字重同理，`noto-serif-sc-600.woff2`。`unicode-range` 限定中文/标点/基本拉丁，子集已只含必要字形，此处再保险一道。）

`--font-serif` 值保持 `"Noto Serif SC", serif` 不变（`@font-face` 已把该名指向本地子集；缺字时回退 `serif`）。

**移除远程加载**：删除 `BaseLayout.astro:35-39` 的注释 + `preconnect` + 同步 `<link rel="stylesheet">` 整段。

#### 子集生成（路线 B：fontmin）

新增脚本 `scripts/generate-font-subset.mjs`，**一次性本地运行**，产物提交到 `public/fonts/`：

1. **取源字体**：从 [notofonts/noto-cjk](https://github.com/notofonts/noto-cjk) 下载 Noto Serif SC 的 OTF（构建机首次运行，或手工放入 `scripts/fonts/` 缓存）。源字体不入 git（`.gitignore` 加 `scripts/fonts/`）。
2. **收集字符集**：脚本扫描 `src/**/*.{astro,tsx}` 中所有 `font-serif` class 与 `h1`-`h6` 的文本内容，去重汇总；再硬编码补充 AnniversaryCard 的动态字符（`生日出道日距离纪念日天` + 数字 `0-9` + 连字符 `-` + `Kloa` 拉丁字母）。最终 `text` 串作为 fontmin 子集输入。
3. **子集化**：`fontmin` 的 `glyph({ text })` 生成 600/700 两个字重的子集 ttf，再用 `ttf2woff2` 转 woff2，输出到 `public/fonts/noto-serif-sc-{600,700}.woff2`。
4. **package.json**：`devDependencies` 加 `fontmin`、`ttf2woff2`；`scripts` 加 `"gen:fonts": "node scripts/generate-font-subset.mjs"`。

产物 woff2 预计每个字重 8-15 KB（全站标题去重约 30-40 汉字 + 数字/拉丁），合计 ~20-30 KB，比 1.4 MiB 降约 98%。

**字符集种子（脚本硬编码部分，静态扫描部分由脚本自动补全）**：
```
克罗雅 Kloa 关于本站 本站声明 开发者碎碎念 联系方式
生日 出道日 距离 纪念日 天 0123456789 -
```
（Soundboard / SongListSection 等其余标题文字由脚本扫描 src 自动纳入，不在此手工列举。）

### P0-2 LCP 图片优先级

`src/components/astro/Hero.astro:105` 的 `<Picture>` 增加：
```astro
loading="eager"
fetchpriority="high"
```
不改 `widths`/`sizes`/`formats`（AVIF/WebP/srcset/宽高均正确）。Astro `<Picture>` 透传原生 img 属性，可直接写 `fetchpriority`（HTML 小写）。

### P1-1 AnniversaryCard 水合

`src/components/react/AnniversaryCard.tsx`：天数渲染改为**稳定占位**：
- 组件增加 `const [days, setDays] = useState<number | null>(null)`。
- `useEffect` 内完成 `nextOccurrence` + `daysUntilNext` 全部计算（这两者都依赖"今天" `new Date()`）并 `setDays`。
- 渲染：`{days === null ? '—' : `${days} 天`}`。
- **渲染期不得出现任何 `new Date()`**：`daysUntilNext` 与 `nextOccurrence` 的原 `useMemo` 整体移入 `useEffect`。仅 `formatDate`（用 `new Date(date)`，`date` 是固定 prop，不取"今天"）可保留渲染期 `useMemo`。

效果：SSG HTML 与客户端首次 render 都输出 `—`，水合一致；挂载后填入真实天数。`formatDate`（如 `2026-07-19`）依赖固定 `date` prop，SSR/客户端一致。

### P1-2 ThemeToggle 水合

`src/components/ui/ThemeToggle.tsx:5`：初始 state 改为**永远返回 `true`**（与 SSR 输出一致）：
```ts
const [isAngelMode, setIsAngelMode] = useState(true);
```
真实主题由现有 `useEffect` 的 `syncTheme()` 在挂载后同步（已有逻辑，保留）。按钮根元素加 `suppressHydrationWarning`：
```tsx
<button suppressHydrationWarning onClick={toggleTheme} ...>
```
理由：`BaseLayout.astro:40` 的 inline script 已在水合前给 `<html>` 加 `.dark`，故页面背景不闪；但按钮的 `aria-label`/滑块位置/背景渐变会与 SSR（恒天使态）不符，`suppressHydrationWarning` 消除该告警。视觉上深色偏好用户会看到按钮从天使态一次性切到恶魔态，可接受（背景无闪烁）。

### P1-3 预取收敛

`astro.config.mjs`：
```js
prefetch: {
  prefetchAll: false,
  defaultStrategy: 'hover',
},
```
导航链接加尾斜杠（`BaseLayout.astro` 桌面 nav `:67-70`、移动 nav `:83-98`、Hero soundboard 按钮 `:178`）：`/music/`、`/soundboard/`、`/about/`，消除 307 跳转。

Cloudflare 对并发预取的 503 限流无法从代码侧直接修复；关闭 `prefetchAll` 后无效并发请求消除，问题应随之消失。交付清单会标注请你上线后确认。

### P2 pinyin 预生成（删浏览器端 pinyin-pro）

**方案：服务端 frontmatter 预计算，客户端不再 import。**

1. `src/components/astro/SongListSection.astro` frontmatter（服务端执行）：`import { pinyin } from 'pinyin-pro'`，读取 `songs.json` 后 `map` 每首歌追加 `titlePinyin`/`artistPinyin`（`pinyin(text, { toneType:'none', type:'array' }).join('').toLowerCase()`），作为 `songs` 传给 `<SongList>`。
2. `src/components/react/songlist/utils.ts`：删除 `import { pinyin } from 'pinyin-pro'` 与 `pinyinCache`/`pinyinKey` 内部计算；`pinyinKey(text, song)` 改为直接返回预计算字段（调用处传入对应字段）。
   - `matchesFilters`：`pinyinKey(song.title)` → `song.titlePinyin`，`pinyinKey(song.artist)` → `song.artistPinyin`。
   - `sortSongs`/`sortKeyValue`：`case 'title'` → `song.titlePinyin`，`case 'artist'` → `song.artistPinyin`。
3. `src/components/react/songlist/types.ts`：`Song` 加 `titlePinyin: string`、`artistPinyin: string`（服务端必填，故非可选，保证客户端类型安全）。
4. `pinyin-pro` **保留在 `dependencies`**（astro 构建服务端要用），但因客户端代码不再 import，不会进浏览器 bundle。预期 `SongList.js` 290 KB → ~130-150 KB。

## 5. 测试计划

- **修正** `__tests__/unit/optimizations/font-loading.test.ts`：
  - 删除第 23-27 行"stylesheet=异步加载"假阳性断言。
  - 改为：断言 `BaseLayout.astro` 不含 `fonts.loli.net`、不含远程 `rel="stylesheet"`；`global.css` 含指向 `/fonts/` 的 `@font-face` 且 `font-display: swap`。
- **新增** AnniversaryCard 初始一致性测试：渲染期 `days === null` → 输出占位 `—`，不触发水合不一致。
- **新增** pinyin 预生成测试：`SongListSection` 注入的 songs 含非空 `titlePinyin`/`artistPinyin`；`utils.matchesFilters` 用预计算字段命中拼音搜索。
- **新增**（可选）构建产物断言：`dist/_astro/SongList.*.js` 不含 `pinyin-pro` 特征串、体积低于阈值。
- 跑 `bun run build` + `bun run test:run` 全绿。

## 6. 风险与回退

| 风险 | 缓解 |
|---|---|
| 标题子集漏字 → 回退 `serif` | 脚本扫描 src 自动收集；`@font-face` 回退 `serif` 兜底 |
| fontmin/ttf2woff2 在构建机装包失败 | 子集是**一次性本地生成**并提交 woff2，CI 不跑该脚本，仅开发机需要 |
| ThemeToggle 深色用户看到按钮一次性切换 | 背景无闪烁（inline script 已处理），仅按钮态切换，可接受 |
| pinyin 预生成漏歌（新增歌曲未算拼音） | 服务端 frontmatter 每次 build 重算，songs.json 改动自动覆盖 |
| 移动端系统字体差异 | 中文字栈覆盖 iOS/Android/Win 主流系统字体，视觉差异可接受 |

**回退**：每节改动相互独立，可单独 revert。字体方案若上线后视觉不可接受，最小回退 = 恢复 `--font-sans` 含 Noto Sans SC + 恢复远程 `<link>`（但性能分会回落）。

## 7. 不做项（明确排除）

- 不压缩 LCP 原图（AVIF 22 KB 已达标）。
- 不大规模清理 `BaseLayout.css`（gzip 9.6 KB，收益小）。
- 不移除 Cloudflare 统计脚本（11 KB，收益小）。
- 不把 about/soundboard 的 `client:load` 改 `client:visible`（它们是各自页面首屏内容，`client:load` 合理）。
- 不识别为项目问题的"42 KB 未使用脚本"（来自 React DevTools 扩展，Lighthouse 误判）。
