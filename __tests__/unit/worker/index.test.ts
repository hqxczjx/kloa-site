import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from '../../../worker/index';
import type { Env } from '../../../worker/_lib/types';

// 线上实测：ASSETS 直通的响应可能带双值 cache-control
// （"max-age=0, must-revalidate, public, max-age=31536000, immutable"），
// mock 预置同款脏值以验证 worker 是 SET 覆盖而非 append。
const DIRTY_CACHE_CONTROL =
  'max-age=0, must-revalidate, public, max-age=31536000, immutable';

const HTML_CACHE_CONTROL = 'public, max-age=0, must-revalidate';
const HTML_CDN_CACHE_CONTROL = 'public, max-age=600, stale-while-revalidate=86400';

const SECURITY_HEADERS: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
  'strict-transport-security': 'max-age=31536000',
};

function expectSecurityHeaders(res: Response) {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    expect(res.headers.get(name), name).toBe(value);
  }
}

// ASSETS binding mock：按请求返回可控 Response，模拟 Workers Static Assets
function makeEnv(upstream: (req: Request) => Response): Env {
  return {
    AGNES_API_KEY: 'k',
    ASSETS: { fetch: (req: Request) => Promise.resolve(upstream(req)) },
    RATE_LIMITER: vi.fn(),
    RATE_LIMITER_STATUS: vi.fn(),
  } as unknown as Env;
}

function call(url: string, env: Env, init?: RequestInit): Promise<Response> {
  return worker.fetch(new Request(url, init), env);
}

describe('worker fetch 路由与响应头（run_worker_first 下 HTML 不吃 _headers，此处才是完全真源）', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('HTML：浏览器 must-revalidate + 边缘 SWR + 安全五头（脏值被覆盖为单值）', async () => {
    const env = makeEnv(() =>
      new Response('<html></html>', {
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': DIRTY_CACHE_CONTROL },
      }),
    );
    const res = await call('https://kloa.fans/music/', env);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe(HTML_CACHE_CONTROL);
    expect(res.headers.get('cdn-cache-control')).toBe(HTML_CDN_CACHE_CONTROL);
    expectSecurityHeaders(res);
  });

  it('/_astro/*：干净的 immutable 单值（修复线上双值 cache-control）', async () => {
    const env = makeEnv(() =>
      new Response('console.log(1)', {
        headers: { 'content-type': 'text/javascript', 'cache-control': DIRTY_CACHE_CONTROL },
      }),
    );
    const res = await call('https://kloa.fans/_astro/app.Dy3kGaNr.js', env);
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(res.headers.get('cdn-cache-control')).toBeNull();
    expectSecurityHeaders(res);
  });

  it('favicon.svg 缓存 7 天；sitemap / robots 缓存 1 天', async () => {
    const env = makeEnv(() => new Response('x'));
    for (const [path, expected] of [
      ['/favicon.svg', 'public, max-age=604800'],
      ['/sitemap-index.xml', 'public, max-age=86400'],
      ['/sitemap-0.xml', 'public, max-age=86400'],
      ['/robots.txt', 'public, max-age=86400'],
    ] as const) {
      const res = await call(`https://kloa.fans${path}`, env);
      expect(res.headers.get('cache-control'), path).toBe(expected);
      expectSecurityHeaders(res);
    }
  });

  it('/fonts/*、/images/*：显式 7 天单值（堵 ASSETS 层按 _headers /* 兜底注入的 must-revalidate）', async () => {
    // 线上实测：未映射资产会被 ASSETS 层注入 /* 的脏值，mock 预置同款验证 SET 覆盖
    const env = makeEnv(() =>
      new Response('x', {
        headers: { 'content-type': 'font/woff2', 'cache-control': DIRTY_CACHE_CONTROL },
      }),
    );
    for (const path of ['/fonts/noto-serif-sc-var.woff2', '/images/illustration.webp']) {
      const res = await call(`https://kloa.fans${path}`, env);
      expect(res.headers.get('cache-control'), path).toBe('public, max-age=604800');
      expect(res.headers.get('cdn-cache-control'), path).toBeNull();
      expectSecurityHeaders(res);
    }
  });

  it('未列入策略的静态资源：cache-control 原样透传，安全头照加', async () => {
    const env = makeEnv(() =>
      new Response('{}', {
        headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=0, must-revalidate' },
      }),
    );
    const res = await call('https://kloa.fans/songs.json', env);
    expect(res.headers.get('cache-control')).toBe('public, max-age=0, must-revalidate');
    expect(res.headers.get('cdn-cache-control')).toBeNull();
    expectSecurityHeaders(res);
  });

  it('静态资源 body / status / 自有头透传不丢', async () => {
    const env = makeEnv(() =>
      new Response('page-body', {
        status: 404,
        headers: { 'content-type': 'text/html; charset=utf-8', 'x-custom': 'kept' },
      }),
    );
    const res = await call('https://kloa.fans/nope/', env);
    expect(res.status).toBe(404);
    expect(res.headers.get('x-custom')).toBe('kept');
    expect(await res.text()).toBe('page-body');
    // 404 不吃边缘 SWR（否则坏链恢复要等边缘缓存过期）；浏览器层重校验照旧
    expect(res.headers.get('cache-control')).toBe(HTML_CACHE_CONTROL);
    expect(res.headers.get('cdn-cache-control')).toBeNull();
    expectSecurityHeaders(res);
  });

  it('未知 /api/* 返回 404 且带安全五头', async () => {
    const env = makeEnv(() => { throw new Error('ASSETS 不应被触达'); });
    const res = await call('https://kloa.fans/api/nonexistent', env);
    expect(res.status).toBe(404);
    expectSecurityHeaders(res);
  });

  it('/api/chat SSE：安全头照加，handler 自设的 no-cache 缓存策略不被覆盖', async () => {
    // chat 静态导入于 worker/index.ts，运行时才解析 globalThis.fetch，mock 晚设也生效
    const sse = 'data: {"choices":[{"delta":{"content":"你"}}]}\n\ndata: [DONE]\n\n';
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(sse, { status: 200 })) as unknown as typeof fetch;
    const counts = new Map<string, number>();
    const limiter = {
      async limit({ key }: { key: string }) {
        const n = (counts.get(key) ?? 0) + 1;
        counts.set(key, n);
        return { success: n <= 10 };
      },
    } as unknown as Env['RATE_LIMITER'];
    const env = { AGNES_API_KEY: 'k', RATE_LIMITER: limiter } as unknown as Env;

    const res = await call('https://kloa.fans/api/chat', env, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'CF-Connecting-IP': '1.1.1.1' },
      body: JSON.stringify({ form: 'angel', message: 'hi', history: [] }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    expect(res.headers.get('cache-control')).toBe('no-cache, no-transform');
    expectSecurityHeaders(res);
  });
});

// ── P2-6 CSP：HTML 带全站内联脚本 hash 并集，非 HTML 全封口 ──────────────

async function scriptHash(content: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
  return btoa(String.fromCharCode(...new Uint8Array(digest)));
}

function scriptSrcOf(csp: string): string {
  const value = /(?:^|;\s*)script-src ([^;]+)/.exec(csp)?.[1];
  expect(value, `script-src 指令存在：${csp}`).toBeDefined();
  return value!;
}

// 按路径返回资产的 ASSETS mock（sitemap + 页面 HTML；body 统一 text/html，
// 页面判定只认 content-type，sitemap 走 .text() 与类型无关）
function makeAssetsEnv(assets: Record<string, string>): Env {
  return {
    AGNES_API_KEY: 'k',
    ASSETS: {
      fetch: (req: Request) => {
        const body = assets[new URL(req.url).pathname];
        return Promise.resolve(
          body !== undefined
            ? new Response(body, { headers: { 'content-type': 'text/html; charset=utf-8' } })
            : new Response('Not Found', { status: 404 }),
        );
      },
    },
    RATE_LIMITER: vi.fn(),
    RATE_LIMITER_STATUS: vi.fn(),
  } as unknown as Env;
}

const THEME_SCRIPT = 'var theme = 1;';
// 含 <\/script> 转义拼写字符（AnniversaryCards 倒计时注释同款）：
// HTML 解析器只认真的 </script>，提取正则不得被它提前截断
const RERUN_SCRIPT = 'var s = "<\\/script> ok"; var countdown = 2;';
const HOME_HTML = `<!doctype html><html><head>
<script>${THEME_SCRIPT}</script>
<script type="application/ld+json">{"x":1}</script>
<script type="module" src="/_astro/page.js"></script>
</head><body><script data-astro-rerun>${RERUN_SCRIPT}</script></body></html>`;
const MUSIC_HTML = '<html><body><script type="module" src="/_astro/music.js"></script></body></html>';
const SITEMAP_INDEX =
  '<?xml version="1.0"?><sitemapindex><sitemap><loc>https://kloa.fans/sitemap-0.xml</loc></sitemap></sitemapindex>';
const SITEMAP_0 =
  '<?xml version="1.0"?><urlset><url><loc>https://kloa.fans/</loc></url><url><loc>https://kloa.fans/music/</loc></url></urlset>';

function makeSiteEnv(): Env {
  return makeAssetsEnv({
    '/sitemap-index.xml': SITEMAP_INDEX,
    '/sitemap-0.xml': SITEMAP_0,
    '/': HOME_HTML,
    '/music/': MUSIC_HTML,
  });
}

describe('worker CSP（P2-6）', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('HTML：内联脚本 sha256 白名单（ld+json/外部 src 不计），关键指令齐备', async () => {
    const env = makeSiteEnv();
    const res = await call('https://kloa.fans/', env);
    const csp = res.headers.get('content-security-policy') ?? '';
    const scriptSrc = scriptSrcOf(csp);

    // hash 与 fixture 内联脚本逐一对上（原始字节，无实体解码）
    expect(scriptSrc).toContain(`'self' 'sha256-${await scriptHash(THEME_SCRIPT)}'`);
    expect(scriptSrc).toContain(`'sha256-${await scriptHash(RERUN_SCRIPT)}'`);
    // 只哈希可执行内联脚本：ld+json 与带 src 的模块脚本不产生 hash
    const hashCount = (scriptSrc.match(/'sha256-/g) ?? []).length;
    expect(hashCount).toBe(2);
    expect(scriptSrc).not.toContain("'unsafe-inline'");

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain('frame-src https://wj.qq.com');
    expect(csp).toContain('img-src \'self\' data: https://storage.googleapis.com https://platform-outputs.agnes-ai.space');
    expect(csp).toContain('media-src \'self\' data: https://storage.googleapis.com https://platform-outputs.agnes-ai.space');
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
    expect(csp).toContain("font-src 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('并集而非单页：/music/ 自身无内联脚本，但 CSP 仍含首页脚本的 hash（ClientRouter 跨页重执行前提）', async () => {
    const env = makeSiteEnv();
    const res = await call('https://kloa.fans/music/', env);
    const scriptSrc = scriptSrcOf(res.headers.get('content-security-policy') ?? '');
    expect(scriptSrc).toContain(`'sha256-${await scriptHash(THEME_SCRIPT)}'`);
    expect(scriptSrc).toContain(`'sha256-${await scriptHash(RERUN_SCRIPT)}'`);
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it('CSP 按 env 缓存：后续请求只付页面本身一次 ASSETS 调用，不再重爬 sitemap', async () => {
    const fetchSpy = vi.fn((req: Request) =>
      Promise.resolve(
        new URL(req.url).pathname === '/sitemap-index.xml'
          ? new Response('not found', { status: 404 })
          : new Response(MUSIC_HTML, { headers: { 'content-type': 'text/html' } }),
      ));
    const env = {
      AGNES_API_KEY: 'k',
      ASSETS: { fetch: fetchSpy },
    } as unknown as Env;
    await call('https://kloa.fans/music/', env);
    await call('https://kloa.fans/music/', env);
    // 2 次用户请求 = 页面本体×2 + 爬 sitemap×1（404 → 页数 0 → 宽松兜底）
    expect(fetchSpy.mock.calls.length).toBe(3);
    // 缓存生效：第 3 次请求只新增页面本体那 1 次，不再碰 sitemap
    await call('https://kloa.fans/music/', env);
    expect(fetchSpy.mock.calls.length).toBe(4);
    expect(fetchSpy.mock.calls.filter(([r]) => new URL(r.url).pathname === '/sitemap-index.xml')).toHaveLength(1);
  });

  it('sitemap 不可用：script-src 降级 unsafe-inline 保功能（部署异常兜底，smoke 兜底发现）', async () => {
    const env = makeAssetsEnv({
      '/': HOME_HTML,
    });
    const res = await call('https://kloa.fans/', env);
    const scriptSrc = scriptSrcOf(res.headers.get('content-security-policy') ?? '');
    expect(scriptSrc).toContain("'unsafe-inline'");
    // 其余指令不受降级影响
    expect(res.headers.get('content-security-policy')).toContain('frame-src https://wj.qq.com');
  });

  it('sitemap 正常但页面全部取回失败：同样降级 unsafe-inline（而非零 hash 白屏 CSP）', async () => {
    // sitemap 列出的页面全部 404（本页 '/' 存在走 HTML 分支）——零 hash 的
    // script-src 会拦掉全部内联脚本（白屏），必须走宽松兜底
    const env = makeAssetsEnv({
      '/': HOME_HTML,
      '/sitemap-index.xml': '<sitemapindex><loc>https://kloa.fans/sitemap-0.xml</loc></sitemapindex>',
      '/sitemap-0.xml': '<urlset><loc>https://kloa.fans/missing-page/</loc></urlset>',
    });
    const res = await call('https://kloa.fans/', env);
    const scriptSrc = scriptSrcOf(res.headers.get('content-security-policy') ?? '');
    expect(scriptSrc).toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'sha256-");
  });

  it('非 HTML 资产与 API：最紧封口 default-src none', async () => {
    const env = makeSiteEnv();
    const js = await call('https://kloa.fans/_astro/page.js', env);
    expect(js.headers.get('content-security-policy')).toBe("default-src 'none'; frame-ancestors 'none'");

    const api404 = await call('https://kloa.fans/api/nonexistent', env);
    expect(api404.headers.get('content-security-policy')).toBe("default-src 'none'; frame-ancestors 'none'");
  });
});
