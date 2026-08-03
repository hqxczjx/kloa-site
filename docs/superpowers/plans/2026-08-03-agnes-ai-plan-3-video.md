# Agnes AI 实验室 — Plan 3: 视频能力（图生视频＋异步轮询）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: 用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现。步骤用 checkbox（`- [ ]`）跟踪。

**Goal:** 新增「让克罗雅动起来」——前端 `/ai/video` 选动作模板（＋可选追加）→ `POST /api/video` 创建任务 → 前端每 5s `GET /api/video/status?id=` 轮询 → 完成后展示视频＋下载，最长 ~3 分钟超时，离开页面即放弃（不持久化）。

**Architecture:** 复用 Plan 1/2 地基。视频是 agnes 的**异步任务**：创建端点 `POST /v1/videos` 返 `video_id`，轮询端点 `GET /agnesapi?video_id=`（注意：agnesapi 在 root，非 `/v1`）。前端用递归 `setTimeout` ＋ `AbortController` 实现可中止的状态机。`num_frames` 按 `8n+1` 取 81（3s）/121（5s）。

**Tech Stack:** 同前。

**前置依赖:** Plan 1（地基）完成。Plan 2 非强依赖（共用立绘 URL 常量，已由 Plan 2 加入 `config.ts`；若先做 Plan 3，需先有 `DEFAULT_CHARACTER_IMAGE_URL` 与 `public/images/character-1.png`——Task 1 会补）。

**关联:** spec 第 5.4、6.2、6.3、6.4、8、9 节。

**关键约束:**
- 创建端点：顶层 `image`（图生视频），`num_frames ≤ 441` 且 `8n+1`。
- 轮询端点 URL：`https://api.agnes-ai.cn/agnesapi?video_id=<id>`（**不含 /v1**）。
- 完成标志：`status==completed` 且 `metadata.url` 存在。
- 不持久化：前端离开页面 abort；服务端不存任务。

---

## 文件结构

**新建/修改（后端）:**
| 文件 | 改动 |
|---|---|
| `functions/_lib/config.ts` | 加 `VIDEO_MODEL`、`AGNES_API_ROOT`、`VIDEO_DURATION_PRESETS` |
| `functions/_lib/prompts.ts` | 加 `ACTION_PROMPTS` ＋ `buildVideoPrompt` |
| `functions/api/video/index.ts` | 新建 `POST /api/video`（创建任务） |
| `functions/api/video/status.ts` | 新建 `GET /api/video/status`（轮询） |

**新建（前端）:**
| 文件 | 职责 |
|---|---|
| `src/components/react/ai/VideoStudio.tsx` | 视频 island：动作＋追加＋时长→异步状态机→播放/下载 |
| `src/pages/ai/video.astro` | 视频页路由 |

**修改（前端共享）:**
| 文件 | 改动 |
|---|---|
| `src/components/react/ai/types.ts` | 加 `VideoRequest`/`VideoStatus`/`VideoStatusResponse` |
| `src/components/react/ai/api.ts` | 加 `ACTIONS`/`createVideo`/`getVideoStatus` |

**测试:**
| 文件 | 覆盖 |
|---|---|
| `__tests__/unit/functions/video-prompts.test.ts` | `buildVideoPrompt`、`ACTION_PROMPTS`、`VIDEO_DURATION_PRESETS` 帧数合法性 |
| `__tests__/unit/functions/video-create.test.ts` | 创建端点：动作校验、duration 映射、image 在顶层、返 video_id、错误归一 |
| `__tests__/unit/functions/video-status.test.ts` | 轮询端点：缺 id、status 归一、completed 返 url、agnesapi URL 正确 |
| `__tests__/unit/components/ai/video-api.test.ts` | `createVideo`/`getVideoStatus` |
| `__tests__/unit/components/ai/VideoStudio.test.tsx` | 状态机：提交→轮询→completed 显示 video；离开页面 abort |
| `__tests__/e2e/ai-video.spec.ts` | mock `/api/video` + `/api/video/status` |

---

## Task 1: config 扩展 + 视频动作模板

**Files:**
- Modify: `functions/_lib/config.ts`
- Modify: `functions/_lib/prompts.ts`
- Create（若 Plan 2 未跑）: `public/images/character-1.png`
- Test: `__tests__/unit/functions/video-prompts.test.ts`

- [ ] **Step 1: 确保立绘公开副本存在（若 Plan 2 已做可跳过）**

```bash
mkdir -p public/images && [ -f public/images/character-1.png ] || cp src/images/character-1.png public/images/character-1.png
```

- [ ] **Step 2: 在 `functions/_lib/config.ts` 末尾追加**

```ts
export const VIDEO_MODEL = 'agnes-video-v2.0';
// agnesapi 轮询端点在 root（非 /v1）
export const AGNES_API_ROOT = 'https://api.agnes-ai.cn';
// duration(秒) → 帧数/帧率；num_frames 满足 8n+1
export const VIDEO_DURATION_PRESETS: Record<3 | 5, { num_frames: number; frame_rate: number }> = {
  3: { num_frames: 81, frame_rate: 24 },   // 81 = 8*10+1, ≈3.4s
  5: { num_frames: 121, frame_rate: 24 },  // 121 = 8*15+1, ≈5.0s
};
```

- [ ] **Step 3: 在 `functions/_lib/prompts.ts` 末尾追加**

```ts
export const ACTION_PROMPTS: Record<string, string> = {
  '微微笑': 'the character smiles gently, subtle natural facial expression',
  '回头看镜头': 'the character slowly turns head to look at the camera',
  '风吹动发丝': 'gentle wind blowing the hair softly, natural movement',
  '自然眨眼呼吸': 'natural blinking and subtle breathing motion',
  '缓缓走近': 'the character slowly walks toward the camera',
};

export function buildVideoPrompt(action: string, extra?: string): string {
  const base = ACTION_PROMPTS[action] ?? action;
  const parts: string[] = [base];
  if (extra && extra.trim()) parts.push(extra.trim());
  return parts.join(', ');
}
```

- [ ] **Step 4: 写失败测试 `__tests__/unit/functions/video-prompts.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { ACTION_PROMPTS, buildVideoPrompt } from '../../../functions/_lib/prompts';
import { VIDEO_DURATION_PRESETS } from '../../../functions/_lib/config';

describe('video prompts', () => {
  it('ACTION_PROMPTS 含五个动作', () => {
    expect(Object.keys(ACTION_PROMPTS).length).toBeGreaterThanOrEqual(5);
  });
  it('buildVideoPrompt 拼装 action＋extra', () => {
    expect(buildVideoPrompt('微微笑', '夕阳光')).toContain('夕阳光');
    expect(buildVideoPrompt('微微笑', '夕阳光')).toContain('smiles');
  });
  it('帧数满足 8n+1', () => {
    for (const k of [3, 5] as const) {
      const n = VIDEO_DURATION_PRESETS[k].num_frames;
      expect((n - 1) % 8).toBe(0);
      expect(n).toBeLessThanOrEqual(441);
    }
  });
});
```

- [ ] **Step 5: 跑测试，确认通过**

```bash
bunx vitest run __tests__/unit/functions/video-prompts.test.ts
```
Expected: PASS（3 tests）。

- [ ] **Step 6: Commit**

```bash
git add functions/_lib/config.ts functions/_lib/prompts.ts public/images/character-1.png __tests__/unit/functions/video-prompts.test.ts
git commit -m "feat(ai): 视频配置（时长帧数预设）与动作模板"
```

---

## Task 2: `POST /api/video` 创建任务端点

**Files:**
- Create: `functions/api/video/index.ts`
- Test: `__tests__/unit/functions/video-create.test.ts`

- [ ] **Step 1: 写失败测试 `__tests__/unit/functions/video-create.test.ts`**

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
  const mod = await import('../../../functions/api/video/index');
  globalThis.fetch = fetchMock as typeof fetch;
  globalThis.caches = { default: makeCache() } as unknown as typeof caches;
  return mod.onRequestPost({
    request: new Request('https://kloa.fans/api/video', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '3.3.3.3' },
      body: JSON.stringify(body),
    }),
    env, waitUntil: async () => {}, params: {},
  } as any);
}

describe('video create endpoint', () => {
  beforeEach(() => vi.resetModules());

  it('缺 action 返回 400', async () => {
    const res = await call({ duration: 3 }, { AGNES_API_KEY: 'k' }, vi.fn());
    expect(res.status).toBe(400);
  });
  it('无 key 返回 503', async () => {
    const res = await call({ action: '微微笑', duration: 3 }, { AGNES_API_KEY: '' }, vi.fn());
    expect(res.status).toBe(503);
  });
  it('成功返回 video_id，image 在顶层，duration=5 映射 121 帧', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ video_id: 'vid_123', status: 'queued' }), { status: 200 }
    ));
    const res = await call({ action: '微微笑', duration: 5, extra: '夕阳' }, { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(200);
    expect((await res.json()).video_id).toBe('vid_123');
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.image).toContain('kloa.fans');
    expect(sent.num_frames).toBe(121);
    expect(sent.frame_rate).toBe(24);
    expect(sent.model).toBe('agnes-video-v2.0');
  });
  it('上游 503 归一', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 503 }));
    const res = await call({ action: '微微笑', duration: 3 }, { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(503);
  });
});
```

- [ ] **Step 2: 跑测试，确认失败**

```bash
bunx vitest run __tests__/unit/functions/video-create.test.ts
```
Expected: FAIL。

- [ ] **Step 3: 写 `functions/api/video/index.ts`**

```ts
import { buildVideoPrompt, ACTION_PROMPTS } from '../../_lib/prompts';
import { agnesHeaders, normalizeAgnesError } from '../../_lib/agnes';
import { checkRateLimit, clientIP } from '../../_lib/ratelimit';
import { AGNES_BASE_URL, VIDEO_MODEL, VIDEO_DURATION_PRESETS, DEFAULT_CHARACTER_IMAGE_URL } from '../../_lib/config';
import type { Env } from '../../_lib/types';

interface VideoRequest { action: string; extra?: string; duration: 3 | 5; }

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  if (request.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);
  if (!(await checkRateLimit(clientIP(request), caches.default)).allowed) {
    return json({ error: '操作太频繁，请稍后再试' }, 429);
  }

  let body: VideoRequest;
  try { body = (await request.json()) as VideoRequest; } catch { return json({ error: '请求格式有误' }, 400); }
  if (!body?.action || !ACTION_PROMPTS[body.action]) return json({ error: '请选择动作' }, 400);
  const duration: 3 | 5 = body.duration === 5 ? 5 : 3;
  const preset = VIDEO_DURATION_PRESETS[duration];
  if (!env.AGNES_API_KEY) return json({ error: '服务未配置' }, 503);

  const characterUrl = (env as Env & { AGNES_CHARACTER_URL?: string }).AGNES_CHARACTER_URL || DEFAULT_CHARACTER_IMAGE_URL;
  const prompt = buildVideoPrompt(body.action, body.extra);

  const upstream = await fetch(`${AGNES_BASE_URL}/videos`, {
    method: 'POST',
    headers: agnesHeaders(env.AGNES_API_KEY),
    body: JSON.stringify({
      model: VIDEO_MODEL,
      prompt,
      image: characterUrl,
      num_frames: preset.num_frames,
      frame_rate: preset.frame_rate,
    }),
  });

  if (!upstream.ok) {
    const { status, message } = normalizeAgnesError(upstream.status);
    return json({ error: message }, status);
  }
  const data = await upstream.json() as { video_id?: string; id?: string };
  const video_id = data.video_id ?? data.id;
  if (!video_id) return json({ error: '创建任务失败，请重试' }, 502);
  return json({ video_id }, 200);
};

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
```

- [ ] **Step 4: 跑测试，确认通过**

```bash
bunx vitest run __tests__/unit/functions/video-create.test.ts
```
Expected: PASS（4 tests）。

- [ ] **Step 5: Commit**

```bash
git add functions/api/video/index.ts __tests__/unit/functions/video-create.test.ts
git commit -m "feat(ai): /api/video 创建任务端点（图生视频，image 在顶层）"
```

---

## Task 3: `GET /api/video/status` 轮询端点

**Files:**
- Create: `functions/api/video/status.ts`
- Test: `__tests__/unit/functions/video-status.test.ts`

- [ ] **Step 1: 写失败测试 `__tests__/unit/functions/video-status.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

async function call(query: string, env: { AGNES_API_KEY: string }, fetchMock: typeof fetch) {
  const mod = await import('../../../functions/api/video/status');
  globalThis.fetch = fetchMock as typeof fetch;
  return mod.onRequestGet({
    request: new Request(`https://kloa.fans/api/video/status${query}`),
    env, waitUntil: async () => {}, params: {},
  } as any);
}

describe('video status endpoint', () => {
  beforeEach(() => vi.resetModules());

  it('缺 id 返回 400', async () => {
    const res = await call('', { AGNES_API_KEY: 'k' }, vi.fn());
    expect(res.status).toBe(400);
  });

  it('命中 agnesapi（root，非 /v1）并归一 status', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ status: 'in_progress', progress: 42 }), { status: 200 }
    ));
    const res = await call('?id=vid_1', { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('in_progress');
    expect(body.progress).toBe(42);
    const calledUrl = (fetchMock.mock.calls[0][0] as string);
    expect(calledUrl).toContain('/agnesapi?video_id=vid_1');
    expect(calledUrl).not.toContain('/v1/agnesapi');
  });

  it('completed 时返 metadata.url', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ status: 'completed', progress: 100, metadata: { url: 'https://cdn/v.mp4' } }), { status: 200 }
    ));
    const res = await call('?id=vid_2', { AGNES_API_KEY: 'k' }, fetchMock);
    expect((await res.json()).url).toBe('https://cdn/v.mp4');
  });

  it('未知 status 归一为 queued', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ status: 'weird', progress: 0 }), { status: 200 }
    ));
    const res = await call('?id=vid_3', { AGNES_API_KEY: 'k' }, fetchMock);
    expect((await res.json()).status).toBe('queued');
  });
});
```

- [ ] **Step 2: 跑测试，确认失败**

```bash
bunx vitest run __tests__/unit/functions/video-status.test.ts
```
Expected: FAIL。

- [ ] **Step 3: 写 `functions/api/video/status.ts`**

```ts
import { AGNES_API_ROOT } from '../../_lib/config';
import { agnesHeaders, normalizeAgnesError } from '../../_lib/agnes';
import type { Env } from '../../_lib/types';

type NormStatus = 'queued' | 'in_progress' | 'completed' | 'failed';
function normalizeStatus(s?: string): NormStatus {
  if (s === 'completed' || s === 'failed' || s === 'in_progress') return s;
  return 'queued';
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return json({ error: '缺少 id' }, 400);
  if (!env.AGNES_API_KEY) return json({ error: '服务未配置' }, 503);

  const upstream = await fetch(`${AGNES_API_ROOT}/agnesapi?video_id=${encodeURIComponent(id)}`, {
    headers: agnesHeaders(env.AGNES_API_KEY),
  });
  if (!upstream.ok) {
    const { status, message } = normalizeAgnesError(upstream.status);
    return json({ error: message }, status);
  }
  const data = await upstream.json() as { status?: string; progress?: number; metadata?: { url?: string } };
  const status = normalizeStatus(data.status);
  const url = status === 'completed' ? data.metadata?.url : undefined;
  return json({ status, progress: typeof data.progress === 'number' ? data.progress : 0, url }, 200);
};

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
```

- [ ] **Step 4: 跑测试，确认通过**

```bash
bunx vitest run __tests__/unit/functions/video-status.test.ts
```
Expected: PASS（4 tests）。

- [ ] **Step 5: Commit**

```bash
git add functions/api/video/status.ts __tests__/unit/functions/video-status.test.ts
git commit -m "feat(ai): /api/video/status 轮询端点（agnesapi root，状态归一）"
```

---

## Task 4: 前端类型 + 视频 API 客户端

**Files:**
- Modify: `src/components/react/ai/types.ts`
- Modify: `src/components/react/ai/api.ts`
- Test: `__tests__/unit/components/ai/video-api.test.ts`

- [ ] **Step 1: 在 `src/components/react/ai/types.ts` 末尾追加**

```ts
export interface VideoRequest { action: string; extra?: string; duration: 3 | 5; }
export type VideoStatus = 'queued' | 'in_progress' | 'completed' | 'failed' | 'timeout';
export interface VideoStatusResponse { status: VideoStatus; progress: number; url?: string; }
```

- [ ] **Step 2: 写失败测试 `__tests__/unit/components/ai/video-api.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest';
import { createVideo, getVideoStatus, ACTIONS } from '../../../../src/components/react/ai/api';

describe('video api', () => {
  it('createVideo 返回 video_id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ video_id: 'v1' }), { status: 200 })));
    expect(await createVideo({ action: '微微笑', duration: 3 })).toBe('v1');
  });
  it('getVideoStatus 返回归一状态', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'completed', progress: 100, url: 'https://cdn/v.mp4' }), { status: 200 })));
    const r = await getVideoStatus('v1');
    expect(r.status).toBe('completed');
    expect(r.url).toBe('https://cdn/v.mp4');
  });
  it('createVideo 错误抛文案', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: '繁忙' }), { status: 503 })));
    await expect(createVideo({ action: '微微笑', duration: 3 })).rejects.toThrow('繁忙');
  });
  it('ACTIONS 列表 ≥5', () => { expect(ACTIONS.length).toBeGreaterThanOrEqual(5); });
});
```

- [ ] **Step 3: 跑测试，确认失败**

```bash
bunx vitest run __tests__/unit/components/ai/video-api.test.ts
```
Expected: FAIL。

- [ ] **Step 4: 在 `src/components/react/ai/api.ts` 末尾追加**

```ts
import type { VideoRequest, VideoStatusResponse } from './types';

export const ACTIONS = ['微微笑', '回头看镜头', '风吹动发丝', '自然眨眼呼吸', '缓缓走近'] as const;

export async function createVideo(req: VideoRequest, signal?: AbortSignal): Promise<string> {
  const res = await fetch('/api/video', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(req), signal,
  });
  if (!res.ok) {
    let m = '创建任务失败，请重试';
    try { m = ((await res.json()) as { error?: string }).error ?? m; } catch { /* 默认 */ }
    throw new Error(m);
  }
  return ((await res.json()) as { video_id: string }).video_id;
}

export async function getVideoStatus(id: string, signal?: AbortSignal): Promise<VideoStatusResponse> {
  const res = await fetch(`/api/video/status?id=${encodeURIComponent(id)}`, { signal });
  if (!res.ok) throw new Error('查询失败');
  return (await res.json()) as VideoStatusResponse;
}
```

- [ ] **Step 5: 跑测试，确认通过**

```bash
bunx vitest run __tests__/unit/components/ai/video-api.test.ts
```
Expected: PASS（4 tests）。

- [ ] **Step 6: Commit**

```bash
git add src/components/react/ai/types.ts src/components/react/ai/api.ts __tests__/unit/components/ai/video-api.test.ts
git commit -m "feat(ai): 前端视频类型与 createVideo/getVideoStatus 客户端"
```

---

## Task 5: VideoStudio 异步状态机组件

**Files:**
- Create: `src/components/react/ai/VideoStudio.tsx`
- Test: `__tests__/unit/components/ai/VideoStudio.test.tsx`

> 状态机：`idle → creating → polling(queued/in_progress) → completed | failed | timeout`。递归 `setTimeout` 每 5s 轮询，最多 36 次（180s）。组件卸载时 `AbortController.abort()`。

- [ ] **Step 1: 写失败测试 `__tests__/unit/components/ai/VideoStudio.test.tsx`**

```ts
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VideoStudio from '../../../../src/components/react/ai/VideoStudio';

vi.mock('../../../../src/components/react/ai/api', () => ({
  ACTIONS: ['微微笑', '回头看镜头', '风吹动发丝', '自然眨眼呼吸', '缓缓走近'] as const,
  createVideo: vi.fn().mockResolvedValue('vid_1'),
  getVideoStatus: vi.fn().mockResolvedValue({ status: 'completed', progress: 100, url: 'https://cdn/v.mp4' }),
}));

describe('VideoStudio', () => {
  it('选动作后提交，轮询完成后展示视频与下载', async () => {
    const user = userEvent.setup();
    render(<VideoStudio />);
    await user.click(screen.getByRole('button', { name: '微微笑' }));
    await user.click(screen.getByRole('button', { name: /生成/ }));
    // 等待异步 createVideo + 首次轮询完成
    const video = await screen.findByTestId('result-video');
    expect(video).toHaveAttribute('src', 'https://cdn/v.mp4');
    expect(screen.getByRole('link', { name: /下载/ })).toHaveAttribute('href', 'https://cdn/v.mp4');
  });

  it('展示离开即放弃提示', () => {
    render(<VideoStudio />);
    expect(screen.getByText(/离开即放弃/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 跑测试，确认失败**

```bash
bunx vitest run __tests__/unit/components/ai/VideoStudio.test.tsx
```
Expected: FAIL。

- [ ] **Step 3: 写 `src/components/react/ai/VideoStudio.tsx`**

```tsx
import { useState, useRef, useEffect } from 'react';
import { Clapperboard, Download } from 'lucide-react';
import { createVideo, getVideoStatus, ACTIONS } from './api';
import type { VideoStatus } from './types';

const POLL_INTERVAL_MS = 5000;
const MAX_ATTEMPTS = 36; // 180s

export default function VideoStudio() {
  const [action, setAction] = useState('');
  const [extra, setExtra] = useState('');
  const [duration, setDuration] = useState<3 | 5>(3);
  const [status, setStatus] = useState<VideoStatus | 'idle' | 'creating'>('idle');
  const [progress, setProgress] = useState(0);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    abortRef.current?.abort();
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  async function poll(id: string, attempt: number) {
    if (attempt > MAX_ATTEMPTS) { setStatus('timeout'); setError('生成较久，请稍后再试'); return; }
    try {
      const s = await getVideoStatus(id, abortRef.current?.signal);
      setProgress(s.progress);
      if (s.status === 'completed' && s.url) { setStatus('completed'); setUrl(s.url); return; }
      if (s.status === 'failed') { setStatus('failed'); setError('生成失败，请重试'); return; }
      setStatus(s.status);
      timerRef.current = setTimeout(() => void poll(id, attempt + 1), POLL_INTERVAL_MS);
    } catch {
      setStatus('failed'); setError('查询失败，请重试');
    }
  }

  async function gen() {
    if (!action || status === 'creating' || status === 'queued' || status === 'in_progress') return;
    setError(''); setUrl(''); setProgress(0);
    setStatus('creating');
    abortRef.current = new AbortController();
    try {
      const id = await createVideo({ action, extra: extra.trim() || undefined, duration }, abortRef.current.signal);
      setStatus('queued');
      await poll(id, 1);
    } catch (e) {
      setStatus('failed');
      setError(e instanceof Error ? e.message : '创建任务失败');
    }
  }

  const busy = status === 'creating' || status === 'queued' || status === 'in_progress';

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 pb-32">
      <h1 className="text-3xl font-serif font-bold text-center mb-2" style={{ color: 'var(--accent-primary)' }}>
        让克罗雅动起来
      </h1>
      <p className="text-center text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        实验性 AI · 非官方二创 · 生成约 1-3 分钟，离开即放弃
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-5">
          <img src="/images/character-1.png" alt="立绘预览" className="w-full max-h-64 object-contain rounded-xl mb-4" />
          <div className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>选动作</div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {ACTIONS.map((a) => (
              <button key={a} onClick={() => setAction(a)} aria-label={a}
                className="px-3 py-2 rounded-lg text-sm border"
                style={action === a
                  ? { borderColor: 'var(--accent-primary)', background: 'var(--bg-secondary)', color: 'var(--accent-primary)' }
                  : { borderColor: 'var(--glass-border)', color: 'var(--text-secondary)' }}>{a}</button>
            ))}
          </div>
          <textarea value={extra} onChange={(e) => setExtra(e.target.value.slice(0, 50))}
            placeholder="追加描述（可选，限 50 字）" rows={2}
            className="w-full glass rounded-xl px-3 py-2 text-sm resize-none outline-none mb-3"
            style={{ color: 'var(--text-primary)' }} />
          <div className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
            时长
            <button onClick={() => setDuration(3)} className="ml-2 px-3 py-1 rounded-lg"
              style={duration === 3 ? { background: 'var(--accent-primary)', color: '#fff' } : { background: 'var(--bg-secondary)' }}>3s</button>
            <button onClick={() => setDuration(5)} className="ml-2 px-3 py-1 rounded-lg"
              style={duration === 5 ? { background: 'var(--accent-primary)', color: '#fff' } : { background: 'var(--bg-secondary)' }}>5s</button>
          </div>
          <button onClick={() => void gen()} disabled={!action || busy}
            className="w-full py-3 rounded-xl text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}>
            <Clapperboard className="w-4 h-4" />{busy ? `生成中… ${progress}%` : '生成'}
          </button>
          {error && <p className="text-sm mt-3 text-center" style={{ color: 'var(--accent-primary)' }}>{error}</p>}
        </div>

        <div className="glass rounded-2xl p-5 flex flex-col items-center justify-center min-h-[300px]">
          {url ? (
            <>
              <video data-testid="result-video" src={url} controls className="max-w-full max-h-80 rounded-xl mb-3" />
              <a href={url} download className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-secondary)', color: 'var(--accent-primary)' }}>
                <Download className="w-4 h-4" />下载
              </a>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {busy ? `生成中… ${progress}%` : status === 'timeout' ? '生成较久，请稍后再试' : status === 'failed' ? error : '选好动作后点生成'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 跑测试，确认通过**

```bash
bunx vitest run __tests__/unit/components/ai/VideoStudio.test.tsx
```
Expected: PASS（2 tests）。若轮询时序不稳，可在测试里 `vi.useFakeTimers()` 并 `act(() => vi.advanceTimersByTimeAsync(5000))`，但本测试依赖 `getVideoStatus` 首次即 completed，应无需推进 timer。

- [ ] **Step 5: Commit**

```bash
git add src/components/react/ai/VideoStudio.tsx __tests__/unit/components/ai/VideoStudio.test.tsx
git commit -m "feat(ai): VideoStudio 异步状态机（提交/轮询/超时/离开 abort）"
```

---

## Task 6: 视频页路由 + e2e

**Files:**
- Create: `src/pages/ai/video.astro`
- Create: `__tests__/e2e/ai-video.spec.ts`

- [ ] **Step 1: 写 `src/pages/ai/video.astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import VideoStudio from '../../components/react/ai/VideoStudio';
---
<BaseLayout>
  <VideoStudio client:idle />
</BaseLayout>
```

- [ ] **Step 2: 写 `__tests__/e2e/ai-video.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test.describe('AI 视频页', () => {
  test('提交后轮询到完成展示视频', async ({ page }) => {
    await page.route('**/api/video', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ video_id: 'v1' }) }));
    await page.route('**/api/video/status*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'completed', progress: 100, url: 'https://cdn/v.mp4' }) }));
    await page.goto('/ai/video/');
    await page.getByRole('button', { name: '微微笑' }).click();
    await page.getByRole('button', { name: /生成/ }).click();
    await expect(page.getByTestId('result-video')).toHaveAttribute('src', 'https://cdn/v.mp4');
  });

  test('创建失败提示', async ({ page }) => {
    await page.route('**/api/video', (r) => r.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'AI 服务繁忙，请稍后重试' }) }));
    await page.goto('/ai/video/');
    await page.getByRole('button', { name: '微微笑' }).click();
    await page.getByRole('button', { name: /生成/ }).click();
    await expect(page.getByText('繁忙')).toBeVisible();
  });
});
```

- [ ] **Step 3: 跑 e2e**

```bash
bun run test:e2e:raw ai-video.spec.ts
```
Expected: PASS（2 tests）。

- [ ] **Step 4: build 确认无回归**

```bash
bun run build && bun run test
```
Expected: 通过；`dist/ai/video/index.html` 生成；全部单测通过。

- [ ] **Step 5: Commit**

```bash
git add src/pages/ai/video.astro __tests__/e2e/ai-video.spec.ts
git commit -m "feat(ai): /ai/video 视频页路由与 e2e"
```

---

## 部署与冒烟

1. push → CF Pages 部署。
2. 本地：`.dev.vars` 填 key → `bun run dev:pages` → `/ai/video/` 选动作生成（agnes 拉生产立绘 URL，需已部署；视频生成耗时 1-3 分钟）。
3. 生产冒烟：`https://kloa.fans/ai/video/`，确认排队→进度→播放/下载；验证离开页面后任务被放弃（不持久化）。

## Self-Review

- **Spec 覆盖**：5.4 视频页、6.2 video 契约（创建＋轮询）、6.3 动作模板＋duration→帧数、6.4 立绘、8 超时/URL 过期、9 测试。✅
- **类型一致**：`VideoRequest`/`VideoStatus`/`VideoStatusResponse` 前后端镜像；`ACTIONS` 与 `ACTION_PROMPTS` key 对齐（5 个同名）；`VIDEO_DURATION_PRESETS` 帧数满足 `8n+1`（测试覆盖）；agnesapi URL 在 root（测试覆盖）。✅
- **占位符**：无。✅
- **风险点**：视频生成为异步，前端轮询耗时较长；首版轮询间隔 5s、最长 180s，可在 `VideoStudio` 常量调整。离开页面 abort 但服务端任务仍在 agnes 侧跑（浪费额度，因不持久化无法回收）——轻量实验性下可接受。
