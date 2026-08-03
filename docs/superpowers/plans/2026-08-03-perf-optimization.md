# 性能优化实施计划（Lighthouse 67 → 桌面 90+）

> **For agentic workers:** REQUIRED SUB-SKILL: 用 superpowers:executing-plans 逐任务执行。Steps 用 `- [ ]` 跟踪。

**Goal:** 消除首屏字体阻塞、修正 LCP 图片优先级、修复两处水合不一致、收敛预取、删除浏览器端 pinyin-pro，使桌面性能分升至 90+。

**Architecture:** 6 个相互独立的改动，逐个 TDD（先改测试期望→红→改源码→绿→commit）。字体走本地 woff2 子集（fontmin + ttf2woff2），pinyin 计算迁移到 Astro 服务端 frontmatter。

**Tech Stack:** Astro 7.1 + React 19 + Tailwind v4 + Vitest（happy-dom）+ fontmin/ttf2woff2（devDeps，仅开发机）。

**Spec:** `docs/superpowers/specs/2026-08-03-perf-optimization-design.md`

**基线:** 266 个单元测试全绿（commit hook 已验证）。

---

## File Structure

**新建：**
- `scripts/generate-font-subset.mjs` — fontmin 子集生成脚本（一次性，开发机跑）
- `public/fonts/noto-serif-sc-600.woff2` / `noto-serif-sc-700.woff2` — 子集字体产物（入 git）
- `src/components/react/songlist/pinyin.server.ts` — 服务端拼音计算（含 pinyin-pro，不进客户端 bundle）
- `__tests__/unit/optimizations/lcp-image.test.ts` — LCP 图片优先级源码断言

**修改：**
- `src/styles/global.css` — `--font-sans` 系统栈；新增 `@font-face` 指向本地 woff2
- `src/layouts/BaseLayout.astro` — 删除远程字体 `<link>` / preconnect；导航链接加尾斜杠
- `src/components/astro/Hero.astro:105` — `<Picture>` 加 `loading="eager" fetchpriority="high"`
- `src/components/react/AnniversaryCard.tsx` — 天数改 useEffect 占位
- `src/components/ui/ThemeToggle.tsx` — 初始 state 恒 true + `suppressHydrationWarning`
- `astro.config.mjs` — `prefetchAll:false` + `defaultStrategy:'hover'`
- `src/components/react/songlist/types.ts` — Song 加 `titlePinyin/artistPinyin`
- `src/components/react/songlist/utils.ts` — 删 pinyin-pro import，改用预计算字段
- `src/components/astro/SongListSection.astro` — frontmatter 服务端算拼音注入
- `package.json` — devDeps 加 fontmin/ttf2woff2；scripts 加 gen:fonts；.gitignore 加 scripts/fonts/
- 4 个测试文件更新断言（见各 Task）

---

## Task 1: 字体（系统正文 + 标题本地子集）

**风险前置：** 本任务含构建依赖（装包 + 下载源字体 ~8MB），先验证可行性。

**Files:** `scripts/generate-font-subset.mjs`(Create), `src/styles/global.css`(Modify), `src/layouts/BaseLayout.astro`(Modify), `package.json`(Modify), `.gitignore`(Modify), `__tests__/unit/optimizations/font-loading.test.ts`(Modify)

- [ ] **Step 1: 装构建依赖**

```bash
bun add -d fontmin ttf2woff2
```
Expected: 装包成功，`package.json` devDependencies 出现 fontmin、ttf2woff2。

- [ ] **Step 2: 下载 Noto Serif SC 源字体（两个固定字重）**

```bash
mkdir -p scripts/fonts
curl -L -o scripts/fonts/NotoSerifSC-SemiBold.otf \
  https://github.com/notofonts/noto-cjk/raw/main/Serif/OTF/SimplifiedChinese/NotoSerifSC-SemiBold.otf
curl -L -o scripts/fonts/NotoSerifSC-Bold.otf \
  https://github.com/notofonts/noto-cjk/raw/main/Serif/OTF/SimplifiedChinese/NotoSerifSC-Bold.otf
ls -la scripts/fonts/  # 期望两个文件各约 4-8 MB
```
若 GitHub 受阻：fallback 用 `https://github.com/google/fonts/raw/main/ofl/notoserifsc/NotoSerifSC%5Bwght%5D.ttf`（variable），脚本改用固定字重轴实例化。执行时据实调整。

- [ ] **Step 3: `.gitignore` 加 `scripts/fonts/`**（源字体不入库）

- [ ] **Step 4: 写 `scripts/generate-font-subset.mjs`**

```js
// 一次性本地运行：扫描站内标题文字 → fontmin 子集化 → ttf2woff2 转 woff2
import { globSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import Fontmin from 'fontmin';
import ttf2woff2 from 'ttf2woff2';
import { writeFileSync } from 'node:fs';

const ROOT = process.cwd();
const SRC_GLOBS = ['src/**/*.astro', 'src/**/*.tsx'];

// 收集 font-serif / h1-h6 文本
const files = SRC_GLOBS.flatMap((g) => globSync(g));
const chars = new Set('克罗雅Kloa关于本站声明开发者碎碎念联系方式生日出道日距离纪念日天0123456789- ');
for (const f of files) {
  const txt = readFileSync(f, 'utf-8');
  // 抓 font-serif class 元素及 h1-h6 后的中文文本片段
  for (const m of txt.matchAll(/(?:font-serif|<h[1-6])[^>]*>([^<]{0,40})/g)) {
    for (const ch of m[1]) if (/[一-鿿]/.test(ch)) chars.add(ch);
  }
}
const text = [...chars].join('');
console.log('subset chars:', text, `(${text.length})`);

const WEIGHTS = [
  { src: 'scripts/fonts/NotoSerifSC-SemiBold.otf', weight: 600, out: 'public/fonts/noto-serif-sc-600' },
  { src: 'scripts/fonts/NotoSerifSC-Bold.otf', weight: 700, out: 'public/fonts/noto-serif-sc-700' },
];

for (const w of WEIGHTS) {
  await new Promise((resolve, reject) => {
    new Fontmin()
      .src(w.src)
      .use(Fontmin.glyph({ text }))
      .run(async (err, files) => {
        if (err) return reject(err);
        const ttf = files[0].contents;
        const woff2 = ttf2woff2(ttf);
        writeFileSync(`${w.out}.woff2`, woff2);
        console.log(`wrote ${w.out}.woff2`);
        resolve();
      });
  });
}
```

- [ ] **Step 5: 跑脚本生成 woff2**

```bash
node scripts/generate-font-subset.mjs
ls -la public/fonts/  # 期望两个 woff2，各约 8-15 KB
```

- [ ] **Step 6: `src/styles/global.css` 顶部（`@import "tailwindcss";` 后）加 `@font-face`，改 `--font-sans`**

在 `@theme { ... }` 块**之前**插入：
```css
@font-face {
  font-family: "Noto Serif SC";
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url("/fonts/noto-serif-sc-600.woff2") format("woff2");
  unicode-range: U+0020-007E, U+2014, U+3000-303F, U+4E00-9FFF;
}
@font-face {
  font-family: "Noto Serif SC";
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url("/fonts/noto-serif-sc-700.woff2") format("woff2");
  unicode-range: U+0020-007E, U+2014, U+3000-303F, U+4E00-9FFF;
}
```
`@theme` 内改 `--font-sans`（删 Noto Sans SC）：
```css
--font-sans: "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", "Source Han Sans SC", "Noto Sans CJK SC", system-ui, sans-serif;
```

- [ ] **Step 7: 删 `BaseLayout.astro:35-39`**（注释 + preconnect + 同步 `<link rel="stylesheet">` 整段）。

- [ ] **Step 8: 更新 `font-loading.test.ts`（TDD 红→绿）**

删第 3 个测试（"用 `<link rel="stylesheet">` 异步加载"假阳性），替换为：
```ts
it('BaseLayout 不再加载远程字体（无 fonts.loli.net、无渲染阻塞 stylesheet）', () => {
  const layout = readSrc('src/layouts/BaseLayout.astro');
  expect(layout).not.toMatch(/fonts\.loli\.net/);
  expect(layout).not.toMatch(/rel="stylesheet"\s+href="https?:\/\/fonts\./);
});

it('global.css 用本地 @font-face 子集 + font-display:swap', () => {
  const css = readSrc('src/styles/global.css');
  expect(css).toMatch(/url\("\/fonts\/noto-serif-sc-700\.woff2"\)/);
  expect(css).toMatch(/font-display:\s*swap/);
  expect(css).not.toMatch(/Noto Sans SC/);
});
```

- [ ] **Step 9: 跑测试 + 构建验证**

```bash
bun run test:run -- font-loading
bun run build
```
Expected: font-loading 测试绿；build 0 错误；`dist/index.html` 不含 `fonts.loli.net`。

- [ ] **Step 10: Commit**

```bash
git add scripts/ src/styles/global.css src/layouts/BaseLayout.astro public/fonts/ __tests__/unit/optimizations/font-loading.test.ts package.json .gitignore
git commit -F - <<'EOF'
perf(fonts): 正文系统字栈 + 标题本地 woff2 子集，消除首屏字体阻塞
EOF
```

---

## Task 2: LCP 图片优先级

**Files:** `src/components/astro/Hero.astro:105`(Modify), `__tests__/unit/optimizations/lcp-image.test.ts`(Create)

- [ ] **Step 1: 写失败测试 `__tests__/unit/optimizations/lcp-image.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../../..');
const readSrc = (rel: string): string => readFileSync(join(ROOT, rel), 'utf-8');

describe('LCP 图片优先级', () => {
  it('角色立绘（LCP）禁止懒加载并设高优先级', () => {
    const hero = readSrc('src/components/astro/Hero.astro');
    expect(hero).toMatch(/loading="eager"/);
    expect(hero).toMatch(/fetchpriority="high"/i);
  });
});
```

- [ ] **Step 2: 跑红** `bun run test:run -- lcp-image` → Expected FAIL。

- [ ] **Step 3: 改 `Hero.astro:105` `<Picture>` 加属性**

```astro
<Picture
  src={characterImg}
  alt="克罗雅角色立绘"
  formats={['avif', 'webp']}
  widths={[256, 384, 512]}
  sizes="(min-width: 768px) 400px, 288px"
  loading="eager"
  fetchpriority="high"
  class="w-full h-full object-contain"
/>
```

- [ ] **Step 4: 跑绿** `bun run test:run -- lcp-image` → Expected PASS。

- [ ] **Step 5: Commit**

```bash
git add src/components/astro/Hero.astro __tests__/unit/optimizations/lcp-image.test.ts
git commit -F - <<'EOF'
perf(lcp): 角色立绘 eager + fetchpriority=high，修正 LCP 优先级
EOF
```

---

## Task 3: AnniversaryCard 水合修复

**Files:** `src/components/react/AnniversaryCard.tsx`(Modify), `__tests__/unit/components/AnniversaryCard.test.tsx`(Modify)

- [ ] **Step 1: 改测试 3、4 为 async（初始占位，effect 后填值）**

`AnniversaryCard.test.tsx` 第 37-52、54-69 两个测试：把 `screen.getByText(/天$/)` 改为 `await screen.findByText(/天$/)`，函数标记 `async`：
```tsx
it('应该显示距离下一个纪念日的天数', async () => {
  const pastDate = new Date();
  pastDate.setFullYear(pastDate.getFullYear() - 1);
  render(<AnniversaryCard date={pastDate} label="生日" icon={<Cake className="w-5 h-5" />} />);
  expect(screen.getByText(/距离生日纪念日/)).toBeInTheDocument();
  expect(await screen.findByText(/天$/)).toBeInTheDocument();
});
```
（出道日测试同理。）

- [ ] **Step 2: 跑红** `bun run test:run -- AnniversaryCard` → Expected FAIL（当前同步算天数，findByText 仍能找到？实际当前实现同步渲染天数，findByText 会立即命中 → 测试仍绿。需先确认红）。
  **注意：** 当前实现渲染期就有天数，改测试后仍绿——故此任务先改测试不会红。改为先改实现（Step 3），再让测试用 findByText 容纳异步。**调整顺序：先改实现，再改测试。**

- [ ] **Step 3: 改 `AnniversaryCard.tsx`（天数移入 useEffect，初始 null → 占位）**

```tsx
import { useMemo, useState, useEffect } from 'react';
import type { ReactElement } from 'react';

interface AnniversaryCardProps {
  date: Date;
  label: string;
  icon: ReactElement;
  className?: string;
}

export default function AnniversaryCard({ date, label, icon, className = '' }: AnniversaryCardProps) {
  const [days, setDays] = useState<number | null>(null);

  const formatDate = useMemo(() => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [date]);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setFullYear(today.getFullYear());
    if (nextDate < today) {
      nextDate.setFullYear(today.getFullYear() + 1);
    }
    setDays(Math.floor((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  }, [date]);

  return (
    <div
      className={`fixed glass rounded-2xl p-4 backdrop-blur-md bg-white/10 dark:bg-slate-900/10 border border-white/20 dark:border-white/5 shadow-lg hover:scale-105 transition-transform duration-300 animate-fade-up ${className}`}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
      </div>

      <div className="mb-2">
        <div className="text-2xl font-bold font-serif" style={{ color: 'var(--text-primary)' }}>
          {formatDate}
        </div>
      </div>

      <div>
        <div className="text-xs opacity-75">距离{label}纪念日</div>
        <div className="text-2xl font-bold font-serif" style={{ color: 'var(--text-primary)' }}>
          {days === null ? '—' : `${days} 天`}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 改测试 3、4 为 async + findByText**（如 Step 1 代码）。此时初始渲染为 `—`，`getByText(/天$/)` 会失败 → 必须用 `await findByText`。跑测试验证。

- [ ] **Step 5: 跑绿** `bun run test:run -- AnniversaryCard` → Expected 5 tests PASS。

- [ ] **Step 6: Commit**

```bash
git add src/components/react/AnniversaryCard.tsx __tests__/unit/components/AnniversaryCard.test.tsx
git commit -F - <<'EOF'
fix(hydration): AnniversaryCard 天数改挂载后计算，消除 SSR/客户端不一致
EOF
```

---

## Task 4: ThemeToggle 水合修复

**Files:** `src/components/ui/ThemeToggle.tsx`(Modify)。测试不变（26 个测 effect flush 后的态，改动透明）。

- [ ] **Step 1: 改 `ThemeToggle.tsx`**

第 5-17 行初始 state 改为恒 `true`：
```tsx
const [isAngelMode, setIsAngelMode] = useState(true);
```
（删除原 `() => { if typeof window... }` 初始化函数。useEffect 保留 `syncTheme`。）

第 95 行 `<button>` 加 `suppressHydrationWarning`：
```tsx
<button
  suppressHydrationWarning
  onClick={toggleTheme}
  onKeyDown={handleKeyDown}
  className="..."
```

- [ ] **Step 2: 跑测试** `bun run test:run -- ThemeToggle` → Expected 26 tests PASS（若失败，逐个排查；预期透明）。

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/ThemeToggle.tsx
git commit -F - <<'EOF'
fix(hydration): ThemeToggle 初始 state 恒天使态 + suppressHydrationWarning
EOF
```

---

## Task 5: 预取收敛

**Files:** `astro.config.mjs`(Modify), `src/layouts/BaseLayout.astro`(Modify 导航链接), `__tests__/unit/optimizations/prefetch.test.ts`(Modify)

- [ ] **Step 1: 改 `prefetch.test.ts` 断言（TDD 红）**

第 15-17 行：
```ts
it('prefetch 关闭全量预取（prefetchAll:false）', () => {
  expect(readSrc('astro.config.mjs')).toMatch(/prefetchAll\s*:\s*false/);
});
```

- [ ] **Step 2: 跑红** `bun run test:run -- prefetch` → Expected FAIL（当前 true）。

- [ ] **Step 3: 改 `astro.config.mjs`**

```js
prefetch: {
  prefetchAll: false,
  defaultStrategy: 'hover',
},
```

- [ ] **Step 4: 改 `BaseLayout.astro` 导航链接加尾斜杠**

桌面 nav（`/music`→`/music/`、`/soundboard`→`/soundboard/`、`/about`→`/about/`），移动 nav 同理。`Hero.astro:178` soundboard 按钮也改 `/soundboard/`。

- [ ] **Step 5: 跑绿** `bun run test:run -- prefetch` → Expected PASS。

- [ ] **Step 6: Commit**

```bash
git add astro.config.mjs src/layouts/BaseLayout.astro src/components/astro/Hero.astro __tests__/unit/optimizations/prefetch.test.ts
git commit -F - <<'EOF'
perf(prefetch): 关 prefetchAll 改 hover + 导航尾斜杠，消除 503/307
EOF
```

---

## Task 6: pinyin 预生成（删浏览器端 pinyin-pro）

**Files:** `src/components/react/songlist/pinyin.server.ts`(Create), `src/components/react/songlist/types.ts`(Modify), `src/components/react/songlist/utils.ts`(Modify), `src/components/astro/SongListSection.astro`(Modify), `__tests__/unit/components/songlist-pinyin.test.ts`(Modify), `__tests__/unit/components/songlist-utils.test.ts`(Modify)

- [ ] **Step 1: 新建 `src/components/react/songlist/pinyin.server.ts`**

```ts
import { pinyin } from 'pinyin-pro';

const PINYIN_OPTS = { toneType: 'none', type: 'array' } as const;

/** 服务端专用：中文→无声调拼音。仅被 .astro frontmatter import，不进客户端 bundle。 */
export function pinyinKey(text: string): string {
  return pinyin(text, PINYIN_OPTS).join('').toLowerCase();
}
```

- [ ] **Step 2: `types.ts` Song 加字段**

```ts
titlePinyin: string;
artistPinyin: string;
```
（先读 `types.ts` 确认 Song 结构，加这两个必填字段。）

- [ ] **Step 3: 改 `utils.ts`**

删 `import { pinyin } from 'pinyin-pro'`、`PINYIN_OPTS`、`pinyinCache`、`pinyinKey` 函数。改：
```ts
// matchesFilters 末尾：
return song.titlePinyin.includes(q) || song.artistPinyin.includes(q);

// sortKeyValue：
case 'title': return song.titlePinyin;
case 'artist': return song.artistPinyin;
```

- [ ] **Step 4: 改 `SongListSection.astro` frontmatter 注入拼音**

frontmatter 加：
```ts
import { pinyinKey } from '../react/songlist/pinyin.server';
// 读取 songs 后：
const songs = rawSongs.map((s) => ({
  ...s,
  titlePinyin: pinyinKey(s.title),
  artistPinyin: pinyinKey(s.artist),
}));
```
（执行时先读 SongListSection.astro 确认 songs 读取方式，原地改。）

- [ ] **Step 5: 改 `songlist-pinyin.test.ts` import 来源**

```ts
import { pinyinKey } from '../../../src/components/react/songlist/pinyin.server';
```
（测试体不变：`pinyinKey('大鱼')==='dayu'`、`pinyinKey('Lemon')==='lemon'` 仍成立。）

- [ ] **Step 6: 改 `songlist-utils.test.ts`**

- 删 `import { pinyin } from 'pinyin-pro'`、`vi.mock('pinyin-pro', ...)`、`beforeEach` 里的 pinyin mock。
- import 列表删 `pinyinKey`，删 `pinyinKey` describe 块。
- fixture 加默认字段：
```ts
const s = (over: Partial<Song>): Song => ({
  title: 'T', artist: 'A', titlePinyin: 'tp', artistPinyin: 'ap',
  languages: [], genres: [], gifts: [], ...over,
});
```
- 拼音匹配测试：
```ts
it('搜索：拼音匹配', () => {
  expect(matchesFilters(s({ title: '大鱼', titlePinyin: 'dayu' }), { query: 'dayu', languages: [], genres: [], scOnly: false })).toBe(true);
});
```
- 排序测试 fixture 加 titlePinyin：
```ts
s({ title: '晴天', artist: '周杰伦', titlePinyin: 'qingtian', languages: ['国语'] }),
s({ title: '阿城', artist: '阿妹', titlePinyin: 'acheng', languages: ['国语'] }),
s({ title: 'Bad', artist: 'B', titlePinyin: 'bad', languages: ['英语'] }),
```
（期望 `['阿城','晴天']` 不变：'acheng' < 'qingtian'。）

- [ ] **Step 7: 跑测试** `bun run test:run -- songlist` → Expected 全绿。

- [ ] **Step 8: 构建验证 bundle 缩小**

```bash
bun run build
ls -laS dist/_astro/*.js | head -5  # SongList.*.js 应从 290KB 降到 ~130-150KB
```
验证 `dist/_astro/SongList.*.js` 不再含 pinyin-pro（grep 体积明显下降即可）。

- [ ] **Step 9: Commit**

```bash
git add src/components/react/songlist/ src/components/astro/SongListSection.astro __tests__/unit/components/songlist-pinyin.test.ts __tests__/unit/components/songlist-utils.test.ts
git commit -F - <<'EOF'
perf(bundle): pinyin 预生成迁移服务端，删浏览器端 pinyin-pro（~150KB）
EOF
```

---

## Task 7: 最终验证

- [ ] **Step 1: 全量构建** `bun run build` → Expected 0 错 0 警告 0 提示。
- [ ] **Step 2: 全量测试** `bun run test:run` → Expected 全绿（原 266 + 新增 lcp-image 等，调整后的总数）。
- [ ] **Step 3: 验收清单**
  - `dist/index.html` 不含 `fonts.loli.net`
  - `dist/_astro/SongList.*.js` < 160KB
  - `public/fonts/*.woff2` 存在且各 < 20KB
  - 控制台无水合错误（需浏览器实跑，交付清单标注）
- [ ] **Step 4: 更新 `docs/superpowers/specs/2026-08-03-perf-optimization-design.md` 状态为「已实现」**（可选）。

---

## 交付清单（需用户上线后确认）

1. 无扩展浏览器复测 Lighthouse（桌面/移动各 3 次中位数）：桌面 FCP≤1.0s/LCP≤1.8s，移动 LCP≤2.5s。
2. Cloudflare 控制台确认关闭 prefetchAll 后不再出现预取 503。
3. 控制台无 React 水合警告。
