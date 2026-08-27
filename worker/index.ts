import { chatHandler } from './api/chat';
import { imageHandler } from './api/image';
import { createVideoHandler } from './api/video';
import { videoStatusHandler } from './api/video-status';
import { storyboardHandler } from './api/storyboard';
import type { Env } from './_lib/types';

// ── 响应头策略（唯一真源）────────────────────────────────────────────
// run_worker_first: true 下所有请求先入 Worker，Cloudflare 对「Worker 返回的
// 响应」不应用 public/_headers 的自定义头（实测：HTML 无 CDN-Cache-Control、
// /_astro/* 反而拼出双值 cache-control）。缓存策略与安全头必须在此落地；
// _headers 文件保留作策略文档（改规则需两处同步）。

// P1-4 安全五头：全站所有响应（含 /api/*）。
// ContributeDialog 嵌 wj.qq.com 的 iframe 是「我们嵌别人」；X-Frame-Options DENY
// 防的是「别人嵌我们」，互不影响。API handler 自身只设 content-type 与
// cache-control（chat SSE 的 no-cache, no-transform），与本表无同名冲突。
const SECURITY_HEADERS: ReadonlyArray<readonly [string, string]> = [
  ['x-content-type-options', 'nosniff'],
  ['referrer-policy', 'strict-origin-when-cross-origin'],
  ['x-frame-options', 'DENY'],
  ['permissions-policy', 'camera=(), microphone=(), geolocation=()'],
  ['strict-transport-security', 'max-age=31536000'],
];

// HTML（P0-5）：浏览器层恒重校验（304 快速校验，防启发式缓存）；
// 边缘层 SWR——重复访问零 RTT，最多 10 分钟陈旧，SWR 回源刷新 1 天。
const HTML_CACHE_CONTROL = 'public, max-age=0, must-revalidate';
const HTML_CDN_CACHE_CONTROL = 'public, max-age=600, stale-while-revalidate=86400';

// 非 HTML 资源按路径给缓存策略（镜像 _headers 规则；其余路径不动）
function pathCacheControl(pathname: string): string | undefined {
  if (pathname.startsWith('/_astro/')) {
    return 'public, max-age=31536000, immutable'; // 指纹化构建产物
  }
  if (pathname === '/favicon.svg') {
    return 'public, max-age=604800';
  }
  if (pathname === '/robots.txt' || /^\/sitemap[^/]*\.xml$/.test(pathname)) {
    return 'public, max-age=86400';
  }
  return undefined;
}

// 统一收口：安全头全加；缓存头按路径/内容类型 SET（非 append——ASSETS 直通
// 可能带来脏值，线上实测双值 "max-age=0, must-revalidate, public, max-age=…"）。
function withResponseHeaders(pathname: string, res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [name, value] of SECURITY_HEADERS) {
    headers.set(name, value);
  }

  const cc = pathCacheControl(pathname);
  if (cc !== undefined) {
    headers.set('cache-control', cc);
  } else if ((headers.get('content-type') ?? '').includes('text/html')) {
    headers.set('cache-control', HTML_CACHE_CONTROL);
    headers.set('cdn-cache-control', HTML_CDN_CACHE_CONTROL);
  }

  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // /api/* 走 Worker 业务逻辑
    let res: Response;
    if (url.pathname === '/api/chat') {
      res = await chatHandler(request, env);
    } else if (url.pathname === '/api/image') {
      res = await imageHandler(request, env);
    } else if (url.pathname === '/api/storyboard') {
      res = await storyboardHandler(request, env);
    } else if (url.pathname === '/api/video') {
      res = await createVideoHandler(request, env);
    } else if (url.pathname === '/api/video/status') {
      res = await videoStatusHandler(request, env);
    } else if (url.pathname.startsWith('/api/')) {
      res = new Response('Not Found', { status: 404 });
    } else {
      // 其余请求交给静态资源
      return withResponseHeaders(url.pathname, await env.ASSETS.fetch(request));
    }
    return withResponseHeaders(url.pathname, res);
  },
};
