import { describe, it, expect } from 'vitest';
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
});
