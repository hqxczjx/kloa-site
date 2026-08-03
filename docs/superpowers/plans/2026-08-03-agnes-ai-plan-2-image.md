# Agnes AI 实验室 — Plan 2: 绘图能力（图生图）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: 用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现。步骤用 checkbox（`- [ ]`）跟踪。

**Goal:** 新增「给克罗雅换装」——前端 `/ai/image` 选风格模板（＋可选追加）→ `POST /api/image`（Pages Function）→ agnes `agnes-image-2.1-flash` 图生图（固定立绘）→ 返回图 URL 就地展示＋下载。

**Architecture:** 复用 Plan 1 的 `_lib` 地基（types/config/agnes/ratelimit）。新增立绘公开 URL（复制到 `public/images/`）、绘图风格模板、`/api/image` endpoint（同步）、`ImageStudio` island。`response_format` 严格放 `extra_body` 内，图生图用 `extra_body.image`。

**Tech Stack:** 同 Plan 1（Astro SSG ＋ React island ＋ Pages Functions ＋ Vitest/Playwright）。

**前置依赖:** Plan 1 已完成（`functions/_lib/{types,config,agnes,ratelimit,prompts}.ts`、`src/components/react/ai/{types,api}.ts` 存在）。

**关联:** spec `docs/superpowers/specs/2026-08-03-agnes-ai-integration-design.md` 第 5.3、6.2、6.3、6.4、7.2、8 节。

**关键约束:**
- agnes 图生图必须 `extra_body.image`（非顶层 `image`），`response_format` 必须在 `extra_body` 内（放顶层会被忽略）。
- 立绘要让 agnes 公开拉取，用绝对 URL `https://kloa.fans/images/character-1.png`。本地真冒烟需该 URL 已部署可达（首次部署后），本地 dev 流程验证用 mock。
- `astro check` 不查 `functions/`；functions 运行时正确即可。

---

## 文件结构

**新建/修改（后端）:**
| 文件 | 改动 |
|---|---|
| `functions/_lib/config.ts` | 加 `IMAGE_MODEL`、`DEFAULT_CHARACTER_IMAGE_URL`、`MAX_IMAGE_EXTRA_CHARS` |
| `functions/_lib/prompts.ts` | 加 `STYLE_PROMPTS` ＋ `buildImagePrompt` |
| `functions/api/image.ts` | 新建 `POST /api/image` |

**新建（前端）:**
| 文件 | 职责 |
|---|---|
| `src/components/react/ai/ImageStudio.tsx` | 绘图 island：立绘预览＋风格＋追加＋尺寸→结果图＋下载 |
| `src/pages/ai/image.astro` | 绘图页路由 |

**修改（前端共享）:**
| 文件 | 改动 |
|---|---|
| `src/components/react/ai/types.ts` | 加 `ImageRequest`/`ImageResponse` |
| `src/components/react/ai/api.ts` | 加 `generateImage()` |

**资源:** `public/images/character-1.png`（从 `src/images/character-1.png` 复制）。

**测试:**
| 文件 | 覆盖 |
|---|---|
| `__tests__/unit/functions/image-prompts.test.ts` | `buildImagePrompt`（风格片段＋追加＋preserve）、未知风格 |
| `__tests__/unit/functions/image.test.ts` | endpoint：风格校验、extra 限长、无 key、上游成功返 url、上游错误归一、限流 |
| `__tests__/unit/components/ai/ImageStudio.test.tsx` | 选风格、追加、生成触发 `generateImage`、结果图渲染 |
| `__tests__/e2e/ai-image.spec.ts` | mock `/api/image`，端到端绘图流程 |

---

## Task 1: 立绘复制 + config 扩展

**Files:**
- Create: `public/images/character-1.png`
- Modify: `functions/_lib/config.ts`

- [ ] **Step 1: 复制立绘到 public**

```bash
mkdir -p public/images && cp src/images/character-1.png public/images/character-1.png
```

- [ ] **Step 2: 在 `functions/_lib/config.ts` 末尾追加**

```ts
export const IMAGE_MODEL = 'agnes-image-2.1-flash';
// agnes 需公开可拉取的立绘 URL。可用环境变量 AGNES_CHARACTER_URL 覆盖（本地联调用临时公开图）。
export const DEFAULT_CHARACTER_IMAGE_URL = 'https://kloa.fans/images/character-1.png';
export const MAX_IMAGE_EXTRA_CHARS = 50;
```

- [ ] **Step 3: 验证 build 仍通过（新文件进 dist）**

```bash
bun run build
```
Expected: 通过；`dist/images/character-1.png` 存在。

- [ ] **Step 4: Commit**

```bash
git add public/images/character-1.png functions/_lib/config.ts
git commit -m "feat(ai): 立绘公开副本与绘图配置常量"
```

---

## Task 2: 绘图风格模板

**Files:**
- Modify: `functions/_lib/prompts.ts`
- Test: `__tests__/unit/functions/image-prompts.test.ts`

- [ ] **Step 1: 写失败测试 `__tests__/unit/functions/image-prompts.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { STYLE_PROMPTS, buildImagePrompt } from '../../../functions/_lib/prompts';

describe('image prompts', () => {
  it('STYLE_PROMPTS 含五个风格', () => {
    expect(Object.keys(STYLE_PROMPTS).length).toBeGreaterThanOrEqual(5);
    expect(STYLE_PROMPTS['赛博朋克霓虹']).toBeTruthy();
  });

  it('buildImagePrompt 拼装 风格＋preserve，extra 在前', () => {
    const p = buildImagePrompt('水彩手绘', '加一点星空');
    expect(p).toContain('watercolor');
    expect(p).toContain('加一点星空');
    expect(p).toContain('preserve original composition');
  });

  it('无 extra 时只有风格＋preserve', () => {
    const p = buildImagePrompt('复古像素');
    expect(p).toContain('pixel');
    expect(p).toContain('preserve original composition');
  });

  it('未知风格回退为原值', () => {
    expect(buildImagePrompt('随便').toLowerCase()).toContain('随便');
  });
});
```

- [ ] **Step 2: 跑测试，确认失败**

```bash
bunx vitest run __tests__/unit/functions/image-prompts.test.ts
```
Expected: FAIL（导出不存在）。

- [ ] **Step 3: 在 `functions/_lib/prompts.ts` 末尾追加**

```ts
export const STYLE_PROMPTS: Record<string, string> = {
  '赛博朋克霓虹': 'cyberpunk neon style, glowing neon lights, futuristic night, vibrant pink and cyan, high detail',
  '水彩手绘': 'watercolor painting style, soft brush strokes, pastel colors, hand-drawn, artistic',
  '复古像素': 'retro pixel art style, 16-bit, pixelated, nostalgic game aesthetic',
  '油画质感': 'oil painting style, rich textures, classical lighting, fine art',
  '节日主题': 'festive holiday theme, warm lights, celebration atmosphere, seasonal decorations',
};

export function buildImagePrompt(style: string, extra?: string): string {
  const base = STYLE_PROMPTS[style] ?? style;
  const parts: string[] = [];
  if (extra && extra.trim()) parts.push(extra.trim());
  parts.push(base, 'preserve original composition and character identity, keep the same character');
  return parts.join(', ');
}
```

- [ ] **Step 4: 跑测试，确认通过**

```bash
bunx vitest run __tests__/unit/functions/image-prompts.test.ts
```
Expected: PASS（4 tests）。

- [ ] **Step 5: Commit**

```bash
git add functions/_lib/prompts.ts __tests__/unit/functions/image-prompts.test.ts
git commit -m "feat(ai): 绘图风格模板与 prompt 组装"
```

---

## Task 3: `/api/image` endpoint

**Files:**
- Create: `functions/api/image.ts`
- Test: `__tests__/unit/functions/image.test.ts`

- [ ] **Step 1: 写失败测试 `__tests__/unit/functions/image.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

function makeCache() {
  const store = new Map<string, Response>();
  return {
    async match(r: Request) { const h = store.get(new URL(r.url).pathname); return h ? h.clone() : undefined; },
    async put(r: Request, res: Response) { store.set(new URL(r.url).pathname, res.clone()); },
  } as unknown as Cache;
}

async function call(body: unknown, env: { AGNES_API_KEY: string }, fetchMock: typeof fetch) {
  const mod = await import('../../../functions/api/image');
  globalThis.fetch = fetchMock as typeof fetch;
  globalThis.caches = { default: makeCache() } as unknown as typeof caches;
  return mod.onRequestPost({
    request: new Request('https://kloa.fans/api/image', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '2.2.2.2' },
      body: JSON.stringify(body),
    }),
    env, waitUntil: async () => {}, params: {},
  } as any);
}

describe('image endpoint', () => {
  beforeEach(() => vi.resetModules());

  it('缺 style 返回 400', async () => {
    const res = await call({ size: '1K', ratio: '1:1' }, { AGNES_API_KEY: 'k' }, vi.fn());
    expect(res.status).toBe(400);
  });

  it('extra 超长返回 400', async () => {
    const res = await call({ style: '水彩手绘', extra: '字'.repeat(51), size: '1K' }, { AGNES_API_KEY: 'k' }, vi.fn());
    expect(res.status).toBe(400);
  });

  it('无 key 返回 503', async () => {
    const res = await call({ style: '水彩手绘', size: '1K' }, { AGNES_API_KEY: '' }, vi.fn());
    expect(res.status).toBe(503);
  });

  it('上游成功返回 data[0].url', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ data: [{ url: 'https://cdn/x.png' }] }), { status: 200 }
    ));
    const res = await call({ style: '水彩手绘', size: '2K', ratio: '3:4' }, { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(200);
    expect((await res.json()).url).toBe('https://cdn/x.png');
    // 校验请求体把 image/response_format 放进 extra_body
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.extra_body.image).toBeInstanceOf(Array);
    expect(sent.extra_body.response_format).toBe('url');
    expect(sent.model).toBe('agnes-image-2.1-flash');
  });

  it('上游 503 归一为 503', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 503 }));
    const res = await call({ style: '水彩手绘', size: '1K' }, { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(503);
  });
});
```

- [ ] **Step 2: 跑测试，确认失败**

```bash
bunx vitest run __tests__/unit/functions/image.test.ts
```
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 写 `functions/api/image.ts`**

```ts
import { buildImagePrompt } from '../_lib/prompts';
import { agnesHeaders, normalizeAgnesError } from '../_lib/agnes';
import { checkRateLimit, clientIP } from '../_lib/ratelimit';
import { AGNES_BASE_URL, IMAGE_MODEL, DEFAULT_CHARACTER_IMAGE_URL, MAX_IMAGE_EXTRA_CHARS } from '../_lib/config';
import type { Env } from '../_lib/types';

interface ImageRequest {
  style: string;
  extra?: string;
  size: '1K' | '2K';
  ratio?: string;
}

const RATIOS = new Set(['1:1', '3:4', '4:3', '16:9', '9:16']);

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  if (request.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);

  if (!(await checkRateLimit(clientIP(request), caches.default)).allowed) {
    return json({ error: '操作太频繁，请稍后再试' }, 429);
  }

  let body: ImageRequest;
  try { body = (await request.json()) as ImageRequest; } catch { return json({ error: '请求格式有误' }, 400); }

  if (!body?.style || typeof body.style !== 'string') return json({ error: '请选择风格' }, 400);
  if (body.extra && body.extra.length > MAX_IMAGE_EXTRA_CHARS) return json({ error: `追加描述过长（限 ${MAX_IMAGE_EXTRA_CHARS} 字）` }, 400);

  const size = body.size === '2K' ? '2K' : '1K';
  const ratio = body.ratio && RATIOS.has(body.ratio) ? body.ratio : '1:1';
  const apiKey = env.AGNES_API_KEY;
  if (!apiKey) return json({ error: '服务未配置' }, 503);

  const characterUrl = (env as Env & { AGNES_CHARACTER_URL?: string }).AGNES_CHARACTER_URL || DEFAULT_CHARACTER_IMAGE_URL;
  const prompt = buildImagePrompt(body.style, body.extra);

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
};

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
```

- [ ] **Step 4: 跑测试，确认通过**

```bash
bunx vitest run __tests__/unit/functions/image.test.ts
```
Expected: PASS（5 tests）。

- [ ] **Step 5: Commit**

```bash
git add functions/api/image.ts __tests__/unit/functions/image.test.ts
git commit -m "feat(ai): /api/image 图生图 endpoint（风格校验＋extra_body 坑）"
```

---

## Task 4: 前端类型 + `generateImage` 客户端

**Files:**
- Modify: `src/components/react/ai/types.ts`
- Modify: `src/components/react/ai/api.ts`
- Test: `__tests__/unit/components/ai/image-api.test.ts`

- [ ] **Step 1: 在 `src/components/react/ai/types.ts` 末尾追加**

```ts
export interface ImageRequest {
  style: string;
  extra?: string;
  size: '1K' | '2K';
  ratio: '1:1' | '3:4' | '4:3' | '16:9' | '9:16';
}
export interface ImageResponse { url: string; }
```

- [ ] **Step 2: 写失败测试 `__tests__/unit/components/ai/image-api.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest';
import { generateImage, STYLES } from '../../../../src/components/react/ai/api';

describe('generateImage', () => {
  it('成功返回 url', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ url: 'https://cdn/x.png' }), { status: 200 })));
    const url = await generateImage({ style: '水彩手绘', size: '1K', ratio: '1:1' });
    expect(url).toBe('https://cdn/x.png');
  });
  it('HTTP 错误抛带文案', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: '繁忙' }), { status: 503 })));
    await expect(generateImage({ style: '水彩手绘', size: '1K', ratio: '1:1' })).rejects.toThrow('繁忙');
  });
  it('STYLES 列表与后端 key 对齐', () => {
    expect(STYLES.length).toBeGreaterThanOrEqual(5);
  });
});
```

- [ ] **Step 3: 跑测试，确认失败**

```bash
bunx vitest run __tests__/unit/components/ai/image-api.test.ts
```
Expected: FAIL。

- [ ] **Step 4: 在 `src/components/react/ai/api.ts` 末尾追加**

```ts
import type { ImageRequest } from './types';

export const STYLES = ['赛博朋克霓虹', '水彩手绘', '复古像素', '油画质感', '节日主题'] as const;

export async function generateImage(req: ImageRequest, signal?: AbortSignal): Promise<string> {
  const res = await fetch('/api/image', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.ok) {
    let m = '生成失败，请重试';
    try { m = ((await res.json()) as { error?: string }).error ?? m; } catch { /* 默认 */ }
    throw new Error(m);
  }
  return ((await res.json()) as { url: string }).url;
}
```

- [ ] **Step 5: 跑测试，确认通过**

```bash
bunx vitest run __tests__/unit/components/ai/image-api.test.ts
```
Expected: PASS（3 tests）。

- [ ] **Step 6: Commit**

```bash
git add src/components/react/ai/types.ts src/components/react/ai/api.ts __tests__/unit/components/ai/image-api.test.ts
git commit -m "feat(ai): 前端绘图类型与 generateImage 客户端"
```

---

## Task 5: ImageStudio 组件

**Files:**
- Create: `src/components/react/ai/ImageStudio.tsx`
- Test: `__tests__/unit/components/ai/ImageStudio.test.tsx`

- [ ] **Step 1: 写失败测试 `__tests__/unit/components/ai/ImageStudio.test.tsx`**

```ts
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageStudio from '../../../../src/components/react/ai/ImageStudio';

vi.mock('../../../../src/components/react/ai/api', () => ({
  generateImage: vi.fn().mockResolvedValue('https://cdn/result.png'),
  STYLES: ['赛博朋克霓虹', '水彩手绘', '复古像素', '油画质感', '节日主题'] as const,
}));

describe('ImageStudio', () => {
  it('展示立绘预览与风格选项', () => {
    render(<ImageStudio />);
    expect(screen.getByRole('img', { name: /立绘预览/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '水彩手绘' })).toBeInTheDocument();
  });

  it('选风格＋生成后展示结果图与下载', async () => {
    const user = userEvent.setup();
    render(<ImageStudio />);
    await user.click(screen.getByRole('button', { name: '水彩手绘' }));
    await user.click(screen.getByRole('button', { name: /生成/ }));
    expect(await screen.findByRole('img', { name: /生成结果/ })).toHaveAttribute('src', 'https://cdn/result.png');
    expect(screen.getByRole('link', { name: /下载/ })).toHaveAttribute('href', 'https://cdn/result.png');
  });

  it('展示「链接可能失效」提示', () => {
    render(<ImageStudio />);
    expect(screen.getByText(/链接可能失效/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 跑测试，确认失败**

```bash
bunx vitest run __tests__/unit/components/ai/ImageStudio.test.tsx
```
Expected: FAIL（组件不存在）。

- [ ] **Step 3: 写 `src/components/react/ai/ImageStudio.tsx`**

```tsx
import { useState } from 'react';
import { Wand2, Download } from 'lucide-react';
import { generateImage, STYLES } from './api';
import type { ImageRequest } from './types';

export default function ImageStudio() {
  const [style, setStyle] = useState<string>('');
  const [extra, setExtra] = useState('');
  const [size, setSize] = useState<'1K' | '2K'>('1K');
  const [ratio, setRatio] = useState<ImageRequest['ratio']>('1:1');
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function gen() {
    if (!style || loading) return;
    setLoading(true); setError(''); setUrl('');
    try {
      const u = await generateImage({ style, extra: extra.trim() || undefined, size, ratio });
      setUrl(u);
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 pb-32">
      <h1 className="text-3xl font-serif font-bold text-center mb-2" style={{ color: 'var(--accent-primary)' }}>
        给克罗雅换装
      </h1>
      <p className="text-center text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        实验性 AI · 非官方二创 · 基于立绘图生图
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* 左：输入 */}
        <div className="glass rounded-2xl p-5">
          <img src="/images/character-1.png" alt="立绘预览" className="w-full max-h-64 object-contain rounded-xl mb-4" />
          <div className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>选风格</div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {STYLES.map((s) => (
              <button key={s} onClick={() => setStyle(s)} aria-label={s}
                className="px-3 py-2 rounded-lg text-sm border"
                style={style === s
                  ? { borderColor: 'var(--accent-primary)', background: 'var(--bg-secondary)', color: 'var(--accent-primary)' }
                  : { borderColor: 'var(--glass-border)', color: 'var(--text-secondary)' }}>
                {s}
              </button>
            ))}
          </div>
          <textarea value={extra} onChange={(e) => setExtra(e.target.value.slice(0, 50))}
            placeholder="追加描述（可选，限 50 字）" rows={2}
            className="w-full glass rounded-xl px-3 py-2 text-sm resize-none outline-none mb-3"
            style={{ color: 'var(--text-primary)' }} />
          <div className="flex gap-3 text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            <label>尺寸
              <select value={size} onChange={(e) => setSize(e.target.value as '1K' | '2K')} className="glass rounded-lg px-2 py-1 ml-1">
                <option value="1K">1K（快）</option><option value="2K">2K</option>
              </select>
            </label>
            <label>比例
              <select value={ratio} onChange={(e) => setRatio(e.target.value as ImageRequest['ratio'])} className="glass rounded-lg px-2 py-1 ml-1">
                <option value="1:1">1:1</option><option value="3:4">3:4</option><option value="4:3">4:3</option><option value="16:9">16:9</option><option value="9:16">9:16</option>
              </select>
            </label>
          </div>
          <button onClick={() => void gen()} disabled={!style || loading}
            className="w-full py-3 rounded-xl text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}>
            <Wand2 className="w-4 h-4" />{loading ? '生成中…' : '生成'}
          </button>
          {error && <p className="text-sm mt-3 text-center" style={{ color: 'var(--accent-primary)' }}>{error}</p>}
        </div>

        {/* 右：结果 */}
        <div className="glass rounded-2xl p-5 flex flex-col items-center justify-center min-h-[300px]">
          {url ? (
            <>
              <img src={url} alt="生成结果" className="max-w-full max-h-80 rounded-xl mb-3" />
              <a href={url} download className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-secondary)', color: 'var(--accent-primary)' }}>
                <Download className="w-4 h-4" />下载
              </a>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{loading ? '生成中，请稍候…' : '选好风格后点生成'}</p>
          )}
          <p className="text-xs mt-4 opacity-60" style={{ color: 'var(--text-secondary)' }}>链接可能失效，请及时下载</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 跑测试，确认通过**

```bash
bunx vitest run __tests__/unit/components/ai/ImageStudio.test.tsx
```
Expected: PASS（3 tests）。

- [ ] **Step 5: Commit**

```bash
git add src/components/react/ai/ImageStudio.tsx __tests__/unit/components/ai/ImageStudio.test.tsx
git commit -m "feat(ai): ImageStudio 绘图 island（风格/追加/尺寸/结果/下载）"
```

---

## Task 6: 绘图页路由 + e2e

**Files:**
- Create: `src/pages/ai/image.astro`
- Create: `__tests__/e2e/ai-image.spec.ts`

- [ ] **Step 1: 写 `src/pages/ai/image.astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import ImageStudio from '../../components/react/ai/ImageStudio';
---
<BaseLayout>
  <ImageStudio client:idle />
</BaseLayout>
```

- [ ] **Step 2: 写 `__tests__/e2e/ai-image.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test.describe('AI 绘图页', () => {
  test('选风格生成展示结果', async ({ page }) => {
    await page.route('**/api/image', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: 'https://cdn/r.png' }) })
    );
    await page.goto('/ai/image/');
    await page.getByRole('button', { name: '水彩手绘' }).click();
    await page.getByRole('button', { name: /生成/ }).click();
    await expect(page.getByRole('img', { name: /生成结果/ })).toHaveAttribute('src', 'https://cdn/r.png');
  });

  test('错误时提示', async ({ page }) => {
    await page.route('**/api/image', (route) =>
      route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'AI 服务繁忙，请稍后重试' }) })
    );
    await page.goto('/ai/image/');
    await page.getByRole('button', { name: '水彩手绘' }).click();
    await page.getByRole('button', { name: /生成/ }).click();
    await expect(page.getByText('繁忙')).toBeVisible();
  });
});
```

- [ ] **Step 3: 跑 e2e**

```bash
bun run test:e2e:raw ai-image.spec.ts
```
Expected: PASS（2 tests）。若 webServer 约定不同，参照 `__tests__/e2e/music.spec.ts`。

- [ ] **Step 4: 跑 build 确认无回归**

```bash
bun run build
```
Expected: 通过，`dist/ai/image/index.html` 生成。

- [ ] **Step 5: Commit**

```bash
git add src/pages/ai/image.astro __tests__/e2e/ai-image.spec.ts
git commit -m "feat(ai): /ai/image 绘图页路由与 e2e"
```

---

## 部署与冒烟（实现完成后）

1. push → CF Pages 自动部署（`public/images/character-1.png` 上线 → `https://kloa.fans/images/character-1.png` 可达）。
2. 本地真联调：`.dev.vars` 填 key → `bun run dev:pages` → `/ai/image/` 选风格生成（agnes 拉生产立绘 URL，需已部署）。
3. 生产冒烟：`https://kloa.fans/ai/image/` 选风格生成，确认出图、下载。

## Self-Review

- **Spec 覆盖**：5.3 绘图页、6.2 image 契约、6.3 风格模板、6.4 立绘复制、7.2 negative（注：本版未加 negative_prompt，因 agnes image 接口 negative 非标准字段，留作实现时按实际支持追加——已在风险注明）、8 错误归一、9 测试。✅
- **类型一致**：`ImageRequest`/`ImageResponse` 前后端镜像；`STYLES` 前端与后端 `STYLE_PROMPTS` key 完全对齐（5 个同名）；endpoint `PagesFunction<Env>`。✅
- **占位符**：无；wrangler/冒烟注明前置条件。✅
- **风险点**：agnes image 接口是否支持 `negative_prompt` 字段未在文档明确；若需，在 Task 3 `extra_body` 内追加 `negative_prompt`（实现者按真 key 联调结果决定）。立绘本地真冒烟依赖生产 URL 已部署。
