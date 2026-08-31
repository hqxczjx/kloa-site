#!/usr/bin/env node
/**
 * 生产站点冒烟测试 —— smoke.yml 定时调用（每日 sync-songs 部署后）。
 *
 * 防护场景：sync-songs 推 main → CF Pages 自动部署这条链路里，数据抓取失败
 * 会有 workflow 报错邮件，但「部署成功却内容坏了/资源 404/投稿问卷过期」
 * 属于静默失败，只有访客能发现。此脚本用内容特征（而非仅状态码）验证。
 *
 * 本地验证（若走代理需开 env proxy）：NODE_USE_ENV_PROXY=1 node scripts/smoke.mjs
 * CI runner 直连外网，无需代理。
 *
 * 响应头断言（安全五头/SWR/immutable）依赖部署后的 worker（SITE_URL 指向的
 * 站点）——本地 dev server 无这些头，会失败；属预期。
 */
const SITE_URL = process.env.SITE_URL ?? 'https://kloa.fans';

// 投稿问卷（ContributeDialog 入口）。问卷过期后 HTTP 仍 200、页面显示截止文案，
// 状态码检查无效，必须用内容特征判断存活。
const CONTRIBUTE_FORM_URL = 'https://wj.qq.com/s2/27522632/db0v/';
const FORM_DEAD_MARKERS = ['问卷已停止', '问卷已截止', '问卷不存在', '问卷已结束', '活动已结束'];

let failed = 0;
const report = (name, ok, detail) => {
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` —— ${detail}` : ''}`);
  if (!ok) failed++;
};

async function fetchText(url) {
  const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'kloa-smoke/1.0' } });
  const text = await res.text();
  return { res, text };
}

// 1. 首页：状态码 + 内容特征（页面确实是本站且 Astro 正常渲染）
{
  const { res, text } = await fetchText(SITE_URL + '/');
  const hasLang = text.includes('lang="zh-CN"');
  const hasTitle = /<title>[^<]+<\/title>/.test(text);
  report('首页可达且已渲染', res.status === 200 && hasLang && hasTitle,
    `status=${res.status} lang=${hasLang} title=${hasTitle}`);

  // worker 落地的安全五头 + 边缘 SWR（真源 worker/index.ts，部署后回归）
  const secHeaders = [
    'x-content-type-options',
    'referrer-policy',
    'x-frame-options',
    'permissions-policy',
    'strict-transport-security',
  ];
  const missing = secHeaders.filter((h) => !res.headers.get(h));
  const cdnCc = res.headers.get('cdn-cache-control') ?? '';
  report('HTML 安全五头 + 边缘 SWR 头', missing.length === 0 && cdnCc.includes('stale-while-revalidate'),
    `missing=[${missing.join(',')}] cdn-cache-control=${cdnCc || '(无)'}`);

  // CSP（P2-6）：内联脚本 hash 白名单生效。若 sitemap 爬取异常，worker 会
  // 降级 script-src 'unsafe-inline'（保功能），此处断言及时暴露降级状态。
  const csp = res.headers.get('content-security-policy') ?? '';
  const scriptSrc = /(?:^|;\s*)script-src ([^;]+)/.exec(csp)?.[1] ?? '';
  report('HTML CSP hash 白名单', csp.length > 0 && /'sha256-/.test(scriptSrc) && !scriptSrc.includes("'unsafe-inline'") && csp.includes('frame-src https://wj.qq.com'),
    `script-src=${scriptSrc.slice(0, 60) || '(无 CSP)'}${scriptSrc.includes("'unsafe-inline'") ? '【已降级】' : ''}`);
}

// 2. /_astro/* 构建产物：immutable 单值（回归双值 cache-control）
{
  const { text: home } = await fetchText(SITE_URL + '/');
  const asset = home.match(/\/_astro\/[\w.-]+\.(?:js|css|woff2)/)?.[0];
  if (!asset) {
    report('/_astro/* 资产头', false, '首页 HTML 未找到 /_astro/* 引用');
  } else {
    const res = await fetch(SITE_URL + asset, { headers: { 'user-agent': 'kloa-smoke/1.0' } });
    const cc = res.headers.get('cache-control') ?? '';
    report('/_astro/* 资产头', cc.includes('immutable') && !cc.includes('must-revalidate'),
      `${asset} cache-control=${cc || '(无)'}`);
  }
}

// 3. 字体子集：serif 标题 variable 字体可加载且非空壳（>10KB 才含真实字形）
{
  const res = await fetch(SITE_URL + '/fonts/noto-serif-sc-var.woff2', { method: 'GET' });
  const buf = await res.arrayBuffer();
  report('字体子集可加载', res.status === 200 && buf.byteLength > 10 * 1024,
    `status=${res.status} size=${(buf.byteLength / 1024).toFixed(1)}KB`);
}

// 4. sitemap：SEO 基础设施在线
{
  const { res, text } = await fetchText(SITE_URL + '/sitemap-index.xml');
  report('sitemap 在线', res.status === 200 && text.includes('sitemap'), `status=${res.status}`);
}

// 5. 投稿问卷存活：内容特征判断（非状态码）
{
  const { res, text } = await fetchText(CONTRIBUTE_FORM_URL);
  const dead = FORM_DEAD_MARKERS.filter((m) => text.includes(m));
  report('投稿问卷存活', res.status === 200 && dead.length === 0,
    dead.length ? `命中失效特征: ${dead.join('/')}` : `status=${res.status}`);
}

if (failed > 0) {
  console.error(`\n${failed} 项冒烟失败`);
  process.exit(1);
}
console.log('\n全部冒烟通过');
