#!/usr/bin/env node
/**
 * dist 产物体积统计 —— bundle-size.yml（PR 触发）调用。
 *
 * 用法：
 *   node scripts/bundle-size.mjs                    # 统计 ./dist，打印表格
 *   node scripts/bundle-size.mjs --json > out.json  # 输出 JSON（供对比）
 *   node scripts/bundle-size.mjs compare a.json b.json
 *     # 对比两份 JSON，输出 PR 评论用 markdown（exit 1 当总体积增长 > 100KB）
 *
 * 口径为原始字节数（非 gzip）——网络传输看 gzip/br，但缓存命中与磁盘占用看原始
 * 体积，且原始体积对「新增依赖/未裁剪资源」更敏感。
 */
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = join(process.cwd(), 'dist');
const KB = 1024;

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function classify(file) {
  const rel = relative(DIST, file);
  if (rel.startsWith('_astro/') && file.endsWith('.js')) return 'js';
  if (rel.startsWith('_astro/') && file.endsWith('.css')) return 'css';
  if (rel.startsWith('fonts/')) return 'fonts';
  if (/\.(png|jpe?g|webp|avif|gif|svg|ico)$/.test(file)) return 'images';
  if (file.endsWith('.html')) return 'html';
  return 'other';
}

function measure() {
  const byCat = { js: 0, css: 0, fonts: 0, images: 0, html: 0, other: 0 };
  const files = walk(DIST);
  for (const f of files) byCat[classify(f)] += statSync(f).size;
  return { total: files.reduce((s, f) => s + statSync(f).size, 0), files: files.length, ...byCat };
}

const [, , cmd, ...args] = process.argv;

if (cmd === 'compare') {
  const [aPath, bPath] = args;
  const a = JSON.parse(readFileSync(aPath, 'utf-8')); // main 基线
  const b = JSON.parse(readFileSync(bPath, 'utf-8')); // PR
  const fmt = (n) => `${(n / KB).toFixed(1)} KB`;
  const lines = [
    '## 📦 Bundle 体积（原始字节，非 gzip）',
    '',
    '| 类别 | main | PR | Δ |',
    '|---|---:|---:|---:|',
  ];
  let grew = false;
  for (const key of ['js', 'css', 'fonts', 'images', 'html', 'other', 'total']) {
    const d = b[key] - a[key];
    const sign = d > 0 ? '+' : '';
    const mark = d > 50 * KB ? ' ⚠️' : '';
    if (d > 100 * KB) grew = true;
    lines.push(`| ${key} | ${fmt(a[key])} | ${fmt(b[key])} | ${sign}${fmt(d)}${mark} |`);
  }
  lines.push('', `文件数：${a.files} → ${b.files}`);
  console.log(lines.join('\n'));
  process.exit(grew ? 1 : 0);
}

const m = measure();
if (cmd === '--json') {
  console.log(JSON.stringify(m));
} else {
  for (const [k, v] of Object.entries(m)) {
    console.log(k === 'files' ? `files  ${v}` : `${k === 'total' ? 'total' : k.padEnd(6)} ${(v / KB).toFixed(1)} KB`);
  }
}
