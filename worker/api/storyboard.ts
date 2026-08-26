import { buildStoryboardMessages, parseStoryboard, type Storyboard } from '../_lib/prompts';
import { agnesChatUrl, agnesHeaders, normalizeAgnesError } from '../_lib/agnes';
import { checkRateLimit, clientIP } from '../_lib/ratelimit';
import { readJsonBody } from '../_lib/body';
import { aiCacheKey, readCache, writeCache } from '../_lib/aicache';
import { CHAT_MODEL, STORY_SCENE_COUNT, STORY_IDEA_MAX_CHARS, STORYBOARD_MAX_TOKENS, AI_CACHE_TTL_SEC } from '../_lib/config';
import type { Env } from '../_lib/types';

interface StoryboardRequest { idea?: string; }

export async function storyboardHandler(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);
  if (!(await checkRateLimit(clientIP(request), caches.default)).allowed) {
    return json({ error: '操作太频繁，请稍后再试' }, 429);
  }

  const parsed = await readJsonBody<StoryboardRequest>(request);
  if (!parsed.ok) return json({ error: parsed.error }, parsed.status);
  const body = parsed.body;
  const idea = typeof body?.idea === 'string' ? body.idea.trim() : '';
  if (!idea) return json({ error: '请输入故事创意' }, 400);
  if (idea.length > STORY_IDEA_MAX_CHARS) return json({ error: `创意过长（限 ${STORY_IDEA_MAX_CHARS} 字）` }, 400);
  if (!env.AGNES_API_KEY) return json({ error: '服务未配置' }, 503);

  // 直接以最终上送体做缓存 key：同 idea 的分镜请求命中秒回（原本 10-30s）
  const upstreamBody = {
    model: CHAT_MODEL,
    messages: buildStoryboardMessages(idea, STORY_SCENE_COUNT),
    stream: false,
    max_tokens: STORYBOARD_MAX_TOKENS,
  };
  const cacheKey = await aiCacheKey('storyboard', upstreamBody);
  const hit = await readCache<Storyboard>(caches.default, cacheKey);
  if (hit && Array.isArray(hit.frames) && Array.isArray(hit.motions)) return json(hit, 200);

  const upstream = await fetch(agnesChatUrl(), {
    method: 'POST',
    headers: agnesHeaders(env.AGNES_API_KEY),
    body: JSON.stringify(upstreamBody),
  });

  if (!upstream.ok) {
    const { status, message } = normalizeAgnesError(upstream.status);
    return json({ error: message }, status);
  }
  const data = await upstream.json() as { choices?: { message?: { content?: string } }[] };
  const storyboard = parseStoryboard(data.choices?.[0]?.message?.content ?? '', STORY_SCENE_COUNT);
  if (!storyboard) return json({ error: '分镜生成失败，请重试' }, 502);
  await writeCache(caches.default, cacheKey, storyboard, AI_CACHE_TTL_SEC);
  return json(storyboard, 200);
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
