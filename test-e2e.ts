#!/usr/bin/env bun
/**
 * E2E 测试包装脚本 - 自动检查并安装 Playwright 浏览器
 */

import { execSync } from 'child_process';
import { readdirSync } from 'fs';

function checkPlaywright() {
  // 不硬编码 build 号（如 chromium_headless_shell-1208）：Playwright 升级后 build 号会变，
  // 硬编码会导致本地误判浏览器未装、触发重复下载。缓存目录下存在任意 chromium* 目录即视为已安装。
  const cacheDir = process.env.HOME + '/.cache/ms-playwright';
  try {
    return readdirSync(cacheDir).some((name) => name.startsWith('chromium'));
  } catch {
    return false;
  }
}

function main() {
  if (!checkPlaywright()) {
    console.log('⚠️  Playwright 浏览器未安装');
    console.log('📦 正在安装 Playwright 浏览器...');
    try {
      execSync('bunx playwright install --with-deps chromium', { stdio: 'inherit' });
      console.log('✅ 安装完成');
    } catch (error) {
      console.error('❌ 安装失败，请手动运行: bun run setup:e2e');
      process.exit(1);
    }
  }

  console.log('▶️  运行 E2E 测试...\n');
  try {
    execSync('bunx playwright test', { stdio: 'inherit' });
  } catch (error) {
    process.exit(1);
  }
}

main();
