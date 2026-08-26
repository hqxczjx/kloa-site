#!/usr/bin/env node
/**
 * 字体子集覆盖审计 —— CI（Unit Tests workflow）每次 push/PR 运行。
 *
 * 背景：serif 标题字体是按「当时源码字符集」生成的手动子集
 * （scripts/generate-font-subset.mjs，源 VF OTF ~21.6MB 不入库，只能本地重跑）。
 * 源码新增中文标题字符而未重新生成子集时，线上会静默缺字形（fallback 系统字体）。
 * 此脚本对比「现行源码字符集」与「子集清单快照 subset-chars.json」，发现缺口即失败，
 * 提示维护者本地跑 `bun run gen:fonts` 并提交产物。
 *
 * 本地验证：node scripts/check-font-coverage.mjs
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/\.(astro|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

// 与 generate-font-subset.mjs 完全一致的收集口径（仅源码，不含 data JSON）
const current = new Set();
for (const f of walk(join(ROOT, 'src'))) {
  const txt = readFileSync(f, 'utf-8');
  for (const ch of txt) if (/[一-鿿]/.test(ch)) current.add(ch);
}

let snapshot;
try {
  snapshot = new Set(JSON.parse(readFileSync(join(ROOT, 'scripts/fonts/subset-chars.json'), 'utf-8')));
} catch {
  console.error('❌ 读不到 scripts/fonts/subset-chars.json —— 请本地跑 bun run gen:fonts 生成快照');
  process.exit(1);
}

const missing = [...current].filter((ch) => !snapshot.has(ch));
if (missing.length > 0) {
  console.error(`❌ 子集缺 ${missing.length} 个现行源码字符：${missing.join('')}`);
  console.error('   修复：本地（需 scripts/fonts/ 下的源 OTF）运行 bun run gen:fonts，');
  console.error('   提交 public/fonts/*.woff2 与 scripts/fonts/subset-chars.json');
  process.exit(1);
}
console.log(`✅ 字体子集覆盖现行源码全部 ${current.size} 个中文字符`);
