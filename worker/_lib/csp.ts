import type { Env } from './types';

// ── CSP（P2-6 严格内容安全策略）───────────────────────────────────────
// 纯静态 HTML + Astro island 站点，内联脚本无法用 nonce（HTML 进边缘缓存后
// 同一 nonce 会被重放，且静态产物没有每响应随机源），统一走 SHA-256 hash 白名单：
// BaseLayout FOUC/主题切换、AnniversaryCards 倒计时（data-astro-rerun）、
// ContributeDialog/DanmakuBoard 脚本、Astro 构建期内联化的小运行时 chunk。
//
// 为什么是「全站并集」而不是只哈希当前页：ClientRouter 软导航后
// astro/dist/transitions/router.js runScripts() 会把新页面里本文档尚未执行过
// 的内联脚本（含全部 data-astro-rerun 脚本）重建执行——执行时的 CSP 仍是
// 「最初硬加载那一页」下发的。若每页只带自己的 hash，/ → /about/ → / 这类
// 往返会把首页的倒计时脚本拦在 /about/ 的 CSP 之外（正是 home.spec.ts
// data-astro-rerun 用例覆盖的回归）。故任一 HTML 响应都必须携带全站并集。
//
// 实现：首个 HTML 请求时经 ASSETS binding 读 sitemap 爬全部页面（本机资产
// 读取，毫秒级，每 isolate 仅一次；每次部署 = 新 isolate = 自动失效），对
// 内联脚本去重后取 hash 并集。HTML body 全程流式透传，无需读回。
// 已知残留窗口（union 方案固有）：部署 N 期间硬加载的页面，边缘 SWR 缓存
// （≤10 分钟）内软导航到部署 N+1 改过内联脚本的页面时，新脚本不在旧 CSP
// 白名单内会被拦——需整页重载自愈。窗口极窄（SWR 过期 + 脚本恰好变更同时
// 成立），静态粉丝站可接受。
// 构建侧守卫：astro.config.mjs 的 cspUnionGuard 在每次 build 时对账
// 「dist 全部 HTML 的脚本并集 == sitemap 模拟运行时并集」，新页面漏进
// sitemap 等缺口会让 build 直接失败。

// 非 HTML（API JSON/SSE、JS/CSS/字体/图片资产）：文档才受 CSP 约束，
// 这些响应永不作为文档渲染，给最紧的封口即可。
export const CSP_NON_HTML = "default-src 'none'; frame-ancestors 'none'";

// agnes 生成媒体的返回域名（上游官方文档示例，仓库内留档 docs/ignore/）：
// - 图片 https://storage.googleapis.com/agnes-aigc/xxx.png（agnes-image-2.1-flash.md）
// - 视频 https://platform-outputs.agnes-ai.space/videos/...（agnes-video-v2.0.md）
// 上游若更换 CDN 域需同步此处。注意 scripts/smoke.mjs 只断言 CSP 头本身（能发现
// unsafe-inline 降级），不会加载真实图片——换域裂图只能靠真实流量发现，
// 根治是 roadmap P3-2（R2 中转自托管生成物）。
const MEDIA_HOSTS = 'https://storage.googleapis.com https://platform-outputs.agnes-ai.space';

// 内联 <script> 提取：非贪婪匹配到第一个 </script>，与 HTML 解析器的
// 脚本结束规则一致（脚本内容是 raw text，无实体解码，直接哈希原始字节）。
// 跳过带 src= 的（外部脚本走 'self'）与非可执行 type（如 application/ld+json）。
const INLINE_SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const SRC_ATTR_RE = /(?:^|\s)src\s*=/i;
const TYPE_ATTR_RE = /(?:^|\s)type\s*=\s*["']?([^"'\s>]+)/i;
const EXECUTABLE_TYPES = new Set(['', 'module', 'text/javascript', 'application/javascript', 'module/javascript']);

const LOC_RE = /<loc>([^<]+)<\/loc>/g;

const encoder = new TextEncoder();

async function sha256Base64(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(text));
  return btoa(String.fromCharCode(...new Uint8Array(digest)));
}

// 导出供 astro.config.mjs 的 cspUnionGuard 复用（构建时对账用同一提取逻辑，
// 防守卫与运行时两套正则各自漂移）
export function extractInlineScriptTexts(html: string): string[] {
  const texts: string[] = [];
  for (const match of html.matchAll(INLINE_SCRIPT_RE)) {
    const attrs = match[1] ?? '';
    if (SRC_ATTR_RE.test(attrs)) continue;
    const type = (TYPE_ATTR_RE.exec(attrs)?.[1] ?? '').toLowerCase();
    if (!EXECUTABLE_TYPES.has(type)) continue;
    texts.push(match[2] ?? '');
  }
  return texts;
}

interface ScriptHashUnion {
  /** 页面是否实际取回至少一页（false = sitemap 缺失或全取失败，走宽松兜底保功能） */
  ok: boolean;
  hashes: string[];
}

function cspWithScriptHashes(union: ScriptHashUnion): string {
  // sitemap 缺失/页面全部取回失败时的兜底：不带 hash 的 script-src 会拦掉全部
  // 内联脚本（白屏），降级为 'unsafe-inline' 保功能——其余指令照常生效。
  // 这是降级的唯一日志点（结果随后被缓存整个 isolate 生命周期，只打一次）；
  // 生产另由 smoke.mjs 断言「script-src 无 'unsafe-inline'」暴露该状态。
  if (!union.ok) {
    console.error('[csp] sitemap/页面取回失败，script-src 降级为 unsafe-inline');
  }
  const scriptSrc = union.ok
    ? `script-src 'self'${union.hashes.map((h) => ` 'sha256-${h}'`).join('')}`
    : "script-src 'self' 'unsafe-inline'";
  return [
    "default-src 'self'",
    scriptSrc,
    // BaseLayout <style is:global> 内联元素 + SSR 输出的 style 属性需要 unsafe-inline
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: ${MEDIA_HOSTS}`,
    // data: 供播放器注入 data:audio（e2e player-persistence 用例）
    `media-src 'self' data: ${MEDIA_HOSTS}`,
    "font-src 'self'",
    "connect-src 'self'",
    // ContributeDialog（DanmakuBoard 内）嵌的腾讯问卷
    'frame-src https://wj.qq.com',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

async function assetText(env: Env, origin: string, pathname: string): Promise<string | null> {
  try {
    const res = await env.ASSETS.fetch(new Request(origin + pathname));
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function toPathname(loc: string, origin: string): string | null {
  try {
    return new URL(loc, origin).pathname;
  } catch {
    return null;
  }
}

async function pagePathsFromSitemap(env: Env, origin: string): Promise<string[]> {
  const indexXml = await assetText(env, origin, '/sitemap-index.xml');
  if (!indexXml) return [];
  const childSitemaps = [...indexXml.matchAll(LOC_RE)]
    .map(([m, loc]) => toPathname(loc as string, origin))
    .filter((p): p is string => p !== null && p.endsWith('.xml'));
  const pageLists = await Promise.all(
    childSitemaps.map(async (sitemapPath) => {
      const xml = await assetText(env, origin, sitemapPath);
      if (!xml) return [] as string[];
      return [...xml.matchAll(LOC_RE)]
        .map(([m, loc]) => toPathname(loc as string, origin))
        .filter((p): p is string => p !== null && !p.endsWith('.xml'));
    }),
  );
  // 404.html 不进 sitemap，但同样经 worker 出 HTML，一并纳入
  return [...new Set(pageLists.flat())].concat('/404.html');
}

async function unionScriptHashes(env: Env, origin: string): Promise<ScriptHashUnion> {
  const pagePaths = await pagePathsFromSitemap(env, origin);
  if (pagePaths.length === 0) return { ok: false, hashes: [] };
  const htmls = await Promise.all(pagePaths.map((p) => assetText(env, origin, p)));
  const fetched = htmls.filter((h): h is string => h !== null);
  // ok = 实际取回≥1 页（而非 sitemap 列出≥1 页）：全部取回失败（部署异常）时
  // 必须走 unsafe-inline 兜底，否则会输出零 hash 的 script-src——拦掉全部内联
  // 脚本是白屏而非降级。部分失败无碍：缺失页对应 404，本就没有要执行的脚本。
  if (fetched.length === 0) return { ok: false, hashes: [] };
  const scriptTexts = new Set(fetched.flatMap(extractInlineScriptTexts));
  const hashes = await Promise.all([...scriptTexts].map(sha256Base64));
  return { ok: true, hashes };
}

// 按 env 缓存（isolate 内 env 是同一对象；vitest 每个用例各自造 env 互不串）。
// 注意：降级结果同样缓存整个 isolate 生命周期——本站页面恒有 sitemap，降级仅
// 在部署异常时出现，与其每请求重爬不如固化；console.error（cspWithScriptHashes
// 内）与每日 smoke 是该状态的两个观测面。唯一不缓存的是下方 .catch 分支：
// assetText 自身吞异常，它只覆盖其之外的意外 throw，delete 后下个请求重试。
const cspCache = new WeakMap<Env, Promise<string>>();

export function htmlCspFor(url: URL, env: Env): Promise<string> {
  let cached = cspCache.get(env);
  if (!cached) {
    cached = unionScriptHashes(env, url.origin)
      .then(cspWithScriptHashes)
      .catch(() => {
        cspCache.delete(env);
        return cspWithScriptHashes({ ok: false, hashes: [] });
      });
    cspCache.set(env, cached);
  }
  return cached;
}
