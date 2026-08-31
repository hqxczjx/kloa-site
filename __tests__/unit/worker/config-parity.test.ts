// 配置漂移防护（Task#8 审查跟进）：Workers Rate Limiting binding 的 limit/period
// 固定在 wrangler.jsonc，代码侧窗口在 worker/_lib/config.ts——两处必须一致，
// 漂移会导致实际限流语义与代码假设（如 Retry-After 值）不符且无任何报错。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { RATE_LIMIT_WINDOW_SEC, VIDEO_STATUS_RATE_LIMIT_WINDOW_SEC } from '../../../worker/_lib/config';

const wranglerJsonc = readFileSync(resolve(__dirname, '../../../wrangler.jsonc'), 'utf8');

function bindingPeriod(bindingName: string): number {
  const re = new RegExp(`"name":\\s*"${bindingName}"[\\s\\S]*?"period":\\s*(\\d+)`);
  const m = re.exec(wranglerJsonc);
  if (!m) throw new Error(`wrangler.jsonc 未找到 binding ${bindingName} 的 period`);
  return Number(m[1]);
}

describe('限流配置一致性（wrangler.jsonc ↔ worker/_lib/config.ts）', () => {
  it('RATE_LIMITER 的 period 与 RATE_LIMIT_WINDOW_SEC 相等', () => {
    expect(bindingPeriod('RATE_LIMITER')).toBe(RATE_LIMIT_WINDOW_SEC);
  });

  it('RATE_LIMITER_STATUS 的 period 与 VIDEO_STATUS_RATE_LIMIT_WINDOW_SEC 相等', () => {
    expect(bindingPeriod('RATE_LIMITER_STATUS')).toBe(VIDEO_STATUS_RATE_LIMIT_WINDOW_SEC);
  });
});
