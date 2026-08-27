import { RATE_LIMIT_WINDOW_SEC } from './config';

// Workers Rate Limiting binding 的 limit/period 固定在 wrangler.jsonc（不可运行时按端点参数化），
// 故按上限档位拆两个 binding，命名空间仅在 binding 内再分桶：
//   RATE_LIMITER        10 次/60s —— chat/image/storyboard/video 四个生成端点共享桶（默认 '__rl'）
//   RATE_LIMITER_STATUS 60 次/60s —— video-status 高频轮询独立桶（'__rlvs'，避免耗尽生成桶）
// windowSec 仅用于 429 的 Retry-After：binding 响应只有 success 布尔、无重置时刻，保守取整个窗口时长。
export interface RateLimitOptions {
  windowSec?: number;
  namespace?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  // binding 不返回剩余配额（仅 success 布尔），无法像旧 cache 实现透出 remaining；调用方也均未使用
  remaining?: number;
  retryAfterSec: number;
}

export async function checkRateLimit(
  ip: string,
  limiter: RateLimit,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const windowSec = options.windowSec ?? RATE_LIMIT_WINDOW_SEC;
  const namespace = options.namespace ?? '__rl';
  try {
    // 单次 limit() 即原子计数——旧 caches.default 读-改-写在同 IP 并发下会双双读到 N 各写 N+1（漏计数），
    // 且缓存条目可被任意逐出（限流静默失效）。binding 计数不落 Cache API，无逐出问题。
    const { success } = await limiter.limit({ key: `${namespace}:${ip}` });
    return { allowed: success, retryAfterSec: success ? 0 : windowSec };
  } catch {
    // binding 调用本身异常（如本地环境未配置）时放行——与旧实现 cache.put 失败不阻塞限流判定一致
    return { allowed: true, retryAfterSec: 0 };
  }
}

export function clientIP(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    'unknown'
  );
}
