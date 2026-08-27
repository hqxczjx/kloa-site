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

describe('worker fetch 路由与响应头（run_worker_first 下 _headers 不生效，此处才是真源）', () => {
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
