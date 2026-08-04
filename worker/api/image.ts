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
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
