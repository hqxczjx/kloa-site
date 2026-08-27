// AI 结果缓存（Cloudflare Cache API）：agnes 免费、全站共享配额，
// 同入参的成功结果缓存后重复点击秒回（原本 10-30s）且少打上游。
// 只缓存成功结果；调用方判断业务成功后再 writeCache。
const CACHE_ORIGIN = 'https://kloa.fans';
const CACHE_PREFIX = '__aicache';

// 统一缓存 key 构造（origin + 命名空间 + 各段）。aicache / ratelimit / video-status
// 三处共用同一 Cache API，字符串拼接散落各处易漂移，收敛到此。
export function cacheKey(namespace: string, ...parts: string[]): Request {
  return new Request([`${CACHE_ORIGIN}/${namespace}`, ...parts].join('/'));
}

// 规范化入参：递归排序对象字段 + trim 字符串 + 丢弃 undefined，
// 使字段序/首尾空白不同的等价入参落到同一缓存 key
export function canonicalize(value: unknown): unknown {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(value).sort()) {
      const v = (value as Record<string, unknown>)[k];
      if (v !== undefined) sorted[k] = canonicalize(v);
    }
    return sorted;
  }
  return value;
}

export async function aiCacheKey(endpoint: string, params: unknown): Promise<Request> {
  const hash = await sha256Hex(JSON.stringify(canonicalize(params)));
  return cacheKey(CACHE_PREFIX, endpoint, hash);
}

export async function readCache<T>(cache: Cache, key: Request): Promise<T | undefined> {
  try {
    const hit = await cache.match(key);
    if (!hit) return undefined;
    return (await hit.json()) as T;
  } catch {
    return undefined; // 缓存读失败/条目损坏按未命中处理
  }
}

export async function writeCache(
  cache: Cache,
  key: Request,
  data: unknown,
  maxAgeSec: number
): Promise<void> {
  try {
    await cache.put(
      key,
      new Response(JSON.stringify(data), {
        headers: {
          'content-type': 'application/json',
          'cache-control': `public, max-age=${maxAgeSec}`,
        },
      })
    );
  } catch {
    // wrangler dev 下 caches.default 可能不可写——缓存失败不阻塞主流程
  }
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
