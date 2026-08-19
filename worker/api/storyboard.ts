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
