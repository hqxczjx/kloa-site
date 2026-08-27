import songsJson from '../../src/data/songs.json';
import { buildAgnesMessages, wantsSongRecommendation, sampleSongs } from '../_lib/prompts';
import { agnesChatUrl, agnesHeaders, normalizeAgnesError } from '../_lib/agnes';
import { checkRateLimit, clientIP } from '../_lib/ratelimit';
import { readJsonBody } from '../_lib/body';
import { CHAT_MODEL, CHAT_MAX_TOKENS, CHAT_TEMPERATURE, CHAT_SONG_SAMPLE_COUNT, MAX_INPUT_CHARS, MAX_HISTORY_TURNS } from '../_lib/config';
import type { ChatRequest, Env } from '../_lib/types';

export async function chatHandler(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') {
    return json({ error: 'Method Not Allowed' }, 405);
  }

  // 限流
  const rl = await checkRateLimit(clientIP(request), env.RATE_LIMITER);
  if (!rl.allowed) {
    const res = json({ error: '操作太频繁，请稍后再试' }, 429);
    res.headers.set('Retry-After', String(rl.retryAfterSec));
    return res;
  }

  // 解析 + 校验（统一 body 守卫：413 超限 / 415 非 JSON / 400 格式错误）
  const parsed = await readJsonBody<ChatRequest>(request);
  if (!parsed.ok) return json({ error: parsed.error }, parsed.status);
  const body = parsed.body;
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

  // 命中推荐歌意图时注入她真唱过的曲库节选（站内 songs.json），推荐才有的放矢
  const needSongs = body.topic === '推荐一首歌' || wantsSongRecommendation(body.message);
  const songPool = needSongs ? sampleSongs(songsJson, CHAT_SONG_SAMPLE_COUNT) : undefined;

  const messages = buildAgnesMessages({ form, topic: body.topic, message: body.message, history, songPool });

  const upstream = await fetch(agnesChatUrl(), {
    method: 'POST',
    headers: agnesHeaders(apiKey),
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages,
      stream: true,
      max_tokens: CHAT_MAX_TOKENS,
      temperature: CHAT_TEMPERATURE,
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
