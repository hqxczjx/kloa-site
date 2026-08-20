import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import AnniversaryCard from '../../../src/components/react/AnniversaryCard';
import { Cake } from 'lucide-react';

describe('AnniversaryCard组件', () => {
  it('应该渲染生日卡片', () => {
    const birthday = new Date('2026-07-19');
    render(
      <AnniversaryCard
        date={birthday}
        label="生日"
        icon={<Cake className="w-5 h-5" />}
      />
    );

    expect(screen.getByText('生日')).toBeInTheDocument();
    expect(screen.getByText('2026-07-19')).toBeInTheDocument();
    expect(screen.getByText(/距离生日纪念日/)).toBeInTheDocument();
  });

  it('应该显示距离下一个纪念日的天数', async () => {
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);

    render(
      <AnniversaryCard
        date={pastDate}
        label="生日"
        icon={<Cake className="w-5 h-5" />}
      />
    );

    expect(screen.getByText(/距离生日纪念日/)).toBeInTheDocument();
    // 天数在挂载后（useEffect）计算，初始为占位「—」，故用 findByText 等待
    expect(await screen.findByText(/天$/)).toBeInTheDocument();
  });

  it('应该渲染图标', () => {
    render(
      <AnniversaryCard
        date={new Date('2026-07-19')}
        label="生日"
        icon={<Cake className="w-5 h-5" data-testid="icon" />}
      />
    );

    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  describe('天数精确断言（rollover）', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('今年纪念日已过则翻转到明年，显示到下一次的精确天数（AnniversaryCard.tsx L25-29）', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-15T00:00:00'));

      render(
        <AnniversaryCard
          date={new Date('2020-03-10')}
          label="生日"
          icon={<Cake className="w-5 h-5" />}
        />
      );

      // 2026-03-10 已过（< 2026-06-15）→ 下一次是 2027-03-10，距今天整 268 天
      expect(screen.getByText('268 天')).toBeInTheDocument();
    });

    it('纪念日恰是今天显示 0 天（边界：nextDate === today 不 rollover）', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-15T00:00:00'));

      render(
        <AnniversaryCard
          date={new Date('2020-06-15')}
          label="生日"
          icon={<Cake className="w-5 h-5" />}
        />
      );

      expect(screen.getByText('0 天')).toBeInTheDocument();
    });
  });
});
