import { describe, it, expect, vi, afterEach } from 'vitest';
import { readSrc } from '../optimizations/helpers';
import { ANNIVERSARIES } from '../../../src/data/anniversaries';

// 页面内联与单测跑的是同一份源文件（AnniversaryCards.astro 经 ?raw + set:html 注入 HTML）
async function runCountdown() {
  vi.resetModules();
  await import('../../../src/scripts/anniversary-countdown.js');
}

function mountDays(...dates: string[]) {
  document.body.innerHTML = dates.map((d) => `<div data-anniv-days="${d}">—</div>`).join('');
  return Array.from(document.querySelectorAll<HTMLElement>('[data-anniv-days]'));
}

// 期望天数从「观察时间 + 纪念日期」派生（日期单一数据源 src/data/anniversaries.ts，
// 原先 326/142 等字面期望与组件双维护，改日期必漏改一处的盲区）。
// 口径与 anniversary-countdown.js 相同：Date.UTC 纯日历差 + 今年已过翻明年。
// rollover 语义本身不靠它把关——下方「天数精确断言」组用合成日期手钉 268/0 字面值。
function expectedDays(nowISO: string, dateISO: string): number {
  const [y, m, d] = nowISO.split('-').map(Number);
  const today = Date.UTC(y, m - 1, d);
  const [, mm, dd] = dateISO.split('-').map(Number);
  let next = Date.UTC(y, mm - 1, dd);
  if (next < today) next = Date.UTC(y + 1, mm - 1, dd);
  return Math.round((next - today) / 86400000);
}

const NOW = '2026-08-27';

describe('AnniversaryCards 静态化（P2-2，倒计时内联脚本）', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('SSR 占位「—」被覆盖为两卡各自的天数', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${NOW}T00:00:00`));
    const [birthday, debut] = mountDays(...ANNIVERSARIES.map((a) => a.date));
    await runCountdown();
    // 2026 生日已过 → 2027-07-19（326 天）；出道日 → 2027-01-16（142 天）
    expect(birthday!.textContent).toBe(`${expectedDays(NOW, ANNIVERSARIES[0].date)} 天`);
    expect(debut!.textContent).toBe(`${expectedDays(NOW, ANNIVERSARIES[1].date)} 天`);
  });

  it('重复执行结果一致（幂等：纯重算覆盖 textContent）', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${NOW}T00:00:00`));
    const [birthday] = mountDays(...ANNIVERSARIES.map((a) => a.date));
    await runCountdown();
    await runCountdown();
    expect(birthday!.textContent).toBe(`${expectedDays(NOW, ANNIVERSARIES[0].date)} 天`);
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

    it('内联脚本带 data-astro-rerun（软导航返回后重执行，「—」占位不滞留）', () => {
      const src = readSrc('src/components/astro/AnniversaryCards.astro');
      // ClientRouter 按 textContent 去重脚本且不重执行：离开首页再软导航返回时
      // swap 进来的新 SSR DOM 无人回填天数——rerun 属性是 router 的重执行开关
      expect(src).toContain('<script is:inline set:html={countdownScript} data-astro-rerun />');
    });

    it('两卡日期/标签取自单一数据源且天数节点带 data-anniv-days 钩子', () => {
      const src = readSrc('src/components/astro/AnniversaryCards.astro');
      expect(src).toContain(`data-anniv-days={date}`);
      // 组件消费数据模块（日期/标签不再在本文件内重复声明）
      expect(src).toMatch(/import \{ ANNIVERSARIES \} from '\.\.\/\.\.\/data\/anniversaries'/);
      expect(src).not.toMatch(/date:\s*'/);
      // 数据源本身：两条 MM-DD 合法日期 + 非空标签
      expect(ANNIVERSARIES).toHaveLength(2);
      for (const { date, label } of ANNIVERSARIES) {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(label.trim().length).toBeGreaterThan(0);
      }
    });
  });
});
