# 独轮车弹幕复制页 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用「独轮车弹幕复制页」(`/danmaku/`，一个克罗雅应援弹幕文案库 + 一键复制) 完全替换原 `/soundboard/` 语音音效板。

**Architecture:** 镜像现有 soundboard 的三件套——`pages/danmaku.astro` + `components/react/DanmakuBoard.tsx (client:load)` + `data/danmaku.ts`。组件复用站点的 glass + 天使粉/恶魔蓝视觉与胶囊筛选 UI，把「播放语音」换成「复制文案到剪贴板 + Sonner toast」。最后删除旧 soundboard 文件与残留引用。

**Tech Stack:** Astro 7、React 19 (`@astrojs/react`)、Tailwind v4、vitest + @testing-library/react、sonner、lucide-react。

**Spec:** `docs/superpowers/specs/2026-08-05-danmaku-copy-design.md`

---

## 文件结构

| 动作 | 文件 | 职责 |
|---|---|---|
| Create | `src/data/danmaku.ts` | 类型 + 示例文案数据（15 条，分应援/整活/纪念） |
| Create | `src/components/react/DanmakuBoard.tsx` | 主组件：分类筛选 + 文案卡片 + 复制逻辑 |
| Create | `src/pages/danmaku.astro` | 页面：BaseLayout + DanmakuBoard |
| Create | `__tests__/unit/data/danmaku.test.ts` | 数据结构校验 |
| Create | `__tests__/unit/components/DanmakuBoard.test.tsx` | 组件行为测试 |
| Modify | `src/layouts/BaseLayout.astro` | 导航第 3 项 Button→独轮车，路由/图标迁移 |
| Modify | `src/components/astro/Hero.astro` | 首页入口卡片迁移到 /danmaku/ |
| Modify | `__tests__/unit/optimizations/dependencies.test.ts` | 删除对 Soundboard.tsx 的引用 |
| Delete | `src/pages/soundboard.astro` / `src/components/react/Soundboard.tsx` / `src/data/voices.ts` | 旧 soundboard 全部移除 |

---

## Task 1: 创建数据文件 `src/data/danmaku.ts`

**Files:**
- Create: `src/data/danmaku.ts`
- Test: `__tests__/unit/data/danmaku.test.ts`

- [ ] **Step 1: 写失败的数据校验测试**

Create `__tests__/unit/data/danmaku.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { danmaku, type DanmakuCategory } from '../../../src/data/danmaku';

const validCategories: DanmakuCategory[] = ['cheer', 'meme', 'memorial'];

describe('danmaku 数据', () => {
  it('每条都有非空 id / text 与合法 category', () => {
    for (const d of danmaku) {
      expect(typeof d.id).toBe('string');
      expect(d.id.length).toBeGreaterThan(0);
      expect(typeof d.text).toBe('string');
      expect(d.text.length).toBeGreaterThan(0);
      expect(validCategories).toContain(d.category);
    }
  });

  it('id 全局唯一', () => {
    const ids = danmaku.map(d => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('三个分类都有内容', () => {
    for (const c of validCategories) {
      expect(danmaku.filter(d => d.category === c).length).toBeGreaterThan(0);
    }
  });

  it('至少一条超过 20 字（覆盖超限提示分支）', () => {
    expect(danmaku.some(d => d.text.length > 20)).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npx vitest run __tests__/unit/data/danmaku.test.ts`
Expected: FAIL — `Failed to resolve import "../../../src/data/danmaku"`（文件还不存在）

- [ ] **Step 3: 创建数据文件**

Create `src/data/danmaku.ts`:

```ts
export type DanmakuCategory = 'cheer' | 'meme' | 'memorial';

export interface DanmakuItem {
  id: string;
  text: string;
  category: DanmakuCategory;
  note?: string;
}

// 示例文案，后续替换为真实应援弹幕。普通弹幕上限 20 字，超长条用 note 标注。
export const danmaku: DanmakuItem[] = [
  // 应援
  { id: 'cheer-01', text: '克罗雅最可爱！', category: 'cheer' },
  { id: 'cheer-02', text: '克罗雅冲冲冲', category: 'cheer' },
  { id: 'cheer-03', text: '今天也是克罗雅', category: 'cheer' },
  { id: 'cheer-04', text: '克罗雅唱歌真好听', category: 'cheer' },
  { id: 'cheer-05', text: '永远支持克罗雅', category: 'cheer' },
  { id: 'cheer-06', text: '克罗雅贴贴', category: 'cheer' },
  // 整活
  { id: 'meme-01', text: '今天是恶魔阵营', category: 'meme' },
  { id: 'meme-02', text: '天使克罗雅下线了', category: 'meme' },
  { id: 'meme-03', text: '恶魔克罗雅降临', category: 'meme' },
  { id: 'meme-04', text: '这波是克罗雅', category: 'meme' },
  { id: 'meme-05', text: '哈哈哈克罗雅', category: 'meme' },
  // 纪念
  { id: 'memorial-01', text: '克罗雅生日快乐', category: 'memorial' },
  { id: 'memorial-02', text: '与克罗雅相遇的第一天', category: 'memorial' },
  { id: 'memorial-03', text: '克罗雅感谢有你陪伴', category: 'memorial' },
  { id: 'memorial-04', text: '祝我们最爱的克罗雅生日快乐，永远幸福开心每一天！', category: 'memorial', note: '超过20字，需彩色/高级弹幕权限' },
];
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npx vitest run __tests__/unit/data/danmaku.test.ts`
Expected: PASS — 4 tests passed

- [ ] **Step 5: 提交**

```bash
git add src/data/danmaku.ts __tests__/unit/data/danmaku.test.ts
git commit -m "feat(danmaku): 新增弹幕文案数据与结构校验测试"
```

---

## Task 2: DanmakuBoard 组件（TDD）

**Files:**
- Create: `src/components/react/DanmakuBoard.tsx`
- Test: `__tests__/unit/components/DanmakuBoard.test.tsx`

> 环境说明：`__tests__/unit/setup.ts` 已全局 mock `navigator.clipboard.writeText`（返回 resolved promise），故复制测试无需额外 mock clipboard；只需 mock `sonner`。

- [ ] **Step 1: 写失败的组件测试**

Create `__tests__/unit/components/DanmakuBoard.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from 'sonner';
import DanmakuBoard from '../../../src/components/react/DanmakuBoard';
import { danmaku } from '../../../src/data/danmaku';

describe('DanmakuBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (navigator.clipboard.writeText as unknown as ReturnType<typeof vi.fn>).mockClear();
  });

  it('渲染文案', () => {
    render(<DanmakuBoard />);
    expect(screen.getByText(danmaku[0].text)).toBeInTheDocument();
  });

  it('显示分类筛选按钮（全部/应援/整活/纪念）', () => {
    render(<DanmakuBoard />);
    expect(screen.getByRole('button', { name: '应援' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '整活' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '纪念' })).toBeInTheDocument();
  });

  it('点击「整活」只显示整活文案', () => {
    render(<DanmakuBoard />);
    fireEvent.click(screen.getByRole('button', { name: '整活' }));
    const meme = danmaku.find(d => d.category === 'meme')!.text;
    const cheer = danmaku.find(d => d.category === 'cheer')!.text;
    expect(screen.getByText(meme)).toBeInTheDocument();
    expect(screen.queryByText(cheer)).not.toBeInTheDocument();
  });

  it('点击文案卡片复制到剪贴板并提示成功', async () => {
    render(<DanmakuBoard />);
    const first = danmaku[0];
    fireEvent.click(screen.getByRole('button', { name: `复制 ${first.text}` }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('已复制'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(first.text);
  });

  it('超过 20 字的文案标注超限', () => {
    render(<DanmakuBoard />);
    expect(document.querySelector('[data-over-limit="true"]')).toBeInTheDocument();
  });

  it('「复制全部」合并当前筛选文案（换行分隔）', async () => {
    render(<DanmakuBoard />);
    fireEvent.click(screen.getByRole('button', { name: '复制全部' }));
    const expected = danmaku.map(d => d.text).join('\n');
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('已复制'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expected);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `npx vitest run __tests__/unit/components/DanmakuBoard.test.tsx`
Expected: FAIL — `Failed to resolve import ".../DanmakuBoard"`

- [ ] **Step 3: 实现组件**

Create `src/components/react/DanmakuBoard.tsx`:

```tsx
import { useState } from 'react';
import { Copy, Sparkles, Heart, Ghost, Cake } from 'lucide-react';
import { toast } from 'sonner';
import { danmaku, type DanmakuCategory } from '../../data/danmaku';

type Filter = 'all' | DanmakuCategory;

const LIMIT = 20;

const filters: { value: Filter; label: string; icon: typeof Heart }[] = [
  { value: 'all', label: '全部', icon: Sparkles },
  { value: 'cheer', label: '应援', icon: Heart },
  { value: 'meme', label: '整活', icon: Ghost },
  { value: 'memorial', label: '纪念', icon: Cake },
];

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('已复制');
  } catch {
    toast.error('复制失败，请手动选择');
  }
}

export default function DanmakuBoard() {
  const [filter, setFilter] = useState<Filter>('all');
  const filtered = danmaku.filter(d => filter === 'all' || d.category === filter);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 pb-32">
      <h1 className="text-3xl font-serif font-bold text-center mb-8" style={{ color: 'var(--text-primary)' }}>
        独轮车弹幕复制
      </h1>

      <div className="glass rounded-2xl p-6 mb-8">
        <div className="flex flex-wrap gap-3 justify-center mb-6">
          {filters.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all duration-300 ${
                filter === value ? 'bg-gradient-to-r from-pink-500 to-blue-500 text-white shadow-lg' : ''
              }`}
              style={filter !== value ? { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' } : {}}
              aria-label={label}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          <button
            onClick={() => copyText(filtered.map(d => d.text).join('\n'))}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105 active:scale-95 bg-gradient-to-r from-pink-500 to-blue-500 hover:from-pink-600 hover:to-blue-600 shadow-lg"
            aria-label="复制全部"
          >
            <Copy className="w-5 h-5" />
            复制全部
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(d => {
          const over = d.text.length > LIMIT;
          return (
            <button
              key={d.id}
              onClick={() => copyText(d.text)}
              className="glass rounded-2xl p-5 text-left transition-all duration-200 hover:scale-[1.02] active:scale-95 flex flex-col gap-2"
              aria-label={`复制 ${d.text}`}
            >
              <span className="text-base break-all" style={{ color: 'var(--text-primary)' }}>{d.text}</span>
              {d.note && (
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{d.note}</span>
              )}
              <span className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>点击复制</span>
                <span
                  className={`text-xs font-semibold ${over ? 'text-red-500' : ''}`}
                  style={!over ? { color: 'var(--text-secondary)' } : {}}
                  data-over-limit={over ? 'true' : 'false'}
                >
                  {d.text.length}/{LIMIT}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Copy className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-secondary)' }} />
          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>该分类暂无文案</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `npx vitest run __tests__/unit/components/DanmakuBoard.test.tsx`
Expected: PASS — 6 tests passed

- [ ] **Step 5: 提交**

```bash
git add src/components/react/DanmakuBoard.tsx __tests__/unit/components/DanmakuBoard.test.tsx
git commit -m "feat(danmaku): 新增 DanmakuBoard 组件（筛选/复制/字数提示）"
```

---

## Task 3: 页面 `src/pages/danmaku.astro`

**Files:**
- Create: `src/pages/danmaku.astro`

- [ ] **Step 1: 创建页面**

Create `src/pages/danmaku.astro`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import DanmakuBoard from '../components/react/DanmakuBoard';
---

<BaseLayout title="独轮车 · 克罗雅的小网站">
  <DanmakuBoard client:load />
</BaseLayout>
```

- [ ] **Step 2: 类型/诊断检查**

Run: `npm run astro-check`
Expected: 0 errors / 0 warnings（新页面无问题）

- [ ] **Step 3: 提交**

```bash
git add src/pages/danmaku.astro
git commit -m "feat(danmaku): 新增 /danmaku/ 页面"
```

---

## Task 4: BaseLayout 导航迁移

**Files:**
- Modify: `src/layouts/BaseLayout.astro`

- [ ] **Step 1: 修改 lucide-react import（Volume2 → MessageCircle）**

在 `src/layouts/BaseLayout.astro` 找到第 5 行：

```
import { Heart, Music as MusicIcon, User, Volume2, Sparkles } from 'lucide-react';
```

替换为：

```
import { Heart, Music as MusicIcon, User, MessageCircle, Sparkles } from 'lucide-react';
```

- [ ] **Step 2: 桌面导航第 3 项（约第 67 行）**

找到：

```
        <a href="/soundboard/" class="nav-link">Button</a>
```

替换为：

```
        <a href="/danmaku/" class="nav-link">独轮车</a>
```

- [ ] **Step 3: 移动端导航第 3 项（约第 90–93 行）**

找到：

```
      <a href="/soundboard/" class="mobile-nav-link">
        <Volume2 className="w-6 h-6" />
        <span class="text-xs mt-1">Button</span>
      </a>
```

替换为：

```
      <a href="/danmaku/" class="mobile-nav-link">
        <MessageCircle className="w-6 h-6" />
        <span class="text-xs mt-1">独轮车</span>
      </a>
```

- [ ] **Step 4: 验证未留下未使用的 Volume2 引用**

Run: `grep -n "Volume2" src/layouts/BaseLayout.astro`
Expected: 无输出（已全部替换）

- [ ] **Step 5: 检查 + 测试**

Run: `npm run astro-check && npx vitest run __tests__/unit/layouts/BaseLayout.test.tsx`
Expected: 0 errors；BaseLayout 9 tests passed

- [ ] **Step 6: 提交**

```bash
git add src/layouts/BaseLayout.astro
git commit -m "feat(nav): 导航第3项 Button/soundboard → 独轮车/danmaku"
```

---

## Task 5: Hero 首页入口迁移

**Files:**
- Modify: `src/components/astro/Hero.astro`

- [ ] **Step 1: 修改 import（第 3 行，Volume2 → MessageCircle）**

找到：

```
import { ArrowDown, Tv, Volume2 } from 'lucide-react';
```

替换为：

```
import { ArrowDown, Tv, MessageCircle } from 'lucide-react';
```

- [ ] **Step 2: 入口卡片（约第 178–191 行）**

找到整块：

```
      <!-- Soundboard Button -->
      <a
        href="/soundboard/"
        class="group relative px-5 py-3 rounded-xl glass flex items-center gap-2 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
      >
        <!-- Button Glow Effect -->
        <div class="absolute inset-0 bg-linear-to-r from-pink-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        <!-- Button Content -->
        <Volume2 className="relative z-10 w-5 h-5 transition-colors duration-300 group-hover:from-pink-500/20 group-hover:to-blue-500/20" style={{ color: 'var(--accent-primary)' }} />
        <span class="relative z-10 text-base font-medium" style={{ color: 'var(--accent-primary)' }}>
          克罗雅Button
        </span>
      </a>
```

替换为：

```
      <!-- 独轮车弹幕复制 -->
      <a
        href="/danmaku/"
        class="group relative px-5 py-3 rounded-xl glass flex items-center gap-2 transition-all duration-300 hover:scale-105 active:scale-95 overflow-hidden"
      >
        <!-- Button Glow Effect -->
        <div class="absolute inset-0 bg-linear-to-r from-pink-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

        <!-- Button Content -->
        <MessageCircle className="relative z-10 w-5 h-5 transition-colors duration-300 group-hover:from-pink-500/20 group-hover:to-blue-500/20" style={{ color: 'var(--accent-primary)' }} />
        <span class="relative z-10 text-base font-medium" style={{ color: 'var(--accent-primary)' }}>
          独轮车
        </span>
      </a>
```

- [ ] **Step 3: 验证无残留 Volume2**

Run: `grep -n "Volume2" src/components/astro/Hero.astro`
Expected: 无输出

- [ ] **Step 4: 检查 + 测试**

Run: `npm run astro-check && npx vitest run __tests__/unit/components/Hero.test.tsx`
Expected: 0 errors；Hero 12 tests passed

- [ ] **Step 5: 提交**

```bash
git add src/components/astro/Hero.astro
git commit -m "feat(home): 首页入口卡片 soundboard → 独轮车/danmaku"
```

---

## Task 6: 删除旧 soundboard 文件 + 修依赖测试

**Files:**
- Delete: `src/pages/soundboard.astro`, `src/components/react/Soundboard.tsx`, `src/data/voices.ts`
- Modify: `__tests__/unit/optimizations/dependencies.test.ts`

- [ ] **Step 1: 删除旧文件**

Run:
```bash
git rm src/pages/soundboard.astro src/components/react/Soundboard.tsx src/data/voices.ts
```
Expected: 三个文件标记 deleted

- [ ] **Step 2: 从 dependencies.test.ts 移除 Soundboard.tsx 引用（第 29 行）**

在 `__tests__/unit/optimizations/dependencies.test.ts` 找到：

```
      'src/components/react/Soundboard.tsx',
```

**删除这一整行**（使文件清单剩 AnniversaryCard / AboutPage / SongList / PersistentPlayer / VirtualList）。

- [ ] **Step 3: 确认无其它残留引用**

Run: `grep -rn -e "soundboard" -e "Soundboard" -e "voices" -e "VoiceClip" src __tests__`
Expected: 无输出（或仅匹配到无关词；若仍有命中需逐一处理）

- [ ] **Step 4: 全量单测**

Run: `npm run test`
Expected: PASS — 全部通过（含新增 danmaku 测试，dependencies.test 6 tests passed）

- [ ] **Step 5: 提交**

```bash
git add __tests__/unit/optimizations/dependencies.test.ts
git commit -m "chore: 移除 soundboard 旧文件并清理测试引用"
```
（`git rm` 的删除已暂存，一并进入此提交）

---

## Task 7: 全量验证

- [ ] **Step 1: 类型 + 构建**

Run: `npm run build`
Expected: `astro check` 0 errors，构建成功，生成 `/danmaku/index.html`

- [ ] **Step 2: 全量单测**

Run: `npm run test`
Expected: 全部通过（原 331 + 新增约 10 = 340+ tests）

- [ ] **Step 3: 手动核对（dev server）**

Run: `npm run dev`，浏览器打开：
- `/danmaku/`：三类文案展示，筛选生效，点击卡片/复制全部 → 剪贴板写入 + toast「已复制」，超长条字数标红
- 桌面顶栏 + 移动底栏第 3 项显示「独轮车」，点击进入 `/danmaku/`
- 首页 Hero 入口卡片显示「独轮车」并指向 `/danmaku/`
- `/soundboard/` 返回 404（已移除）
- 亮/暗主题切换正常

Expected: 全部符合

- [ ] **Step 4: 收尾提交（如有 dev 调整）**

若 Step 3 发现并修复了问题，提交修复；否则跳过。

---

## Self-Review 结论

- **Spec 覆盖**：数据(Task1)、组件筛选/复制/字数(Task2)、页面(Task3)、导航标签+路由+图标(Task4)、首页入口(Task5)、删除清单+测试引用(Task6)、验收标准(Task7) 全覆盖。
- **占位符**：无 TBD/TODO，所有步骤含完整代码与精确命令。
- **类型一致**：`DanmakuCategory` / `DanmakuItem` / `Filter` / `LIMIT` / `copyText` / `data-over-limit` / aria-label 在测试与实现间一致；测试引用的 `danmaku[0]`、`find(category)` 与数据文件的 cheer-first / meme-first 顺序对应。
