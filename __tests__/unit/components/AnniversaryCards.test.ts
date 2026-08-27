import { describe, it, expect, vi, afterEach } from 'vitest';
import { readSrc } from '../optimizations/helpers';

// 页面内联与单测跑的是同一份源文件（AnniversaryCards.astro 经 ?raw + set:html 注入 HTML）
async function runCountdown() {
  vi.resetModules();
  await import('../../../src/scripts/anniversary-countdown.js');
}

function mountDays(...dates: string[]) {
  document.body.innerHTML = dates.map((d) => `<div data-anniv-days="${d}">—</div>`).join('');
  return Array.from(document.querySelectorAll<HTMLElement>('[data-anniv-days]'));
}

describe('AnniversaryCards 静态化（P2-2，倒计时内联脚本）', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('SSR 占位「—」被覆盖为两卡各自的天数', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-27T00:00:00'));
    const [birthday, debut] = mountDays('2026-07-19', '2026-01-16');
    await runCountdown();
    // 2026 生日已过 → 2027-07-19（326 天）；出道日 → 2027-01-16（142 天）
    expect(birthday!.textContent).toBe('326 天');
    expect(debut!.textContent).toBe('142 天');
  });

  it('重复执行结果一致（幂等：纯重算覆盖 textContent）', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-27T00:00:00'));
    const [birthday] = mountDays('2026-07-19');
    await runCountdown();
    await runCountdown();
    expect(birthday!.textContent).toBe('326 天');
  });

  describe('天数精确断言（rollover，移植自 AnniversaryCard.test.tsx）', () => {
    it('今年纪念日已过则翻转到明年，显示到下一次的精确天数', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-15T00:00:00'));
      const [el] = mountDays('2020-03-10');
      await runCountdown();
      // 2026-03-10 已过（< 2026-06-15）→ 下一次是 2027-03-10，距今整 268 天
      expect(el!.textContent).toBe('268 天');
    });

    it('纪念日恰是今天显示 0 天（边界：nextDate === today 不 rollover）', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-15T00:00:00'));
      const [el] = mountDays('2020-06-15');
      await runCountdown();
      expect(el!.textContent).toBe('0 天');
    });
  });

  describe('静态标记（与旧 React 版逐类对齐）', () => {
    it('保留 hidden md:block md:fixed 定位与 animate-fade-up 动画类', () => {
      const src = readSrc('src/components/astro/AnniversaryCards.astro');
      expect(src).toContain('animate-fade-up');
      expect(src).toContain('hidden md:block md:fixed md:bottom-24 md:right-6 md:w-48 md:z-20');
      expect(src).toContain('hidden md:block md:fixed md:bottom-64 md:right-6 md:w-48 md:z-20');
    });

    it('两卡日期/标签齐全且天数节点带 data-anniv-days 钩子', () => {
      const src = readSrc('src/components/astro/AnniversaryCards.astro');
      expect(src).toContain(`data-anniv-days={date}`);
      expect(src).toMatch(/date:\s*'2026-07-19'/);
      expect(src).toMatch(/date:\s*'2026-01-16'/);
      expect(src).toMatch(/label:\s*'生日'/);
      expect(src).toMatch(/label:\s*'出道日'/);
    });
  });
});
