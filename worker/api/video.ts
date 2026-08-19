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
  if (!env.AGNES_API_KEY) return json({ error: '服务未配置' }, 503);

  const duration: 3 | 5 = body.duration === 5 ? 5 : 3;
  const preset = VIDEO_DURATION_PRESETS[duration];

  // 关键帧模式：首尾帧约束的段生成（extra_body.image 会成为成片实际画面帧）
  if (body.first_frame !== undefined || body.last_frame !== undefined) {
    if (!isHttpUrl(body.first_frame) || !isHttpUrl(body.last_frame)) {
      return json({ error: '关键帧 URL 有误' }, 400);
    }
    const kfPrompt = (body.prompt ?? '').trim();
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
