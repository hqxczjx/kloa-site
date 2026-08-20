import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// optimizations 守护测试共用:按仓库相对路径读源文件
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
export const readSrc = (rel: string): string => readFileSync(join(ROOT, rel), 'utf-8');
export const srcPath = (rel: string): string => join(ROOT, rel);
