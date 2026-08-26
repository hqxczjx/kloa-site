#!/usr/bin/env node
/**
 * 构建期生成歌曲拼音数据：src/data/songs.json → src/data/generated/songs-data.ts
 *
 * 背景（docs/plans/2026-08-25-architecture-perf-roadmap.md P0-1/P0-2）：
 * - 歌曲数据原先序列化在 <astro-island> 的 props 属性里（~133KB），浏览器必须解析
 *   完整段才能首帧，且 JSON 属性双重转义（&quot;）压缩率差。外置为 TS 模块后，
 *   数据随 SongList island 的 JS chunk 按需加载（client:visible 水合时才拉取，
 *   享受 immutable 缓存），index.html 185KB → ~50KB。
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

function main() {
  if (isFresh()) {
    console.log('[generate-song-data] 产物已最新，跳过（src/data/generated/songs-data.ts）');
    return;
  }

  const songs = JSON.parse(readFileSync(SONGS_PATH, 'utf-8'));
  if (!Array.isArray(songs) || songs.length === 0) {
    throw new Error('songs.json 解析结果非非空数组');
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
      `（ASCII 标题省略拼音 ${asciiTitles} 个 / ASCII 歌手 ${asciiArtists} 个）`,
  );
}

main();
