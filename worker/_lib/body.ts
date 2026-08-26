import { MAX_BODY_BYTES } from './config';

// 统一 JSON body 读取守卫：原先各端点 request.json() 对任意大小 body 反序列化。
// 三道防线：
// 1. Content-Length 预检——超限直接 413，不读 body；
// 2. Content-Type 必须为 JSON（容忍 charset 参数与 +json 后缀）——否则 415；
// 3. 读出后按 UTF-8 字节数复核（chunked 无 Content-Length、或头谎报）——超限 413。
export type JsonBodyResult<T> =
  | { ok: true; body: T }
  | { ok: false; status: 400 | 413 | 415; error: string };

export async function readJsonBody<T>(
  request: Request,
  maxBytes: number = MAX_BODY_BYTES
): Promise<JsonBodyResult<T>> {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) {
    return { ok: false, status: 413, error: '请求体过大' };
  }

  const contentType = (request.headers.get('content-type') ?? '').toLowerCase();
  const mediaType = contentType.split(';', 1)[0]?.trim() ?? '';
  if (mediaType !== 'application/json' && !mediaType.endsWith('+json')) {
    return { ok: false, status: 415, error: 'Content-Type 需为 application/json' };
  }

  const text = await request.text();
  if (byteLength(text) > maxBytes) {
    return { ok: false, status: 413, error: '请求体过大' };
  }

  try {
    return { ok: true, body: JSON.parse(text) as T };
  } catch {
    return { ok: false, status: 400, error: '请求格式有误' };
  }
}

// text.length 数的是 UTF-16 码元（CJK 1 字 = 3 字节），按字节复核须用 TextEncoder
function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}
