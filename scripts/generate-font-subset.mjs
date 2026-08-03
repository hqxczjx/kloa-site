// 一次性本地运行：收集站内中文 → subset-font (harfbuzz) 子集化 → 输出 woff2
// 用法：node scripts/generate-font-subset.mjs
// 源字体需先下载到 scripts/fonts/（见 .gitignore，不入库）
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
for (const f of walk(join(ROOT, 'src'))) {
  const txt = readFileSync(f, 'utf-8');
  for (const ch of txt) if (/[一-鿿]/.test(ch)) chars.add(ch);
}
const text = [...chars].join('');
console.log(`subset text: ${text.length} chars`);

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
