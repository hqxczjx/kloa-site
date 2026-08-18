// 手动本地运行：收集站内中文 → subset-font (harfbuzz) 子集化 → 输出 woff2 + 字符清单快照
// 用法：node scripts/generate-font-subset.mjs
// 源字体需先下载到 scripts/fonts/（见 .gitignore，不入库）。
// 跑完后 git 提交 public/fonts/*.woff2 与 scripts/fonts/subset-chars.json，
// 并由 scripts/check-font-coverage.mjs 在 CI 持续审计覆盖缺口（见其头部注释）。
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import subsetFont from 'subset-font';

const ROOT = process.cwd();

// 递归收集 src 下 .astro/.tsx
function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/\.(astro|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

// 基本拉丁字母 + 数字 + 标点（标题里可能出现的非中文字符）
const chars = new Set('Kloa0123456789- .');

// 收集 src 下所有中文字符：标题散落在嵌套 JSX/模板字符串里，
// 精确匹配易漏字，故全量收集站内中文，确保任何用 Noto Serif SC 的标题都不缺字。
//
// 知情决策：不收集 src/data/*.json（歌单数据）。理由（2026-08 实测）：
//   - 歌名/歌手由 songlist 组件渲染，不走 serif 字体（h1-h6 / font-serif 之外），
//     数据字符入子集属纯防御性支出；
//   - 实测纳入 songs.json 会使子集 120K → 324K/字重（共 +400K 下载量）。
// 若未来改版将歌名放入标题类元素，把下方 walk 的正则改为 /\.(astro|tsx|json)$/
// 并重跑本脚本即可。
for (const f of walk(join(ROOT, 'src'))) {
  const txt = readFileSync(f, 'utf-8');
  for (const ch of txt) if (/[一-鿿]/.test(ch)) chars.add(ch);
}
const text = [...chars].join('');
console.log(`subset text: ${text.length} chars`);

// 字符清单快照：入库，供 scripts/check-font-coverage.mjs 审计当前子集是否覆盖现行源码
writeFileSync(join(ROOT, 'scripts/fonts/subset-chars.json'), JSON.stringify([...chars].sort()) + '\n');

const WEIGHTS = [
  { src: 'scripts/fonts/NotoSerifSC-SemiBold.otf', out: 'public/fonts/noto-serif-sc-600.woff2' },
  { src: 'scripts/fonts/NotoSerifSC-Bold.otf', out: 'public/fonts/noto-serif-sc-700.woff2' },
];

for (const w of WEIGHTS) {
  const buf = readFileSync(join(ROOT, w.src));
  const subset = await subsetFont(buf, text, { targetFormat: 'woff2' });
  writeFileSync(join(ROOT, w.out), subset);
  console.log(`wrote ${w.out} (${subset.length} bytes, ${(subset.length / 1024).toFixed(1)} KB)`);
}
console.log('done');
