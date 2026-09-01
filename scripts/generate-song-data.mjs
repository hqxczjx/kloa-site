#!/usr/bin/env node
/**
 * 构建期生成歌曲拼音数据：src/data/songs.json → src/data/generated/songs-data.ts
 *
 * 背景（docs/plans/2026-08-25-architecture-perf-roadmap.md P0-1/P0-2）：
 * - 歌曲数据原先序列化在 <astro-island> 的 props 属性里（实测 135,781 字符 ≈133KB），
 *   浏览器必须解析完整段才能首帧，且 JSON 属性双重转义（&quot;）压缩率差。外置为
 *   TS 模块后，数据随 SongList island 的 JS chunk 按需加载（client:visible 水合时
 *   才拉取，享受 immutable 缓存），当时实测 index.html 185KB → ~50KB。
 *   注意：后续 P2-3（VirtualList → content-visibility）全量 SSR 427 行回灌 +~172KB，
 *   终态首页 HTML ~225.5KB（gzip 27KB，重复行压缩率高）——「HTML -133KB」只是
 *   P0-1 时点的数字，勿再当基线引用（见 roadmap 2026-08-31 终态修正）。
 * - pinyinKey 逻辑由 src/components/react/songlist/pinyin.server.ts 迁入本脚本：
 *   pinyin-pro 仅构建期使用，不进客户端 bundle。
 * - 纯 ASCII 标题/歌手的 pinyinKey 输出与 toLowerCase() 逐字节相同，直接省略拼音
 *   字段（undefined），运行时在 utils.ts 回退 song.title.toLowerCase()。
 *
 * 产物 src/data/generated/ 已 gitignore：所有消费入口（build / test / type-check /
 * astro-check / dev / e2e webServer）的脚本都先跑本脚本。幂等：产物比 songs.json
 * 与本脚本都新时跳过重写（多脚本串联时近乎零开销）。
 *
 * 本地验证：node scripts/generate-song-data.mjs
 */
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pinyin } from 'pinyin-pro';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SONGS_PATH = resolve(ROOT, 'src/data/songs.json');
const OUT_DIR = resolve(ROOT, 'src/data/generated');
const OUT_PATH = resolve(OUT_DIR, 'songs-data.ts');

const PINYIN_OPTS = { toneType: 'none', type: 'array' };
const pinyinKey = (text) => pinyin(text, PINYIN_OPTS).join('').toLowerCase();
const isAscii = (text) => /^[\x00-\x7F]*$/.test(text);

// 产物新鲜则跳过（songs.json 与本脚本均不晚于产物）
function isFresh() {
  try {
    const outMtime = statSync(OUT_PATH).mtimeMs;
    return (
      outMtime >= statSync(SONGS_PATH).mtimeMs &&
      outMtime >= statSync(new URL(import.meta.url)).mtimeMs
    );
  } catch {
    return false;
  }
}

// JSON.parse 报错只有 V8 的一句话（如 "Unexpected token } ... position 123"），
// 不带文件与上下文——多脚本串联时无从定位。这里捕获后补：哪个文件、第几行第几列
// （offset）、出错行原文与指示列，再以 cause 链回原错误。
function parseSongsJson(raw) {
  try {
    return JSON.parse(raw);
  } catch (err) {
    const rel = 'src/data/songs.json';
    const at = Number(/position (\d+)/.exec(String(err.message))?.[1] ?? NaN);
    if (!Number.isFinite(at)) {
      throw new Error(`${rel} JSON 解析失败：${err.message}\n  文件头 200 字符：${raw.slice(0, 200)}`, { cause: err });
    }
    const lineStart = raw.lastIndexOf('\n', at - 1) + 1;
    const lineEnd = raw.indexOf('\n', at) === -1 ? raw.length : raw.indexOf('\n', at);
    const line = raw.slice(0, at).split('\n').length;
    const col = at - lineStart + 1;
    const ctx = raw.slice(lineStart, lineEnd).trimEnd();
    throw new Error(
      `${rel} JSON 解析失败：${err.message}\n` +
        `  第 ${line} 行第 ${col} 列（offset ${at}）：\n` +
        `    ${ctx}\n` +
        `    ${' '.repeat(col - 1)}^`,
      { cause: err },
    );
  }
}

// 逐条校验（songs.json 由 CI 每日从远程同步，不能默认它干净）：
// - title 非非空字符串 → 跳过整条并点名（无标题的条目在歌单里无法检索/展示）；
// - artist 非非空字符串 → 规范化为 '' 并点名（曲名仍有效：实测线上数据确有
//   artist 为空串的伴奏曲「斯卡布罗集市」，跳整条会让站点凭空少歌）。
// 只显式报告，不让脏数据静默混进产物；全坏（无可写条目）才抛错阻断构建。
function validateSongs(songs) {
  const skipped = [];
  const fixed = [];
  const valid = [];
  songs.forEach((s, idx) => {
    if (typeof s?.title !== 'string' || s.title.trim() === '') {
      skipped.push(`#${idx}（title=${JSON.stringify(s?.title)}）`);
      return;
    }
    const entry = { ...s };
    if (typeof s.artist !== 'string' || s.artist.trim() === '') {
      if (s.artist !== '') fixed.push(`#${idx}（artist=${JSON.stringify(s.artist)}）`);
      entry.artist = '';
    }
    valid.push(entry);
  });
  if (skipped.length > 0) {
    console.warn(`[generate-song-data] 跳过 ${skipped.length} 条无标题条目：${skipped.join('、')}`);
  }
  if (fixed.length > 0) {
    console.warn(`[generate-song-data] ${fixed.length} 条 artist 畸形已规范化为 ''：${fixed.join('、')}`);
  }
  return valid;
}

function main() {
  if (isFresh()) {
    console.log('[generate-song-data] 产物已最新，跳过（src/data/generated/songs-data.ts）');
    return;
  }

  const parsed = parseSongsJson(readFileSync(SONGS_PATH, 'utf-8'));
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('songs.json 解析结果非非空数组');
  }
  const songs = validateSongs(parsed);
  if (songs.length === 0) {
    throw new Error('songs.json 全部条目畸形（title/artist 非非空字符串），已阻断生成');
  }

  let asciiTitles = 0;
  let asciiArtists = 0;
  const withPinyin = songs.map((s) => {
    const out = { title: s.title, artist: s.artist };
    if (isAscii(s.title)) asciiTitles++;
    else out.titlePinyin = pinyinKey(s.title);
    if (isAscii(s.artist)) asciiArtists++;
    else out.artistPinyin = pinyinKey(s.artist);
    out.languages = s.languages ?? [];
    out.genres = s.genres ?? [];
    out.gifts = s.gifts ?? [];
    return out;
  });

  const banner = `// 由 scripts/generate-song-data.mjs 生成，勿手改（src/data/generated/ 已 gitignore）。
// 数据源：src/data/songs.json（每日 CI 同步）；拼音字段：纯 ASCII 省略（P0-2），运行时回退 toLowerCase。
`;
  const body = `import type { Song } from '../../components/react/songlist/types';

export const SONGS: Song[] = ${JSON.stringify(withPinyin, null, 2)};
`;
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_PATH, banner + body);

  console.log(
    `[generate-song-data] 已写入 ${withPinyin.length} 首到 src/data/generated/songs-data.ts` +
      `（ASCII 标题省略拼音 ${asciiTitles} 个 / ASCII 歌手 ${asciiArtists} 个` +
      `${parsed.length !== songs.length ? ` / 跳过畸形 ${parsed.length - songs.length} 条` : ''}）`,
  );
}

main();
