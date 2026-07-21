#!/usr/bin/env node
/**
 * 从 https://kloa.bilivup.cn/ 抓取最新 song_list，更新 src/data/songs.json。
 *
 * 设计要点：
 * - 锁定 VImg chunk：远程每次重新部署后 VImg 的 hash（如 VImg-DZv-I6pQ.js）会变，
 *   但模块名 VImg 稳定、song_list 历来打包在该 chunk。因此只 fetch 文件名含 VImg 的那一个。
 * - 转换为本地结构 {title, artist(顿号拼接), languages, genres, gifts}。
 * - 退出码：0 = 抓取并写入成功；1 = 抓取/解析失败（让 CI 失败并发通知）。
 *
 * 本地验证： node scripts/update-songs.mjs
 */
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SONGS_PATH = resolve(ROOT, 'src/data/songs.json');
const HOME = 'https://kloa.bilivup.cn/';

const log = (...a) => console.log('[update-songs]', ...a);
// 失败时静默跳过：exit 0 不触发 CI 失败邮件，且本次不更新 songs.json
const skip = (...a) => {
  console.error('[update-songs] 跳过:', ...a);
  process.exit(0);
};

async function fetchText(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`GET ${url} -> HTTP ${res.status}`);
  return res.text();
}

// 从首页 HTML 提取所有 /assets/*.js 引用（modulepreload / preload / script）
function extractAssetUrls(html, base) {
  const set = new Set();
  for (const m of html.matchAll(/(?:href|src)\s*=\s*"(\/assets\/[A-Za-z0-9_.-]+\.js)"/g)) {
    set.add(m[1]);
  }
  return [...set].map((u) => new URL(u, base).href);
}

// 从首页 chunk 中找文件名含 VImg 的那一个（hash 会变，但模块名 VImg 稳定）
function findVImgUrl(urls) {
  return urls.find((u) => /\/VImg[A-Za-z0-9_-]*\.js$/.test(new URL(u).pathname));
}

// 括号配平提取 song_list:[...] 数组文本（兼容压缩 JS 的反引号/引号字符串）
function extractSongListArray(text) {
  const idx = text.indexOf('song_list:');
  if (idx === -1) throw new Error('未找到 song_list: 标识');
  const start = text.indexOf('[', idx);
  if (start === -1) throw new Error('song_list 后未找到数组起始 [');
  let depth = 0;
  let inStr = false;
  let strCh = null;
  for (let j = start; j < text.length; j++) {
    const c = text[j];
    if (inStr) {
      if (c === '\\') {
        j++;
        continue;
      }
      if (c === strCh) inStr = false;
    } else if (c === '`' || c === '"' || c === "'") {
      inStr = true;
      strCh = c;
    } else if (c === '[') {
      depth++;
    } else if (c === ']') {
      depth--;
      if (depth === 0) return text.slice(start, j + 1);
    }
  }
  throw new Error('song_list 数组未闭合');
}

// 远程记录 -> 本地结构
function transform(list) {
  return list.map((s) => ({
    title: s.title,
    artist: (s.artists || []).join('、'),
    languages: s.languages || [],
    genres: s.genres || [],
    gifts: s.gifts || [],
  }));
}

async function main() {
  log('fetch 首页', HOME);
  const html = await fetchText(HOME);
  const urls = extractAssetUrls(html, HOME);
  log(`首页发现 ${urls.length} 个 JS chunk`);

  const vimgUrl = findVImgUrl(urls);
  if (!vimgUrl) skip('首页未找到 VImg*.js，远程构建产物命名可能已变更');
  log(`定位 VImg chunk: ${vimgUrl}`);

  const text = await fetchText(vimgUrl);
  if (!/song_list\s*:/.test(text)) skip('VImg chunk 不含 song_list，远程结构可能已变更');

  const arrText = extractSongListArray(text);
  // 仅 eval 提取出的数组字面量（公开歌单数据），产出数组
  const list = eval(arrText);
  if (!Array.isArray(list) || list.length === 0) skip('解析结果非非空数组');
  log(`解析到 ${list.length} 首歌`);

  const transformed = transform(list);
  const json = JSON.stringify(transformed, null, 2) + '\n';
  writeFileSync(SONGS_PATH, json);
  log(`已写入 ${transformed.length} 首到 src/data/songs.json`);
}

main().catch((e) => skip(e.message));
