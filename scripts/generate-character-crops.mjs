// 手动本地运行：从 public/images/illustration.webp 生成四档参考图（换装图生图用）。
// 用法：node scripts/generate-character-crops.mjs（或 bun run gen:crops）
// 根因：立绘原图 1024×2496（≈1:2.44），直接送入失配画布做图生图会被模型压扁/重构人体。
// 三档顶部对齐裁切（头→胸口/腰/膝）+ 一档 letterbox 全身（API 最竖仅 9:16，装不下
// 1:2.44 立绘，等比缩小居中、两侧黑边由生图模型补背景）。
// 四档与 worker/_lib/config.ts 的 RATIO_FRAMES、前端 RATIO_PREVIEW 一一对应。
// 立绘更新后需重跑并提交 public/images/illustration-*.webp（与 gen:fonts 同模式）。
import { join } from 'node:path';
import { statSync } from 'node:fs';
import sharp from 'sharp';

const ROOT = process.cwd();
const SRC = join(ROOT, 'public/images/illustration.webp');

// 原图尺寸守卫：立绘更新后需重跑本脚本，若尺寸变化必须重新标定 CROPS/FULL
const { width, height } = await sharp(SRC).metadata();
if (width !== 1024 || height !== 2496)
  throw new Error(`illustration.webp 尺寸 ${width}x${height} 与标定值 1024x2496 不符，请按新图重新标定 CROPS/FULL 后再生成`);

// 顶部对齐裁切档（头顶必须完整，脚部取舍）。
const CROPS = [
  { name: 'illustration-1x1.webp', width: 1024, height: 1024 },                 // 头→胸口
  { name: 'illustration-3x4.webp', width: 1024, height: 1365 },  // 1365 = floor(1024×4/3)，头→腰
  { name: 'illustration-9x16.webp', width: 1024, height: 1820 }, // 1820 = floor(1024×16/9)，头→膝
];

// letterbox 全身档：等比缩到高 1820（宽 746 = floor(1024×1820/2496)），水平居中，
// 两侧各留 139px 纯黑（与立绘原背景一致），人物全身含脚、比例不畸变。
const FULL = { name: 'illustration-9x16-full.webp', width: 746, height: 1820, pad: 139 };

for (const { name, width, height } of CROPS) {
  const outputPath = join(ROOT, 'public/images', name);
  await sharp(SRC)
    .extract({ left: 0, top: 0, width, height })
    .webp({ quality: 90 })
    .toFile(outputPath);
  const sizeInBytes = statSync(outputPath).size;
  console.log(`wrote public/images/${name} (${sizeInBytes} bytes, ${(sizeInBytes / 1024).toFixed(1)} KB)`);
}

{
  const { name, width, height, pad } = FULL;
  const outputPath = join(ROOT, 'public/images', name);
  await sharp(SRC)
    .resize(width, height, { fit: 'fill' })  // 精确目标尺寸（宽高按等比算好，fit:fill 不再缩放）
    .extend({ left: pad, right: pad, top: 0, bottom: 0, background: '#000000' })
    .webp({ quality: 90 })
    .toFile(outputPath);
  const sizeInBytes = statSync(outputPath).size;
  console.log(`wrote public/images/${name} (${sizeInBytes} bytes, ${(sizeInBytes / 1024).toFixed(1)} KB)`);
}
console.log('done');
