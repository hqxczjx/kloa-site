# Agnes AI 实验室 — Plan 5: 克罗雅小剧场（关键帧链长视频）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: 用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现。步骤用 checkbox（`- [ ]`）跟踪。

**Goal:** 新增「克罗雅小剧场」——用户输入故事创意 → `agnes-2.5-flash` 拆成 3 个连续分镜 → `agnes-image-2.1-flash`（以立绘为参考图）生成 4 张关键帧 → `agnes-video-v2.0` keyframes 模式（相邻段共享边界关键帧）生成 3 段视频 → 前端连播成一个约 15 秒的连续长视频。

**Architecture:** 关键帧链工作流：段 i 的请求为 `extra_body.image: [K(i-1), K_i]` + `extra_body.mode: "keyframes"`，agnes 会把输入图片保持为成片中的实际画面帧，因此相邻两段共享同一张边界帧图 → 拼接处画面一致，连播即连续长视频。全链路只用已接入的三个免费模型，不加新依赖。后端新增 1 个端点（`POST /api/storyboard`）＋扩展 1 个端点（`POST /api/video` 关键帧分支）；关键帧生成**复用现有 `/api/image`**（`STYLE_PROMPTS[style] ?? style` 天然支持自定义描述传入，且自动带立绘参考图保角色一致）；视频段创建后**并行轮询**（复用现有 `/api/video/status`）。

**Tech Stack:** 同 Plan 1–4（Cloudflare Workers + Static Assets、Astro islands、React 19、vitest + Playwright）。

**前置依赖:** Plan 1–4 已完成（`/api/chat`、`/api/image`、`/api/video`(+status)、AI hub 均已上线）。

**调研依据（联网调研结论，2026-08-19）:**
- V2.0 单次上限 `num_frames ≤ 441`（`8n+1`）≈ 18.3s@24fps，长视频只能分段。
- 官方语义（wiki.agnes-ai.com/zh-Hans/docs/agnes-video-v20 + GitHub Issue #115）：顶层 `image` = 图生视频首帧；`extra_body.image` 数组 + `extra_body.mode: "keyframes"` = 关键帧动画，**输入图会成为成片实际画面帧**（支持首帧+中间帧+尾帧）。
- `agnes-video-2.5`（首尾帧/视频 reference）尚未上线且 4–12s/段、正式计费含输入视频秒数，不采用。
- V2.0 与 Image 2.1 Flash 当前均免费无限。

**关键约束:**
- MVP 固定 **3 段 × 5s**（`num_frames: 121`，preset 已有）→ 总长 ~15s；关键帧 **4 张**（段数 +1）。
- 关键帧画幅 `16:9`（视频默认 1152×768 会被 agnes 标准化到 16:9 档位，`/api/image` 传 `ratio: '16:9'` 对齐）。
- 分镜输出必须是**结构化 JSON**（frames ×4 + motions ×3），后端做容错解析与数量校验，失败即 502 让用户重试。
- 限流复用现有 `checkRateLimit`（10 次/60s/IP）：一次完整流程 = storyboard 1 + image 4（串行）+ video create 3（并行）≈ 8 次，不超限；`/api/video/status` 无限流。
- 每段轮询上限 180s（36 × 5s），3 段并行 → 全程预计 **3–8 分钟**，页面必须提示「离开即放弃」。
- 连播衔接处有约 1 帧的边界帧停留（段尾＝下段头），这是关键帧链的设计特性，可接受。

---

## 文件结构

**修改（后端）:**
| 文件 | 改动 |
|---|---|
| `worker/_lib/config.ts` | 加 `STORY_SCENE_COUNT`、`STORY_IDEA_MAX_CHARS`、`STORYBOARD_MAX_TOKENS` |
| `worker/_lib/prompts.ts` | 加 `Storyboard` 类型、`buildStoryboardMessages`、`parseStoryboard` |
| `worker/api/video.ts` | `VideoRequest` 扩展 + keyframes 分支 + `readUpstream` 提取 |
| `worker/index.ts` | 添加路由 `POST /api/storyboard` |

**新建（后端）:**
| 文件 | 职责 |
|---|---|
| `worker/api/storyboard.ts` | 分镜端点：chat 非流式调用 + JSON 容错解析 |

**修改（前端）:**
| 文件 | 改动 |
|---|---|
| `src/components/react/ai/types.ts` | 加 `KeyframeVideoRequest` |
| `src/components/react/ai/api.ts` | 加 `StoryboardResponse`、`createStoryboard`、`createKeyframeVideo` |
| `src/pages/ai/index.astro` | hub 加第 4 张卡片，grid 改 4 列 |

**新建（前端）:**
| 文件 | 职责 |
|---|---|
| `src/components/react/ai/StoryStudio.tsx` | 小剧场 island：创意→分镜→关键帧→视频段→连播 |
| `src/pages/ai/story.astro` | 小剧场页路由 |

**测试:**
| 文件 | 覆盖 |
|---|---|
| `__tests__/unit/worker/storyboard-prompts.test.ts` | `buildStoryboardMessages`、`parseStoryboard`（围栏/数量/非法 JSON） |
| `__tests__/unit/worker/storyboard.test.ts` | 端点：idea 校验、非流式调用、容错解析、上游错误归一 |
| `__tests__/unit/worker/video-keyframes.test.ts` | keyframes 分支：`extra_body` 结构、URL 校验、prompt 校验 |
| `__tests__/unit/components/ai/story-api.test.ts` | `createStoryboard`、`createKeyframeVideo` |
| `__tests__/unit/components/ai/StoryStudio.test.tsx` | 编排状态机：全链路 mock 走通、段失败容错 |
| `__tests__/e2e/ai-story.spec.ts` | mock 全链路 + 连播切换 |

---

## Task 1: config 扩展 + 分镜 prompt 与解析

**Files:**
- Modify: `worker/_lib/config.ts`
- Modify: `worker/_lib/prompts.ts`
- Test: `__tests__/unit/worker/storyboard-prompts.test.ts`

- [x] **Step 1: 在 `worker/_lib/config.ts` 末尾追加**

```ts
// 小剧场（关键帧链长视频）
export const STORY_SCENE_COUNT = 3;        // 段数（MVP 固定 3，关键帧 = 段数+1）
export const STORY_IDEA_MAX_CHARS = 200;   // 故事创意字数上限
export const STORYBOARD_MAX_TOKENS = 1024; // 分镜 JSON 输出 token 上限（4 帧+3 动作英文描述）
```

- [x] **Step 2: 在 `worker/_lib/prompts.ts` 末尾追加**

```ts
export interface Storyboard {
  frames: string[];   // 关键帧画面描述（英文），长度 = 段数 + 1
  motions: string[];  // 段内动作描述（英文），长度 = 段数
}

export function buildStoryboardMessages(idea: string, scenes: number): AgnesChatMessage[] {
  const system = [
    `You are a storyboard artist for short anime videos.`,
    `Split the user's idea into exactly ${scenes} consecutive scenes featuring the same anime girl character (Kloa).`,
    `Reply with ONLY a JSON object, no markdown fences, no extra text, exactly in this shape:`,
    `{"frames":["...","..."],"motions":["...","..."]}`,
    `"frames" must contain exactly ${scenes + 1} English image prompts: the opening frame, then one ending frame per scene.`,
    `Each frame prompt describes the character, setting, composition and lighting in one sentence, keeping her appearance and art style consistent.`,
    `"motions" must contain exactly ${scenes} English motion prompts: how the character and camera move from frames[i] to frames[i+1] within about 5 seconds, one sentence each.`,
  ].join(' ');
  return [
    { role: 'system', content: system },
    { role: 'user', content: idea },
  ];
}

export function parseStoryboard(content: string, scenes: number): Storyboard | null {
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(content.slice(start, end + 1)) as { frames?: unknown; motions?: unknown };
    if (!Array.isArray(parsed.frames) || !Array.isArray(parsed.motions)) return null;
    if (parsed.frames.length !== scenes + 1 || parsed.motions.length !== scenes) return null;
    if (!parsed.frames.every((f) => typeof f === 'string') || !parsed.motions.every((m) => typeof m === 'string')) return null;
    const frames = parsed.frames.map((f) => f.trim());
    const motions = parsed.motions.map((m) => m.trim());
    if (frames.some((f) => !f) || motions.some((m) => !m)) return null;
    return { frames, motions };
  } catch {
    return null;
  }
}
```

- [x] **Step 3: 写测试 `__tests__/unit/worker/storyboard-prompts.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { buildStoryboardMessages, parseStoryboard } from '../../../worker/_lib/prompts';

describe('storyboard prompts', () => {
  it('buildStoryboardMessages：system 说明帧数/动作数，user 为创意', () => {
    const msgs = buildStoryboardMessages('克罗雅追蝴蝶', 3);
    expect(msgs).toHaveLength(2);
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content).toContain('exactly 4');
    expect(msgs[0].content).toContain('exactly 3');
    expect(msgs[1]).toEqual({ role: 'user', content: '克罗雅追蝴蝶' });
  });

  it('parseStoryboard：正常 JSON', () => {
    const ok = parseStoryboard('{"frames":["a","b","c","d"],"motions":["m1","m2","m3"]}', 3);
    expect(ok).toEqual({ frames: ['a', 'b', 'c', 'd'], motions: ['m1', 'm2', 'm3'] });
  });

  it('parseStoryboard：容忍 markdown 围栏与前后噪声', () => {
    const noisy = '好的，如下：\n```json\n{"frames":["a","b","c","d"],"motions":["m1","m2","m3"]}\n```\n希望有帮助';
    expect(parseStoryboard(noisy, 3)).toEqual({ frames: ['a', 'b', 'c', 'd'], motions: ['m1', 'm2', 'm3'] });
  });

  it('parseStoryboard：数量不符返回 null', () => {
    expect(parseStoryboard('{"frames":["a","b"],"motions":["m1"]}', 3)).toBeNull();
    expect(parseStoryboard('{"frames":["a","b","c","d"],"motions":["m1","m2"]}', 3)).toBeNull(); // motions-only mismatch
    expect(parseStoryboard('{"frames":["a","b"],"motions":["m1","m2","m3"]}', 3)).toBeNull(); // frames-only mismatch
  });

  it('parseStoryboard：非 JSON / 空串 / 空白项返回 null', () => {
    expect(parseStoryboard('直接聊天不输出 JSON', 3)).toBeNull();
    expect(parseStoryboard('', 3)).toBeNull();
    expect(parseStoryboard('{"frames":["a","","c","d"],"motions":["m1","m2","m3"]}', 3)).toBeNull();
  });

  it('parseStoryboard：非字符串项返回 null', () => {
    expect(parseStoryboard('{"frames":["a",null,"c","d"],"motions":["m1","m2","m3"]}', 3)).toBeNull();
  });
});
```

- [x] **Step 4: 跑测试，确认通过**

```bash
bunx vitest run __tests__/unit/worker/storyboard-prompts.test.ts
```
Expected: PASS（5 tests）。

- [x] **Step 5: Commit**

```bash
git add worker/_lib/config.ts worker/_lib/prompts.ts __tests__/unit/worker/storyboard-prompts.test.ts
git commit -m "feat(ai): 小剧场分镜 prompt 构建与 JSON 容错解析"
```

---

## Task 2: `POST /api/storyboard` 分镜端点

**Files:**
- Create: `worker/api/storyboard.ts`
- Modify: `worker/index.ts`（添加路由）
- Test: `__tests__/unit/worker/storyboard.test.ts`

- [x] **Step 1: 写失败测试 `__tests__/unit/worker/storyboard.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

function makeCache() {
  const store = new Map<string, Response>();
  return {
    async match(r: Request) { const h = store.get(new URL(r.url).pathname); return h ? h.clone() : undefined; },
    async put(r: Request, res: Response) { store.set(new URL(r.url).pathname, res.clone()); },
  } as unknown as Cache;
}

function chatContent(content: string): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
}

const VALID = '{"frames":["f0","f1","f2","f3"],"motions":["m0","m1","m2"]}';

async function call(body: unknown, env: { AGNES_API_KEY: string }, fetchMock: typeof fetch) {
  const mod = await import('../../../worker/api/storyboard');
  globalThis.fetch = fetchMock as typeof fetch;
  globalThis.caches = { default: makeCache() } as unknown as typeof caches;
  const request = new Request('https://kloa.fans/api/storyboard', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '3.3.3.3' },
    body: JSON.stringify(body),
  });
  return mod.storyboardHandler(request, env);
}

describe('storyboard endpoint', () => {
  beforeEach(() => vi.resetModules());

  it('空 idea 返回 400', async () => {
    const res = await call({ idea: '  ' }, { AGNES_API_KEY: 'k' }, vi.fn());
    expect(res.status).toBe(400);
  });

  it('非字符串 idea 返回 400', async () => {
    const res = await call({ idea: 5 }, { AGNES_API_KEY: 'k' }, vi.fn());
    expect(res.status).toBe(400);
  });

  it('超长 idea 返回 400', async () => {
    const res = await call({ idea: '长'.repeat(201) }, { AGNES_API_KEY: 'k' }, vi.fn());
    expect(res.status).toBe(400);
  });

  it('无 key 返回 503', async () => {
    const res = await call({ idea: 'x' }, { AGNES_API_KEY: '' }, vi.fn());
    expect(res.status).toBe(503);
  });

  it('成功：非流式调用 chat 并返回解析后的分镜', async () => {
    const fetchMock = vi.fn().mockResolvedValue(chatContent(`\`\`\`json\n${VALID}\n\`\`\``));
    const res = await call({ idea: '克罗雅追蝴蝶' }, { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.frames).toHaveLength(4);
    expect(body.motions).toHaveLength(3);
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.stream).toBe(false);
    expect(sent.model).toBe('agnes-2.5-flash');
    expect(sent.messages[0].role).toBe('system');
    expect(sent.messages[1].content).toBe('克罗雅追蝴蝶');
  });

  it('上游输出数量不符返回 502', async () => {
    const fetchMock = vi.fn().mockResolvedValue(chatContent('{"frames":["a"],"motions":[]}'));
    const res = await call({ idea: 'x' }, { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(502);
  });

  it('上游 500 归一为 502', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('', { status: 500 }));
    const res = await call({ idea: 'x' }, { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(502);
  });
});
```

- [x] **Step 2: 跑测试，确认失败**

```bash
bunx vitest run __tests__/unit/worker/storyboard.test.ts
```
Expected: FAIL（模块不存在）。

- [x] **Step 3: 写 `worker/api/storyboard.ts`**

```ts
import { buildStoryboardMessages, parseStoryboard } from '../_lib/prompts';
import { agnesChatUrl, agnesHeaders, normalizeAgnesError } from '../_lib/agnes';
import { checkRateLimit, clientIP } from '../_lib/ratelimit';
import { CHAT_MODEL, STORY_SCENE_COUNT, STORY_IDEA_MAX_CHARS, STORYBOARD_MAX_TOKENS } from '../_lib/config';
import type { Env } from '../_lib/types';

interface StoryboardRequest { idea?: string; }

export async function storyboardHandler(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);
  if (!(await checkRateLimit(clientIP(request), caches.default)).allowed) {
    return json({ error: '操作太频繁，请稍后再试' }, 429);
  }

  let body: StoryboardRequest;
  try { body = (await request.json()) as StoryboardRequest; } catch { return json({ error: '请求格式有误' }, 400); }
  const idea = typeof body?.idea === 'string' ? body.idea.trim() : '';
  if (!idea) return json({ error: '请输入故事创意' }, 400);
  if (idea.length > STORY_IDEA_MAX_CHARS) return json({ error: `创意过长（限 ${STORY_IDEA_MAX_CHARS} 字）` }, 400);
  if (!env.AGNES_API_KEY) return json({ error: '服务未配置' }, 503);

  const upstream = await fetch(agnesChatUrl(), {
    method: 'POST',
    headers: agnesHeaders(env.AGNES_API_KEY),
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: buildStoryboardMessages(idea, STORY_SCENE_COUNT),
      stream: false,
      max_tokens: STORYBOARD_MAX_TOKENS,
    }),
  });

  if (!upstream.ok) {
    const { status, message } = normalizeAgnesError(upstream.status);
    return json({ error: message }, status);
  }
  const data = await upstream.json() as { choices?: { message?: { content?: string } }[] };
  const storyboard = parseStoryboard(data.choices?.[0]?.message?.content ?? '', STORY_SCENE_COUNT);
  if (!storyboard) return json({ error: '分镜生成失败，请重试' }, 502);
  return json(storyboard, 200);
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
```

- [x] **Step 4: 跑测试，确认通过**

```bash
bunx vitest run __tests__/unit/worker/storyboard.test.ts
```
Expected: PASS（7 tests）。

- [x] **Step 5: 在 `worker/index.ts` 添加路由**

在 `import { createVideoHandler } from './api/video';` 之后加：

```ts
import { storyboardHandler } from './api/storyboard';
```

在 fetch handler 的 `/api/video` 路由之前加：

```ts
    if (url.pathname === '/api/storyboard' && request.method === 'POST') {
      return storyboardHandler(request, env);
    }
```

- [x] **Step 6: 跑全部 worker 测试确认无回归，然后 Commit**

```bash
bunx vitest run __tests__/unit/worker/
git add worker/api/storyboard.ts worker/index.ts __tests__/unit/worker/storyboard.test.ts
git commit -m "feat(ai): /api/storyboard 分镜端点（chat 非流式 + JSON 容错）"
```

---

## Task 3: `POST /api/video` 关键帧分支

**Files:**
- Modify: `worker/api/video.ts`（整文件替换为下方内容）
- Test: `__tests__/unit/worker/video-keyframes.test.ts`

- [x] **Step 1: 写失败测试 `__tests__/unit/worker/video-keyframes.test.ts`**

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
  const mod = await import('../../../worker/api/video');
  globalThis.fetch = fetchMock as typeof fetch;
  globalThis.caches = { default: makeCache() } as unknown as typeof caches;
  const request = new Request('https://kloa.fans/api/video', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '3.3.3.3' },
    body: JSON.stringify(body),
  });
  return mod.createVideoHandler(request, env);
}

const OK_UPSTREAM = () => Promise.resolve(new Response(
  JSON.stringify({ video_id: 'vid_kf', status: 'queued' }), { status: 200 }
));

const KF_REQ = {
  prompt: 'the character walks from the garden gate to the fountain',
  first_frame: 'https://cdn/k0.png',
  last_frame: 'https://cdn/k1.png',
  duration: 5,
};

describe('video create endpoint — keyframes 分支', () => {
  beforeEach(() => vi.resetModules());

  it('关键帧模式：extra_body.image 顺序为首尾，mode=keyframes，顶层无 image', async () => {
    const fetchMock = vi.fn().mockImplementation(OK_UPSTREAM);
    const res = await call(KF_REQ, { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(200);
    expect((await res.json()).video_id).toBe('vid_kf');
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.model).toBe('agnes-video-v2.0');
    expect(sent.extra_body).toEqual({ image: ['https://cdn/k0.png', 'https://cdn/k1.png'], mode: 'keyframes' });
    expect(sent.image).toBeUndefined();
    expect(sent.num_frames).toBe(121);
    expect(sent.frame_rate).toBe(24);
  });

  it('关键帧模式：duration 缺省映射 3s preset（81 帧）', async () => {
    const fetchMock = vi.fn().mockImplementation(OK_UPSTREAM);
    const res = await call({ ...KF_REQ, duration: undefined }, { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(200);
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.num_frames).toBe(81);
  });

  it('关键帧模式：prompt 缺失返回 400', async () => {
    const res = await call({ first_frame: 'https://a/1.png', last_frame: 'https://a/2.png' }, { AGNES_API_KEY: 'k' }, vi.fn());
    expect(res.status).toBe(400);
  });

  it('关键帧模式：first_frame 非法 URL 返回 400', async () => {
    const res = await call({ ...KF_REQ, first_frame: 'not-a-url' }, { AGNES_API_KEY: 'k' }, vi.fn());
    expect(res.status).toBe(400);
  });

  it('关键帧模式：只传一端帧返回 400', async () => {
    const res = await call({ prompt: 'x', first_frame: 'https://a/1.png' }, { AGNES_API_KEY: 'k' }, vi.fn());
    expect(res.status).toBe(400);
  });

  it('关键帧模式：非字符串 prompt 返回 400', async () => {
    const res = await call({ prompt: 5, first_frame: 'https://a/1.png', last_frame: 'https://a/2.png' }, { AGNES_API_KEY: 'k' }, vi.fn());
    expect(res.status).toBe(400);
  });

  it('body 为 null 返回 400', async () => {
    const res = await call(null, { AGNES_API_KEY: 'k' }, vi.fn());
    expect(res.status).toBe(400);
  });

  it('关键帧模式：javascript: 协议 URL 返回 400（协议白名单）', async () => {
    const res = await call({ ...KF_REQ, first_frame: 'javascript:alert(1)' }, { AGNES_API_KEY: 'k' }, vi.fn());
    expect(res.status).toBe(400);
  });

  it('动作模式回归：仍走顶层 image 且不受影响', async () => {
    const fetchMock = vi.fn().mockImplementation(OK_UPSTREAM);
    const res = await call({ action: '微微笑', duration: 5 }, { AGNES_API_KEY: 'k' }, fetchMock);
    expect(res.status).toBe(200);
    const sent = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(sent.image).toContain('kloa.fans');
    expect(sent.extra_body).toBeUndefined();
  });
});
```

- [x] **Step 2: 跑测试，确认失败**

```bash
bunx vitest run __tests__/unit/worker/video-keyframes.test.ts
```
Expected: FAIL（extra_body 分支不存在）。

- [x] **Step 3: 用下方内容整体替换 `worker/api/video.ts`**

```ts
import { buildVideoPrompt, ACTION_PROMPTS } from '../_lib/prompts';
import { agnesHeaders, normalizeAgnesError } from '../_lib/agnes';
import { checkRateLimit, clientIP } from '../_lib/ratelimit';
import { AGNES_BASE_URL, VIDEO_MODEL, VIDEO_DURATION_PRESETS, DEFAULT_CHARACTER_IMAGE_URL } from '../_lib/config';
import type { Env } from '../_lib/types';

interface VideoRequest {
  action?: string;
  extra?: string;
  duration?: 3 | 5;
  // 关键帧模式（小剧场长视频分段）
  prompt?: string;
  first_frame?: string;
  last_frame?: string;
}

function isHttpUrl(s: unknown): s is string {
  if (typeof s !== 'string' || !s) return false;
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export async function createVideoHandler(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);
  if (!(await checkRateLimit(clientIP(request), caches.default)).allowed) {
    return json({ error: '操作太频繁，请稍后再试' }, 429);
  }

  let body: VideoRequest;
  try { body = (await request.json()) as VideoRequest; } catch { return json({ error: '请求格式有误' }, 400); }
  if (!body || typeof body !== 'object') return json({ error: '请求格式有误' }, 400);
  if (!env.AGNES_API_KEY) return json({ error: '服务未配置' }, 503);

  const duration: 3 | 5 = body.duration === 5 ? 5 : 3;
  const preset = VIDEO_DURATION_PRESETS[duration];

  // 关键帧模式：首尾帧约束的段生成（extra_body.image 会成为成片实际画面帧）
  if (body.first_frame !== undefined || body.last_frame !== undefined) {
    if (!isHttpUrl(body.first_frame) || !isHttpUrl(body.last_frame)) {
      return json({ error: '关键帧 URL 有误' }, 400);
    }
    const kfPrompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!kfPrompt || kfPrompt.length > 200) return json({ error: '请输入动作描述' }, 400);

    const upstream = await fetch(`${AGNES_BASE_URL}/videos`, {
      method: 'POST',
      headers: agnesHeaders(env.AGNES_API_KEY),
      body: JSON.stringify({
        model: VIDEO_MODEL,
        prompt: kfPrompt,
        extra_body: { image: [body.first_frame, body.last_frame], mode: 'keyframes' },
        num_frames: preset.num_frames,
        frame_rate: preset.frame_rate,
      }),
    });
    return readUpstream(upstream);
  }

  // 动作模板模式（原有行为）
  if (!body?.action || !ACTION_PROMPTS[body.action]) return json({ error: '请选择动作' }, 400);
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
  return readUpstream(upstream);
}

async function readUpstream(upstream: Response): Promise<Response> {
  if (!upstream.ok) {
    const { status, message } = normalizeAgnesError(upstream.status);
    return json({ error: message }, status);
  }
  const data = await upstream.json() as { video_id?: string; id?: string };
  const video_id = data.video_id ?? data.id;
  if (!video_id) return json({ error: '创建任务失败，请重试' }, 502);
  return json({ video_id }, 200);
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
```

> 注意：`if (!env.AGNES_API_KEY)` 从 action 校验后挪到了两分支之前——现有测试「缺 action 返 400」传了合法 key、「无 key 返 503」传了合法 action，均不受影响。

- [x] **Step 4: 跑新测试 + 旧 video 测试，确认全部通过**

```bash
bunx vitest run __tests__/unit/worker/video-keyframes.test.ts __tests__/unit/worker/video-create.test.ts
```
Expected: PASS（9 + 4 tests）。

- [x] **Step 5: Commit**

```bash
git add worker/api/video.ts __tests__/unit/worker/video-keyframes.test.ts
git commit -m "feat(ai): /api/video 支持关键帧模式（extra_body.image 首尾帧链）"
```

---

## Task 4: 前端类型 + 小剧场 API 客户端

**Files:**
- Modify: `src/components/react/ai/types.ts`
- Modify: `src/components/react/ai/api.ts`
- Test: `__tests__/unit/components/ai/story-api.test.ts`

- [x] **Step 1: 在 `src/components/react/ai/types.ts` 末尾追加**

```ts
export interface KeyframeVideoRequest {
  prompt: string;
  first_frame: string;
  last_frame: string;
  duration: 3 | 5;
}
```

- [x] **Step 2: 写失败测试 `__tests__/unit/components/ai/story-api.test.ts`**

```ts
import { describe, it, expect, vi } from 'vitest';
import { createStoryboard, createKeyframeVideo } from '../../../../src/components/react/ai/api';

describe('story api', () => {
  it('createStoryboard 返回 frames/motions', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ frames: ['f0', 'f1', 'f2', 'f3'], motions: ['m0', 'm1', 'm2'] }), { status: 200 }
    )));
    const sb = await createStoryboard('克罗雅追蝴蝶');
    expect(sb.frames).toHaveLength(4);
    expect(sb.motions).toHaveLength(3);
    const sent = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
    expect(sent).toEqual({ idea: '克罗雅追蝴蝶' });
  });

  it('createStoryboard 错误抛文案', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: '分镜生成失败，请重试' }), { status: 502 })));
    await expect(createStoryboard('x')).rejects.toThrow('分镜生成失败，请重试');
  });

  it('createKeyframeVideo 发送关键帧字段并返回 video_id', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ video_id: 'v9' }), { status: 200 })));
    const id = await createKeyframeVideo({ prompt: 'walk', first_frame: 'https://a/1.png', last_frame: 'https://a/2.png', duration: 5 });
    expect(id).toBe('v9');
    const sent = JSON.parse((vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string);
    expect(sent).toEqual({ prompt: 'walk', first_frame: 'https://a/1.png', last_frame: 'https://a/2.png', duration: 5 });
  });

  it('createKeyframeVideo 错误抛文案', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: '关键帧 URL 有误' }), { status: 400 })));
    await expect(createKeyframeVideo({ prompt: 'x', first_frame: 'bad', last_frame: 'bad', duration: 5 })).rejects.toThrow('关键帧 URL 有误');
  });
});
```

- [x] **Step 3: 跑测试，确认失败**

```bash
bunx vitest run __tests__/unit/components/ai/story-api.test.ts
```
Expected: FAIL。

- [x] **Step 4: 在 `src/components/react/ai/api.ts` 末尾追加**

```ts
import type { KeyframeVideoRequest } from './types';

export interface StoryboardResponse {
  frames: string[];
  motions: string[];
}

export async function createStoryboard(idea: string, signal?: AbortSignal): Promise<StoryboardResponse> {
  const res = await fetch('/api/storyboard', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idea }),
    signal,
  });
  if (!res.ok) {
    let m = '分镜生成失败，请重试';
    try { m = ((await res.json()) as { error?: string }).error ?? m; } catch { /* 默认 */ }
    throw new Error(m);
  }
  return (await res.json()) as StoryboardResponse;
}

export async function createKeyframeVideo(req: KeyframeVideoRequest, signal?: AbortSignal): Promise<string> {
  const res = await fetch('/api/video', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.ok) {
    let m = '创建任务失败，请重试';
    try { m = ((await res.json()) as { error?: string }).error ?? m; } catch { /* 默认 */ }
    throw new Error(m);
  }
  return ((await res.json()) as { video_id: string }).video_id;
}
```

> 注：`api.ts` 顶部已有 `import type { ... } from './types'` 一行，可直接把 `KeyframeVideoRequest` 并入该行，避免重复 import 语句（ESLint `no-duplicate-imports`）。实现时写为修改顶部 import 行 + 末尾追加函数。

- [x] **Step 5: 跑测试，确认通过**

```bash
bunx vitest run __tests__/unit/components/ai/story-api.test.ts
```
Expected: PASS（4 tests）。

- [x] **Step 6: Commit**

```bash
git add src/components/react/ai/types.ts src/components/react/ai/api.ts __tests__/unit/components/ai/story-api.test.ts
git commit -m "feat(ai): 前端小剧场类型与 createStoryboard/createKeyframeVideo 客户端"
```

---

## Task 5: StoryStudio 编排组件

**Files:**
- Create: `src/components/react/ai/StoryStudio.tsx`
- Test: `__tests__/unit/components/ai/StoryStudio.test.tsx`

> 编排状态机：`idle → storyboarding → frames（串行 K0..K3）→ videos（3 段并行创建+并行轮询）→ done/failed`。轮询复用 `getVideoStatus`，每段 36 × 5s。连播：`onEnded` 切下一段。段失败不中断其他段，展示已完成部分。

- [x] **Step 1: 写失败测试 `__tests__/unit/components/ai/StoryStudio.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StoryStudio from '../../../../src/components/react/ai/StoryStudio';

vi.mock('../../../../src/components/react/ai/api', () => ({
  createStoryboard: vi.fn().mockResolvedValue({
    frames: ['f0', 'f1', 'f2', 'f3'],
    motions: ['m0', 'm1', 'm2'],
  }),
  generateImage: vi.fn()
    .mockResolvedValueOnce('https://cdn/k0.png')
    .mockResolvedValueOnce('https://cdn/k1.png')
    .mockResolvedValueOnce('https://cdn/k2.png')
    .mockResolvedValueOnce('https://cdn/k3.png'),
  createKeyframeVideo: vi.fn()
    .mockResolvedValueOnce('vid_0')
    .mockResolvedValueOnce('vid_1')
    .mockResolvedValueOnce('vid_2'),
  getVideoStatus: vi.fn().mockResolvedValue({ status: 'completed', progress: 100, url: 'https://cdn/seg.mp4' }),
}));

describe('StoryStudio', () => {
  it('全链路：提交创意 → 3 个连播视频 + 各段下载', async () => {
    const user = userEvent.setup();
    render(<StoryStudio />);
    await user.type(screen.getByPlaceholderText('故事创意'), '克罗雅在花园里追蝴蝶');
    await user.click(screen.getByRole('button', { name: /生成小剧场/ }));

    const video = await screen.findByTestId('story-video-0');
    expect(video).toHaveAttribute('src', 'https://cdn/seg.mp4');
    expect(screen.getAllByRole('link', { name: /下载/ })).toHaveLength(3);
    expect(screen.getByRole('button', { name: '第 3 段' })).toBeEnabled();
    expect(screen.getByText('小剧场完成')).toBeInTheDocument();
  });

  it('关键帧按顺序串行生成且相邻段共享边界帧', async () => {
    const user = userEvent.setup();
    render(<StoryStudio />);
    await user.type(screen.getByPlaceholderText('故事创意'), 'x');
    await user.click(screen.getByRole('button', { name: /生成小剧场/ }));
    await screen.findByTestId('story-video-0');
    const { createKeyframeVideo } = await import('../../../../src/components/react/ai/api');
    const calls = vi.mocked(createKeyframeVideo).mock.calls.map((c) => c[0]);
    expect(calls).toEqual([
      { prompt: 'm0', first_frame: 'https://cdn/k0.png', last_frame: 'https://cdn/k1.png', duration: 5 },
      { prompt: 'm1', first_frame: 'https://cdn/k1.png', last_frame: 'https://cdn/k2.png', duration: 5 },
      { prompt: 'm2', first_frame: 'https://cdn/k2.png', last_frame: 'https://cdn/k3.png', duration: 5 },
    ]);
  });

  it('展示离开即放弃提示', () => {
    render(<StoryStudio />);
    expect(screen.getByText(/离开即放弃/)).toBeInTheDocument();
  });
});
```

> **执行注记(质量审查后追加)**:实现与首轮测试通过后,spec 审查发现 mock 用常量 URL 使"边界帧共享"断言恒真,已改为 `mockResolvedValueOnce`×4 可区分 URL(commit 6c6bd17);质量审查发现组件规格本身 2 个缺陷并已修复(commit 89795b4):①run() 开头先 `abortRef.current?.abort()` + 清空 timersRef,且 pollSeg 显式接收本 run 的 signal 并在 then/catch 检查 aborted——否则 retry 后旧轮询会把上一次 run 的视频 URL 写进新 segs;②新增 useEffect:全段终态后置回 idle——否则 video 阶段失败后按钮永久禁用。同 commit 将段 create 失败改为 **seg 级 catch**(`updateSeg(i, failed)` 而非整轮 reject)——与头注"段失败不中断其他段"一致,也使上述原始竞态场景在 UI 上不可达(retry 仅在全段终态、即无存活轮询后可达),abort/clear 三行因此是纵深防御;回归测试最终形态为「retry 数据隔离」断言(run#2 的展示/下载不混入旧 run 轮询产物,commit 5e7487f)。最终 5 用例、组件目录 48 tests。

- [x] **Step 2: 跑测试，确认失败**

```bash
bunx vitest run __tests__/unit/components/ai/StoryStudio.test.tsx
```
Expected: FAIL（组件不存在）。

- [x] **Step 3: 写 `src/components/react/ai/StoryStudio.tsx`**

```tsx
import { useState, useRef, useEffect } from 'react';
import { Clapperboard, Download } from 'lucide-react';
import { createStoryboard, generateImage, createKeyframeVideo, getVideoStatus } from './api';
import type { VideoStatus } from './types';

const POLL_INTERVAL_MS = 5000;
const MAX_ATTEMPTS = 36; // 每段 180s

type Phase = 'idle' | 'storyboarding' | 'frames' | 'videos';

interface SegState {
  status: VideoStatus | 'creating';
  progress: number;
  url?: string;
}

const PHASE_TEXT: Record<Phase, string> = {
  idle: '选好创意后点生成',
  storyboarding: '正在拆分故事分镜…',
  frames: '正在生成关键帧…',
  videos: '正在生成视频段…',
};

export default function StoryStudio() {
  const [idea, setIdea] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [stepDetail, setStepDetail] = useState('');
  const [error, setError] = useState('');
  const [frameUrls, setFrameUrls] = useState<string[]>([]);
  const [segs, setSegs] = useState<SegState[]>([]);
  const [playIndex, setPlayIndex] = useState(0);

  const abortRef = useRef<AbortController | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => {
    abortRef.current?.abort();
    timersRef.current.forEach(clearTimeout);
  }, []);

  function updateSeg(i: number, patch: Partial<SegState>) {
    setSegs(prev => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  }

  // 显式接收本 run 的 signal:retry/卸载 abort 后,在途轮询不得再写 segs(catch 也不得标 failed)
  function pollSeg(i: number, id: string, attempt: number, signal: AbortSignal) {
    if (attempt > MAX_ATTEMPTS) { updateSeg(i, { status: 'timeout' }); return; }
    getVideoStatus(id, signal).then(s => {
      if (signal.aborted) return;
      updateSeg(i, { status: s.status, progress: s.progress, url: s.url ?? undefined });
      if (s.status === 'completed' && s.url) return;
      if (s.status === 'failed' || s.status === 'timeout') return;
      const t = setTimeout(() => pollSeg(i, id, attempt + 1, signal), POLL_INTERVAL_MS);
      timersRef.current.push(t);
    }).catch(() => { if (!signal.aborted) updateSeg(i, { status: 'failed' }); });
  }

  async function run() {
    const text = idea.trim();
    if (!text || phase !== 'idle') return;
    setError(''); setFrameUrls([]); setSegs([]); setPlayIndex(0); setStepDetail('');
    // 防跨 run 污染:先掐断上一次 run 的在途轮询与 timer,否则旧 pollSeg 会挂到新 signal 上,
    // 把旧任务的视频 URL 按 index 写进新 run 的 segs
    abortRef.current?.abort();
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    try {
      setPhase('storyboarding');
      const sb = await createStoryboard(text, signal);

      setPhase('frames');
      const urls: string[] = [];
      for (let i = 0; i < sb.frames.length; i++) {
        setStepDetail(`关键帧 ${i + 1}/${sb.frames.length}`);
        urls.push(await generateImage({ style: sb.frames[i], size: '1K', ratio: '16:9' }, signal));
        setFrameUrls([...urls]);
      }

      setPhase('videos'); setStepDetail('');
      setSegs(sb.motions.map(() => ({ status: 'creating' as const, progress: 0 })));
      await Promise.all(sb.motions.map((motion, i) =>
        createKeyframeVideo(
          { prompt: motion, first_frame: urls[i], last_frame: urls[i + 1], duration: 5 },
          signal,
        ).then(id => { pollSeg(i, id, 1, signal); })
          .catch(() => { updateSeg(i, { status: 'failed' }); }),
      ));
    } catch (e) {
      if (signal.aborted) return;
      setPhase('idle');
      setError(e instanceof Error ? e.message : '生成失败，请重试');
    }
  }

  // 全段终态(完成/失败/超时)后解除 busy,允许重新生成——否则 video 阶段失败后按钮永久禁用
  useEffect(() => {
    if (phase === 'videos' && segs.length > 0 && segs.every(s =>
      (s.status === 'completed' && s.url) || s.status === 'failed' || s.status === 'timeout'
    )) setPhase('idle');
  }, [phase, segs]);

  const busy = phase !== 'idle';
  const segUrls = segs.map(s => s.url);
  const allDone = segs.length > 0 && segs.every(s => s.status === 'completed' && s.url);
  const someFailed = segs.some(s => s.status === 'failed' || s.status === 'timeout');

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 pb-32">
      <h1 className="text-3xl font-serif font-bold text-center mb-2" style={{ color: 'var(--accent-primary)' }}>
        克罗雅小剧场
      </h1>
      <p className="text-center text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
        实验性 AI · 非官方二创 · 一个创意生成约 15 秒连续小剧场，全程约 3-8 分钟，离开即放弃
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-5">
          <textarea
            value={idea}
            onChange={e => setIdea(e.target.value.slice(0, 200))}
            placeholder="故事创意（如：克罗雅在花园里追一只发光的蝴蝶，最后蝴蝶落在她指尖）"
            rows={3}
            className="w-full glass rounded-xl px-3 py-2 text-sm resize-none outline-none mb-3"
            style={{ color: 'var(--text-primary)' }}
          />
          <button
            onClick={() => void run()}
            disabled={!idea.trim() || busy}
            className="w-full py-3 rounded-xl text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}
          >
            <Clapperboard className="w-4 h-4" />
            {busy ? `${PHASE_TEXT[phase]}${stepDetail ? `（${stepDetail}）` : ''}` : '生成小剧场'}
          </button>
          {error && <p className="text-sm mt-3 text-center" style={{ color: 'var(--accent-primary)' }}>{error}</p>}

          {frameUrls.length > 0 && (
            <div className="mt-4">
              <div className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>关键帧（相邻段共享边界帧）</div>
              <div className="grid grid-cols-4 gap-2">
                {frameUrls.map((u, i) => (
                  <img key={i} src={u} alt={`关键帧 ${i + 1}`} className="w-full aspect-video object-cover rounded-lg" />
                ))}
              </div>
            </div>
          )}

          {segs.length > 0 && (
            <div className="mt-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {segs.map((s, i) => (
                <div key={i} className="flex justify-between mb-1">
                  <span>第 {i + 1} 段</span>
                  <span>{s.url ? (allDone ? '✓ 完成' : '✓ 已完成') : s.status === 'failed' || s.status === 'timeout' ? '✗ 失败' : `${s.progress}%`}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-5 flex flex-col items-center justify-center min-h-[300px]">
          {segs.some(s => s.url) ? (
            <>
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                {allDone ? '小剧场完成' : someFailed ? '部分段落失败，已生成如下' : '生成中，先看已完成的段落…'}
              </p>
              <video
                key={playIndex}
                data-testid={`story-video-${playIndex}`}
                src={segUrls[playIndex]}
                controls
                autoPlay
                onEnded={() => setPlayIndex(i => Math.min(i + 1, segs.length - 1))}
                className="max-w-full max-h-72 rounded-xl mb-3"
              />
              <div className="flex gap-2 mb-3">
                {segs.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPlayIndex(i)}
                    disabled={!segUrls[i]}
                    className="px-3 py-1 rounded-lg text-sm disabled:opacity-40"
                    style={playIndex === i
                      ? { background: 'var(--accent-primary)', color: '#fff' }
                      : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
                  >第 {i + 1} 段</button>
                ))}
              </div>
              <div className="flex gap-2">
                {segs.map((s, i) => s.url && (
                  <a key={i} href={s.url} download className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm"
                    style={{ background: 'var(--bg-secondary)', color: 'var(--accent-primary)' }}>
                    <Download className="w-3.5 h-3.5" />下载 {i + 1}
                  </a>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {busy ? `${PHASE_TEXT[phase]}${stepDetail ? `（${stepDetail}）` : ''}` : PHASE_TEXT.idle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [x] **Step 4: 跑测试，确认通过**

```bash
bunx vitest run __tests__/unit/components/ai/StoryStudio.test.tsx
```
Expected: PASS。mock 的 `getVideoStatus` 首次轮询即返回 completed，无需推进 timer（首轮 3 tests；质量审查修复后为 5 tests，见上方执行注记）。

- [x] **Step 5: Commit**

```bash
git add src/components/react/ai/StoryStudio.tsx __tests__/unit/components/ai/StoryStudio.test.tsx
git commit -m "feat(ai): StoryStudio 小剧场编排组件（分镜→关键帧→并行视频段→连播）"
```

---

## Task 6: 小剧场页路由 + hub 卡片 + e2e

**Files:**
- Create: `src/pages/ai/story.astro`
- Modify: `src/pages/ai/index.astro`
- Create: `__tests__/e2e/ai-story.spec.ts`

- [x] **Step 1: 写 `src/pages/ai/story.astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import AiDisclaimer from '../../components/astro/AiDisclaimer.astro';
import StoryStudio from '../../components/react/ai/StoryStudio';
---
<BaseLayout title="克罗雅小剧场 · AI 实验室">
  <div class="max-w-3xl mx-auto px-4 pt-4">
    <a href="/ai/" class="text-sm underline" style="color: var(--text-secondary);">← 返回 AI 实验室</a>
  </div>
  <StoryStudio client:idle />
  <div class="px-4 pb-16">
    <AiDisclaimer />
  </div>
</BaseLayout>
```

> 注：结构对齐 `src/pages/ai/video.astro`(返回链接 + AiDisclaimer 为各子页惯例,初版规格遗漏、质量审查后补齐)。

- [x] **Step 2: 修改 `src/pages/ai/index.astro` hub 卡片**

把 `<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">` 改为 4 列：

```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
```

并在「让克罗雅动起来」卡片（`/ai/video/`）之后追加第 4 张卡片：

```html
      <a href="/ai/story/" class="glass rounded-2xl p-6 text-center hover:scale-[1.02] transition-transform duration-300 block">
        <div class="text-4xl mb-3">🎭</div>
        <div class="font-serif text-xl font-bold mb-1" style="color: oklch(0.75 0.11 300);">克罗雅小剧场</div>
        <div class="text-sm" style="color: var(--text-secondary);">一个创意 → 连续小剧场</div>
        <div class="text-xs mt-4 opacity-70" style="color: var(--accent-primary);">进入 →</div>
      </a>
```

- [x] **Step 3: 写 `__tests__/e2e/ai-story.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

const STORYBOARD = { frames: ['f0', 'f1', 'f2', 'f3'], motions: ['m0', 'm1', 'm2'] };

test.describe('AI 小剧场页', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/storyboard', r => r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify(STORYBOARD),
    }));
    await page.route('**/api/image', r => r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ url: 'https://cdn/kf.png' }),
    }));
    await page.route('**/api/video', r => r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ video_id: 'v1' }),
    }));
    await page.route('**/api/video/status*', r => r.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ status: 'completed', progress: 100, url: 'https://cdn/seg.mp4' }),
    }));
  });

  test('全链路生成并连播', async ({ page }) => {
    await page.goto('/ai/story/');
    await page.getByPlaceholder('故事创意').fill('克罗雅在花园里追蝴蝶');
    await page.getByRole('button', { name: /生成小剧场/ }).click();
    await expect(page.getByTestId('story-video-0')).toHaveAttribute('src', 'https://cdn/seg.mp4');
    await expect(page.getByText('小剧场完成')).toBeVisible();
    // 段切换
    await page.getByRole('button', { name: '第 2 段' }).click();
    await expect(page.getByTestId('story-video-1')).toHaveAttribute('src', 'https://cdn/seg.mp4');
  });

  test('分镜失败提示', async ({ page }) => {
    await page.unroute('**/api/storyboard');
    await page.route('**/api/storyboard', r => r.fulfill({
      status: 502, contentType: 'application/json',
      body: JSON.stringify({ error: '分镜生成失败，请重试' }),
    }));
    await page.goto('/ai/story/');
    await page.getByPlaceholder('故事创意').fill('x');
    await page.getByRole('button', { name: /生成小剧场/ }).click();
    await expect(page.getByText('分镜生成失败，请重试')).toBeVisible();
  });
});
```

- [x] **Step 4: 跑 e2e**

```bash
bun run test:e2e:raw ai-story.spec.ts
```
Expected: PASS（2 tests）。
> ⚠️ agent 环境执行需 `env -u CLAUDECODE -u AI_AGENT bun run test:e2e:raw ai-story.spec.ts`，否则 astro dev server 自动后台化导致 webServer 报错。

- [x] **Step 5: build + 全量单测确认无回归**

```bash
bun run build && bun run test
```
Expected: build 通过，`dist/ai/story/index.html` 生成，全部单测通过。

- [x] **Step 6: Commit**

```bash
git add src/pages/ai/story.astro src/pages/ai/index.astro __tests__/e2e/ai-story.spec.ts
git commit -m "feat(ai): /ai/story 小剧场页与 hub 入口 + e2e"
```

> **执行注记**:e2e 两处规格调整——`getByPlaceholder` 用正则(Playwright 默认对整个 placeholder 精确匹配,长文案匹配不到);输入填充用 `.type()`(React 受控组件对 `.fill()` 不更新 state)。`test`/`expect` 从共享 fixture `./test` 导入(项目惯例,abort 外部字体 CDN)。另:`bun run build` 类型门禁要求 StoryStudio 三处索引访问加非空断言(`sb.frames[i]!`、`urls[i]!`、`urls[i+1]!`,循环边界与后端 4/3 契约保证);质量审查发现 story.astro 初版规格遗漏各子页惯例的返回链接与 `AiDisclaimer`,已补齐并顺带更新 ai-hub e2e 覆盖第 4 卡。

---

## 部署与冒烟

1. push → Wrangler 部署（同现有流程）。
2. 本地：`.dev.vars` 已有 key → `wrangler dev` → `/ai/story/` 输入创意跑全链路（真实 agnes 调用，全程 3–8 分钟）。
3. 生产冒烟：`https://kloa.fans/ai/story/`，检查：分镜 4 帧 → 3 段视频 → 连播衔接处画面一致（边界帧相同）→ 各段可下载。
4. 观察点：①agnes 对 keyframes 模式的 `size_mapping` 归一（若各段返回 size 不一致，连播会跳变——需在冒烟时人工核对每段返回尺寸）；②一次流程 8 次 create 请求是否触发限流。

## Future Work（不在本 plan）

- 段数/时长可选（2–4 段、5s/10s preset `num_frames: 241`）。
- ffmpeg.wasm 客户端合并导出单文件 mp4（含音频交叉淡化）。
- 关键帧人工确认/重 roll 再进视频段（在 frames 阶段暂停等待用户）。
- agnes-video-2.5 上线后的 reference 续写模式对比。

## Self-Review

- **Spec 覆盖**：分镜端点（Task 1/2）、关键帧视频分支（Task 3）、前端客户端（Task 4）、编排与连播（Task 5）、页面入口与 e2e（Task 6）、调研结论全部落地。✅
- **类型一致**：`KeyframeVideoRequest` 前后端字段名一致（`prompt`/`first_frame`/`last_frame`/`duration`）；`StoryboardResponse.frames/motions` 与 worker `Storyboard` 结构一致；`SegState.status` 复用 `VideoStatus`。✅
- **占位符**：无；所有代码步骤均给出完整代码。✅
- **风险点**：①agnes keyframes 实际返回的 size 归一行为需冒烟确认；②chat 模型偶发不输出合法 JSON——已用容错解析 + 502 重试兜底；③并行 3 段轮询给 `/api/video/status` 的压力：无限流、5s 间隔，可接受；④`api.ts` 的 import 合并细节已在 Task 4 注明，避免 lint 报 duplicate import。
