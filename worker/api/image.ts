import { buildImagePrompt } from '../_lib/prompts';
import { agnesHeaders, normalizeAgnesError } from '../_lib/agnes';
import { checkRateLimit, clientIP } from '../_lib/ratelimit';
import { readJsonBody } from '../_lib/body';
import { aiCacheKey, readCache, writeCache } from '../_lib/aicache';
import { AGNES_BASE_URL, IMAGE_MODEL, RATIO_FRAMES, MAX_IMAGE_EXTRA_CHARS, AI_CACHE_TTL_SEC } from '../_lib/config';
import type { Env } from '../_lib/types';

interface ImageRequest {
  style: string;
  extra?: string;
  size: '1K' | '2K';
  ratio?: string;
}

// 合法档位由映射表推导，单一数据源（三档裁切 + 全身 letterbox + 小剧场横版）。
const RATIOS = Object.keys(RATIO_FRAMES);

export async function imageHandler(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);

  if (!(await checkRateLimit(clientIP(request), caches.default)).allowed) {
    return json({ error: '操作太频繁，请稍后再试' }, 429);
  }

  const parsed = await readJsonBody<ImageRequest>(request);
  if (!parsed.ok) return json({ error: parsed.error }, parsed.status);
  const body = parsed.body;

  if (!body?.style || typeof body.style !== 'string') return json({ error: '请选择风格' }, 400);
  if (body.extra && body.extra.length > MAX_IMAGE_EXTRA_CHARS) return json({ error: `追加描述过长（限 ${MAX_IMAGE_EXTRA_CHARS} 字）` }, 400);

  const size = body.size === '2K' ? '2K' : '1K';
  const ratio = body.ratio && RATIOS.includes(body.ratio) ? body.ratio : '1:1';
  const apiKey = env.AGNES_API_KEY;
  if (!apiKey) return json({ error: '服务未配置' }, 503);

  const override = (env as Env & { AGNES_CHARACTER_URL?: string }).AGNES_CHARACTER_URL;
  const frame = RATIO_FRAMES[ratio as keyof typeof RATIO_FRAMES] ?? RATIO_FRAMES['1:1'];
  const characterUrl = override || frame.image;
  const prompt = buildImagePrompt(body.style, body.extra, ratio);

  // 直接以最终上送体做缓存 key：入参/模型/参考图任一变化自动失效
  const upstreamBody = {
    model: IMAGE_MODEL,
    prompt,
    size,
    ratio: frame.apiRatio,
    extra_body: { image: [characterUrl], response_format: 'url' as const },
  };

  // 同入参结果缓存：命中秒回（原本 10-30s）且省 agnes 共享配额；只缓存成功 url
  const cacheKey = await aiCacheKey('image', upstreamBody);
  const hit = await readCache<{ url: string }>(caches.default, cacheKey);
  if (hit?.url) return json(hit, 200);

  const upstream = await fetch(`${AGNES_BASE_URL}/images/generations`, {
    method: 'POST',
    headers: agnesHeaders(apiKey),
    body: JSON.stringify(upstreamBody),
  });

  if (!upstream.ok) {
    const { status, message } = normalizeAgnesError(upstream.status);
    return json({ error: message }, status);
  }
  const data = await upstream.json() as { data?: { url?: string }[] };
  const url = data.data?.[0]?.url;
  if (!url) return json({ error: '生成失败，请重试' }, 502);
  await writeCache(caches.default, cacheKey, { url }, AI_CACHE_TTL_SEC);
  return json({ url }, 200);
}

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
