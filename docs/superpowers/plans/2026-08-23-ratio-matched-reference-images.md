# 图生图比例匹配参考图 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为换装图生图按输出比例提供构图匹配的裁切参考图，消除人物比例失真的根因（参考图 1:2.44 vs 画布比例失配）。

**Architecture:** 一次性脚本从 `public/images/illustration.webp`（1024×2496）顶部对齐裁出三档参考图入库；worker 端 `config.ts` 维护 ratio→图 URL 单一映射，`api/image.ts` 查表选图；前端 ratio 选项收窄为 `1:1`/`3:4`/`9:16` 且预览图联动。横版（4:3/16:9）砍掉，视频链路不动。

**Tech Stack:** TypeScript（Astro + React + Cloudflare Worker）、vitest + @testing-library（覆盖率阈值 95/88/97/98）、sharp（新增 devDep，裁切脚本）、bun（包管理）。

**Spec:** `docs/superpowers/specs/2026-08-23-ratio-matched-reference-images-design.md`

**约定：**
- 提交信息用中文 conventional commits（如 `feat: …`、`test: …`），**不加 Co-Authored-By**。
- 每个任务先写失败测试再实现（TDD）。
- 测试命令统一 `bunx vitest run <文件>`（在仓库根 `/home/courtier/kloa-site` 执行）。

---

### Task 1: config 比例→参考图映射表

**Files:**
- Modify: `worker/_lib/config.ts`（`IMAGE_MODEL` 附近新增导出）
- Test: `__tests__/unit/worker/config.test.ts`

- [ ] **Step 1: 写失败测试**

在 `__tests__/unit/worker/config.test.ts` 的 import 中加入 `RATIO_IMAGE_URLS`：

```ts
import { AGNES_BASE_URL, CHAT_MODEL, RATE_LIMIT_MAX, MAX_INPUT_CHARS, DEFAULT_CHARACTER_IMAGE_URL, RATIO_IMAGE_URLS } from '../../../worker/_lib/config';
```

在 describe 块末尾追加：

```ts
  it('比例参考图映射恰好三档且 URL 与比例对应', () => {
    expect(Object.keys(RATIO_IMAGE_URLS).sort()).toEqual(['1:1', '3:4', '9:16']);
    expect(RATIO_IMAGE_URLS['1:1']).toBe('https://kloa.fans/images/illustration-1x1.webp');
    expect(RATIO_IMAGE_URLS['3:4']).toBe('https://kloa.fans/images/illustration-3x4.webp');
    expect(RATIO_IMAGE_URLS['9:16']).toBe('https://kloa.fans/images/illustration-9x16.webp');
  });
```

注意：既有的 `生图基准立绘与前端预览共用 illustration.webp（防漂移回旧图）` 测试**保留不动**——`DEFAULT_CHARACTER_IMAGE_URL` 仍被视频链路使用。

- [ ] **Step 2: 跑测试确认失败**

Run: `bunx vitest run __tests__/unit/worker/config.test.ts`
Expected: FAIL，报 `RATIO_IMAGE_URLS` 未导出（import undefined / keys of undefined）。

- [ ] **Step 3: 实现**

在 `worker/_lib/config.ts` 中 `MAX_IMAGE_EXTRA_CHARS` 之前插入：

```ts
// 图生图参考图按输出比例分档：立绘原图 1024×2496（≈1:2.44），直接送入失配画布会被
// 模型压扁或重构人体。三档图由 scripts/generate-character-crops.mjs 顶部对齐裁切生成，
// 立绘更新后需重跑（bun run gen:crops）并提交产物。键集合即图生图合法比例。
export const RATIO_IMAGE_URLS = {
  '1:1': 'https://kloa.fans/images/illustration-1x1.webp',
  '3:4': 'https://kloa.fans/images/illustration-3x4.webp',
  '9:16': 'https://kloa.fans/images/illustration-9x16.webp',
} as const;
```

- [ ] **Step 4: 跑测试确认通过**

Run: `bunx vitest run __tests__/unit/worker/config.test.ts`
Expected: PASS（全部用例）。

- [ ] **Step 5: Commit**

```bash
git add worker/_lib/config.ts __tests__/unit/worker/config.test.ts
git commit -m "feat: config 新增图生图比例→参考图映射 RATIO_IMAGE_URLS"
```

---

### Task 2: buildImagePrompt 按比例注入构图词

**Files:**
- Modify: `worker/_lib/prompts.ts:98-112`（`STYLE_PROMPTS` 与 `buildImagePrompt`）
- Test: `__tests__/unit/worker/image-prompts.test.ts`

- [ ] **Step 1: 更新与新增测试**

`__tests__/unit/worker/image-prompts.test.ts` 全量替换为：

```ts
import { describe, it, expect } from 'vitest';
import { STYLE_PROMPTS, RATIO_COMPOSITION_PROMPTS, buildImagePrompt } from '../../../worker/_lib/prompts';

describe('image prompts', () => {
  it('STYLE_PROMPTS 含五个风格', () => {
    expect(Object.keys(STYLE_PROMPTS).length).toBeGreaterThanOrEqual(5);
    expect(STYLE_PROMPTS['赛博朋克霓虹']).toBeTruthy();
  });

  it('buildImagePrompt 拼装 风格＋构图词＋preserve，extra 在前', () => {
    const p = buildImagePrompt('水彩手绘', '加一点星空', '3:4');
    expect(p).toContain('watercolor');
    expect(p).toContain('加一点星空');
    expect(p).toContain('waist-up portrait composition');
    expect(p).toContain('preserve original composition');
  });

  it('无 extra 时只有风格＋构图词＋preserve', () => {
    const p = buildImagePrompt('复古像素', undefined, '9:16');
    expect(p).toContain('pixel');
    expect(p).toContain('knee-up illustration composition');
    expect(p).toContain('preserve original composition');
  });

  it('未知风格回退为原值', () => {
    expect(buildImagePrompt('随便', undefined, '1:1').toLowerCase()).toContain('随便');
  });

  it('RATIO_COMPOSITION_PROMPTS 恰好覆盖三档比例', () => {
    expect(Object.keys(RATIO_COMPOSITION_PROMPTS).sort()).toEqual(['1:1', '3:4', '9:16']);
    expect(RATIO_COMPOSITION_PROMPTS['1:1']).toBe('upper-body portrait composition');
    expect(RATIO_COMPOSITION_PROMPTS['3:4']).toBe('waist-up portrait composition');
    expect(RATIO_COMPOSITION_PROMPTS['9:16']).toBe('knee-up illustration composition');
  });

  it('未知比例构图词回退 upper-body（与 1:1 参考图兜底一致）', () => {
    expect(buildImagePrompt('水彩手绘', undefined, '16:9')).toContain('upper-body portrait composition');
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `bunx vitest run __tests__/unit/worker/image-prompts.test.ts`
Expected: FAIL，`RATIO_COMPOSITION_PROMPTS` 未导出、`buildImagePrompt` 两参调用不匹配。

- [ ] **Step 3: 实现**

`worker/_lib/prompts.ts` 中：`STYLE_PROMPTS` 之后、`buildImagePrompt` 之前新增：

```ts
// 构图词与 config.RATIO_IMAGE_URLS 的三档裁切构图一一对应，帮助模型理解参考图取景。
export const RATIO_COMPOSITION_PROMPTS: Record<string, string> = {
  '1:1': 'upper-body portrait composition',
  '3:4': 'waist-up portrait composition',
  '9:16': 'knee-up illustration composition',
};
```

`buildImagePrompt` 替换为（第三参 `ratio` 必传）：

```ts
export function buildImagePrompt(style: string, extra: string | undefined, ratio: string): string {
  const base = STYLE_PROMPTS[style] ?? style;
  const parts: string[] = [];
  if (extra && extra.trim()) parts.push(extra.trim());
  parts.push(base);
  parts.push(RATIO_COMPOSITION_PROMPTS[ratio] ?? RATIO_COMPOSITION_PROMPTS['1:1']);
  parts.push('preserve original composition and character identity, keep the same character');
  return parts.join(', ');
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `bunx vitest run __tests__/unit/worker/image-prompts.test.ts`
Expected: PASS。此时 `worker/api/image.ts` 仍以两参调用 `buildImagePrompt`，TS 尚未编译检查、运行时该文件未被此测试加载，属预期中间态。

- [ ] **Step 5: Commit**

```bash
git add worker/_lib/prompts.ts __tests__/unit/worker/image-prompts.test.ts
git commit -m "feat: buildImagePrompt 按 ratio 注入构图词"
```

---

### Task 3: image 端点查表选参考图

**Files:**
- Modify: `worker/api/image.ts`
- Test: `__tests__/unit/worker/image.test.ts`

- [ ] **Step 1: 更新与新增测试**

`__tests__/unit/worker/image.test.ts`：

(1) `call` helper 的 env 参数类型放宽以支持覆盖变量：

```ts
async function call(body: unknown, env: { AGNES_API_KEY: string; AGNES_CHARACTER_URL?: string }, fetchMock: typeof fetch) {
```

(2) describe 块末尾追加三个用例：

```ts
  it('ratio 选中对应裁切参考图', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ data: [{ url: 'https://cdn/x.png' }] }), { status: 200 }
    ));
    const res = await call({ style: '水彩手绘', size: '1K', ratio: '9:16' }, { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(200);
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.extra_body.image).toEqual(['https://kloa.fans/images/illustration-9x16.webp']);
    expect(sent.prompt).toContain('knee-up illustration composition');
  });

  it('AGNES_CHARACTER_URL 覆盖所有比例的选图（本地联调后门）', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ data: [{ url: 'https://cdn/x.png' }] }), { status: 200 }
    ));
    const res = await call(
      { style: '水彩手绘', size: '1K', ratio: '3:4' },
      { AGNES_API_KEY: 'k', AGNES_CHARACTER_URL: 'https://example.com/tmp.png' },
      fetchMock
    );
    expect(res.status).toBe(200);
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.extra_body.image).toEqual(['https://example.com/tmp.png']);
  });

  it('非法 ratio 回退 1:1 参考图', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ data: [{ url: 'https://cdn/x.png' }] }), { status: 200 }
    ));
    const res = await call({ style: '水彩手绘', size: '1K', ratio: '16:9' }, { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(200);
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.extra_body.image).toEqual(['https://kloa.fans/images/illustration-1x1.webp']);
  });
```

- [ ] **Step 2: 跑测试确认失败**

Run: `bunx vitest run __tests__/unit/worker/image.test.ts`
Expected: 新增三例 FAIL（`9:16` 实际仍送 `illustration.webp` 全图；覆盖变量未生效；`16:9` 不在旧 RATIOS 但默认 `'1:1'` 送的仍是全图 URL）。

- [ ] **Step 3: 实现**

`worker/api/image.ts` 全量替换为：

```ts
import { buildImagePrompt } from '../_lib/prompts';
import { agnesHeaders, normalizeAgnesError } from '../_lib/agnes';
import { checkRateLimit, clientIP } from '../_lib/ratelimit';
import { AGNES_BASE_URL, IMAGE_MODEL, RATIO_IMAGE_URLS, MAX_IMAGE_EXTRA_CHARS } from '../_lib/config';
import type { Env } from '../_lib/types';

interface ImageRequest {
  style: string;
  extra?: string;
  size: '1K' | '2K';
  ratio?: string;
}

// 合法比例由映射表推导，单一数据源（横版 4:3/16:9 已砍：立绘玩法无构图匹配的参考图）。
const RATIOS = Object.keys(RATIO_IMAGE_URLS);

export async function imageHandler(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);

  if (!(await checkRateLimit(clientIP(request), caches.default)).allowed) {
    return json({ error: '操作太频繁，请稍后再试' }, 429);
  }

  let body: ImageRequest;
  try { body = (await request.json()) as ImageRequest; } catch { return json({ error: '请求格式有误' }, 400); }

  if (!body?.style || typeof body.style !== 'string') return json({ error: '请选择风格' }, 400);
  if (body.extra && body.extra.length > MAX_IMAGE_EXTRA_CHARS) return json({ error: `追加描述过长（限 ${MAX_IMAGE_EXTRA_CHARS} 字）` }, 400);

  const size = body.size === '2K' ? '2K' : '1K';
  const ratio = body.ratio && RATIOS.includes(body.ratio) ? body.ratio : '1:1';
  const apiKey = env.AGNES_API_KEY;
  if (!apiKey) return json({ error: '服务未配置' }, 503);

  const override = (env as Env & { AGNES_CHARACTER_URL?: string }).AGNES_CHARACTER_URL;
  const characterUrl = override || RATIO_IMAGE_URLS[ratio as keyof typeof RATIO_IMAGE_URLS];
  const prompt = buildImagePrompt(body.style, body.extra, ratio);

  const upstream = await fetch(`${AGNES_BASE_URL}/images/generations`, {
    method: 'POST',
    headers: agnesHeaders(apiKey),
    body: JSON.stringify({
      model: IMAGE_MODEL,
      prompt,
      size,
      ratio,
      extra_body: { image: [characterUrl], response_format: 'url' },
    }),
  });

  if (!upstream.ok) {
    const { status, message } = normalizeAgnesError(upstream.status);
    return json({ error: message }, status);
  }
  const data = await upstream.json() as { data?: { url?: string }[] };
  const url = data.data?.[0]?.url;
  if (!url) return json({ error: '生成失败，请重试' }, 502);
  return json({ url }, 200);
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
```

（变化：去掉 `DEFAULT_CHARACTER_IMAGE_URL` import 与本地 `RATIOS` 字面量集合；选图改为查表 + 覆盖；`buildImagePrompt` 传入 ratio。）

- [ ] **Step 4: 跑测试确认通过**

Run: `bunx vitest run __tests__/unit/worker/image.test.ts`
Expected: PASS（含既有用例）。

- [ ] **Step 5: Commit**

```bash
git add worker/api/image.ts __tests__/unit/worker/image.test.ts
git commit -m "feat: 图生图按 ratio 查表选裁切参考图，非法比例回退 1:1"
```

---

### Task 4: 前端比例收窄与预览联动

**Files:**
- Modify: `src/components/react/ai/types.ts:19`（`ImageRequest.ratio`）
- Modify: `src/components/react/ai/ImageStudio.tsx`
- Test: `__tests__/unit/components/ai/ImageStudio.test.tsx`

- [ ] **Step 1: 更新与新增测试**

`__tests__/unit/components/ai/ImageStudio.test.tsx`：

(1) 用例 `切换比例为 16:9 触发 ratio onChange` 改为：

```ts
  it('切换比例为 9:16 触发 ratio onChange', async () => {
    const user = userEvent.setup();
    render(<ImageStudio />);
    const ratio = screen.getByRole('combobox', { name: '比例' });
    await user.selectOptions(ratio, '9:16');
    expect(ratio).toHaveValue('9:16');
  });
```

(2) describe 块末尾追加两个用例：

```ts
  it('比例选项不含横版（4:3/16:9 已砍）', async () => {
    render(<ImageStudio />);
    const ratio = screen.getByRole('combobox', { name: '比例' });
    expect(screen.queryByRole('option', { name: '4:3' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: '16:9' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('option').length).toBe(3);
  });

  it('预览图跟随比例联动为对应裁切版', async () => {
    const user = userEvent.setup();
    render(<ImageStudio />);
    const preview = screen.getByRole('img', { name: /立绘预览/ });
    expect(preview).toHaveAttribute('src', '/images/illustration-1x1.webp');
    await user.selectOptions(screen.getByRole('combobox', { name: '比例' }), '9:16');
    expect(preview).toHaveAttribute('src', '/images/illustration-9x16.webp');
    await user.selectOptions(screen.getByRole('combobox', { name: '比例' }), '3:4');
    expect(preview).toHaveAttribute('src', '/images/illustration-3x4.webp');
  });
```

- [ ] **Step 2: 跑测试确认失败**

Run: `bunx vitest run __tests__/unit/components/ai/ImageStudio.test.tsx`
Expected: FAIL——16:9 用例找不到该选项；预览 src 仍是 `/images/illustration.webp`。

- [ ] **Step 3: 实现**

(1) `src/components/react/ai/types.ts` 中 `ImageRequest.ratio` 收窄：

```ts
export interface ImageRequest {
  style: string;
  extra?: string;
  size: '1K' | '2K';
  ratio: '1:1' | '3:4' | '9:16';
}
```

(2) `src/components/react/ai/ImageStudio.tsx`：

import 之后新增（命名与 worker 产物文件一致，防漂移）：

```tsx
// 与 worker RATIO_IMAGE_URLS 的产物同名（1x1/3x4/9x16），选比例即预览该比例的参考图构图。
const RATIO_PREVIEW: Record<ImageRequest['ratio'], string> = {
  '1:1': '/images/illustration-1x1.webp',
  '3:4': '/images/illustration-3x4.webp',
  '9:16': '/images/illustration-9x16.webp',
};
```

预览 img 的 `src` 改为联动：

```tsx
<img src={RATIO_PREVIEW[ratio]} alt="立绘预览" className="w-full max-h-64 object-contain rounded-xl mb-4" />
```

比例 select 选项收窄为三项（删除 `4:3`、`16:9` 两个 option）：

```tsx
<select value={ratio} onChange={(e) => setRatio(e.target.value as ImageRequest['ratio'])} className="glass rounded-lg px-2 py-1 ml-1">
  <option value="1:1">1:1</option><option value="3:4">3:4</option><option value="9:16">9:16</option>
</select>
```

（默认 `useState<ImageRequest['ratio']>('1:1')` 保持不变。）

- [ ] **Step 4: 跑测试确认通过**

Run: `bunx vitest run __tests__/unit/components/ai/ImageStudio.test.tsx`
Expected: PASS。另跑 `bunx vitest run __tests__/unit/components/ai/image-api.test.ts` 确认未受类型收窄影响（该文件只传 `1:1`）。Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add src/components/react/ai/types.ts src/components/react/ai/ImageStudio.tsx __tests__/unit/components/ai/ImageStudio.test.tsx
git commit -m "feat: 换装比例收窄为三档并联动预览裁切图"
```

---

### Task 5: 裁切脚本与产物生成

**Files:**
- Create: `scripts/generate-character-crops.mjs`
- Create: `public/images/illustration-1x1.webp`、`public/images/illustration-3x4.webp`、`public/images/illustration-9x16.webp`（脚本产物）
- Modify: `package.json`（devDependencies 加 sharp；scripts 加 `gen:crops`）

脚本本身无单元测试（与 `generate-font-subset.mjs` 同待遇；vitest include 只收 `__tests__/unit/**`，不进覆盖率统计）。验证方式为运行 + 人工看图。

- [ ] **Step 1: 安装 sharp**

Run: `bun add -d sharp`
Expected: `package.json` devDependencies 出现 sharp，`bun.lock` 更新。

- [ ] **Step 2: 写脚本**

创建 `scripts/generate-character-crops.mjs`：

```js
// 手动本地运行：从 public/images/illustration.webp 顶部对齐裁出三档参考图（换装图生图用）。
// 用法：node scripts/generate-character-crops.mjs（或 bun run gen:crops）
// 根因：立绘原图 1024×2496（≈1:2.44），直接送入失配画布做图生图会被模型压扁/重构人体。
// 三档裁切与 worker/_lib/config.ts 的 RATIO_IMAGE_URLS、前端 RATIO_PREVIEW 一一对应。
// 立绘更新后需重跑并提交 public/images/illustration-*.webp（与 gen:fonts 同模式）。
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const SRC = join(ROOT, 'public/images/illustration.webp');

// 全部顶部对齐（头顶必须完整，脚部取舍）。
const CROPS = [
  { name: 'illustration-1x1.webp', width: 1024, height: 1024 },   // 头→胸口
  { name: 'illustration-3x4.webp', width: 1024, height: 1365 },   // 头→腰
  { name: 'illustration-9x16.webp', width: 1024, height: 1820 },  // 头→膝
];

for (const { name, width, height } of CROPS) {
  await sharp(SRC)
    .extract({ left: 0, top: 0, width, height })
    .webp({ quality: 90 })
    .toFile(join(ROOT, 'public/images', name));
  console.log(`✓ ${name} (${width}x${height})`);
}
```

- [ ] **Step 3: 注册 npm script 并运行**

`package.json` 的 scripts 中、`gen:fonts` 行后加：

```json
    "gen:crops": "node scripts/generate-character-crops.mjs",
```

Run: `bun run gen:crops`
Expected: 输出三行 `✓ illustration-*.webp (...)`，`public/images/` 出现三个新文件。

- [ ] **Step 4: 人工验证三张图构图**

用 Read 工具依次查看三个产物文件，确认：头部完整（头顶无截断）、`1x1` 裁到胸口、`3x4` 裁到腰、`9x16` 裁到膝附近、无异常黑边。若构图不佳（如手臂裁切位置怪异），调整 CROPS 的 height 后重跑本步。

- [ ] **Step 5: Commit**

```bash
git add scripts/generate-character-crops.mjs package.json bun.lock public/images/illustration-1x1.webp public/images/illustration-3x4.webp public/images/illustration-9x16.webp
git commit -m "feat: 新增立绘三档裁切脚本与产物（比例匹配参考图）"
```

---

### Task 6: 全量验证

**Files:** 无新增改动（验证任务）。

- [ ] **Step 1: 全量单测 + 覆盖率阈值**

Run: `bun run test:coverage`
Expected: 全部 PASS，覆盖率不低于阈值（statements 95 / branches 88 / functions 97 / lines 98）。

- [ ] **Step 2: 类型检查**

Run: `bun run type-check`
Expected: 无错误（重点确认 `ImageRequest['ratio']` 收窄未波及其他引用；`buildImagePrompt` 三参调用处均已更新）。

- [ ] **Step 3: lint**

Run: `bun run lint:security`
Expected: 无新增告警。

- [ ] **Step 4: 确认工作区干净**

Run: `git status`
Expected: clean（所有改动已按任务提交）。若 e2e 需要跑（`__tests__/e2e` 中若有引用 16:9 选项的用例会挂），运行 `env -u CLAUDECODE -u AI_AGENT bun run test:e2e` 检查；发现引用旧比例的 e2e 用例则同步改为三档之一并 amend 到 Task 4 的提交。

---

## Self-Review 记录

- **Spec 覆盖**：脚本（Task 5）、config 映射（Task 1）、RATIOS 推导与查表/覆盖/fallback（Task 3）、prompt 构图词（Task 2）、前端选项收窄+预览联动（Task 4）、测试（各任务内）、`AGNES_CHARACTER_URL` 语义保留（Task 3）、`DEFAULT_CHARACTER_IMAGE_URL` 保留给视频（Task 1 明示不动）——全覆盖。
- **占位符**：无 TBD/TODO；所有代码步骤含完整代码。
- **类型一致性**：`RATIO_IMAGE_URLS`（as const，键 `'1:1'|'3:4'|'9:16'`）与 `ImageRequest['ratio']` 收窄后的联合一致；`buildImagePrompt(style, extra, ratio)` 三参在 Task 2 定义、Task 3 调用；`RATIO_COMPOSITION_PROMPTS` 命名在 Task 2 测试与实现一致。
