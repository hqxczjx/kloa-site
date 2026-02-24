#!/usr/bin/env bun
/**
 * E2E 测试包装脚本 - 自动检查并安装 Playwright 浏览器
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

function checkPlaywright() {
  const chromiumPath = process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1208';
  return existsSync(chromiumPath);
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
