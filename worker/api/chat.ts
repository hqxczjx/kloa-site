import { buildAgnesMessages } from '../_lib/prompts';
import { agnesChatUrl, agnesHeaders, normalizeAgnesError } from '../_lib/agnes';
import { checkRateLimit, clientIP } from '../_lib/ratelimit';
import { CHAT_MODEL, CHAT_MAX_TOKENS, MAX_INPUT_CHARS, MAX_HISTORY_TURNS } from '../_lib/config';
import type { ChatRequest, Env } from '../_lib/types';

export async function chatHandler(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method Not Allowed' }, 405);
  }

  // 限流
  const rl = await checkRateLimit(clientIP(request), caches.default);
  if (!rl.allowed) {
    return json({ error: '操作太频繁，请稍后再试' }, 429);
  }

  // 解析 + 校验
  let body: ChatRequest;
  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return json({ error: '请求格式有误' }, 400);
  }
  if (!body || typeof body.message !== 'string' || body.message.trim() === '') {
    return json({ error: '请输入内容' }, 400);
  }
  if (body.message.length > MAX_INPUT_CHARS) {
    return json({ error: `内容过长（限 ${MAX_INPUT_CHARS} 字）` }, 400);
  }
  const form = body.form === 'demon' ? 'demon' : 'angel';
  const history = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY_TURNS) : [];

  const apiKey = env.AGNES_API_KEY;
  if (!apiKey) {
    return json({ error: '服务未配置' }, 503);
  }

  const messages = buildAgnesMessages({ form, topic: body.topic, message: body.message, history });

  const upstream = await fetch(agnesChatUrl(), {
    method: 'POST',
    headers: agnesHeaders(apiKey),
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages,
      stream: true,
      max_tokens: CHAT_MAX_TOKENS,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const { status, message } = normalizeAgnesError(upstream.status);
    return json({ error: message }, status);
  }

  // 透传上游 OpenAI 兼容 SSE
  return new Response(upstream.body, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'connection': 'keep-alive',
    },
  });
};

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
