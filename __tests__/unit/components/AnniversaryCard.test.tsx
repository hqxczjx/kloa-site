import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AnniversaryCard from '../../../src/components/react/AnniversaryCard';
import { Cake, Sparkles } from 'lucide-react';

describe('AnniversaryCard组件', () => {
  it('应该渲染生日卡片', () => {
    const birthday = new Date('2026-07-19');
    render(
      <AnniversaryCard
        type="birthday"
        date={birthday}
        label="生日"
        icon={<Cake className="w-5 h-5" />}
      />
    );

    expect(screen.getByText('生日')).toBeInTheDocument();
    expect(screen.getByText('2026-07-19')).toBeInTheDocument();
    expect(screen.getByText(/距离生日纪念日/)).toBeInTheDocument();
  });

  it('应该渲染出道日卡片', () => {
    const debut = new Date('2026-01-16');
    render(
      <AnniversaryCard
        type="debut"
        date={debut}
        label="出道日"
        icon={<Sparkles className="w-5 h-5" />}
      />
    );

    expect(screen.getByText('出道日')).toBeInTheDocument();
    expect(screen.getByText('2026-01-16')).toBeInTheDocument();
    expect(screen.getByText(/距离出道日纪念日/)).toBeInTheDocument();
  });

  it('应该显示距离上一次纪念日的天数', () => {
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);

    render(
      <AnniversaryCard
        type="birthday"
        date={pastDate}
        label="生日"
        icon={<Cake className="w-5 h-5" />}
      />
    );

    const daysText = screen.getByText(/天$/);
    expect(daysText).toBeInTheDocument();
    expect(screen.getByText(/距离生日纪念日/)).toBeInTheDocument();
  });

  it('应该显示距离上一次纪念日的天数', () => {
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1);

    render(
      <AnniversaryCard
        type="debut"
        date={pastDate}
        label="出道日"
        icon={<Sparkles className="w-5 h-5" />}
      />
    );

    const daysText = screen.getByText(/天$/);
    expect(daysText).toBeInTheDocument();
    expect(screen.getByText(/距离出道日纪念日/)).toBeInTheDocument();
  });

  it('应该渲染图标', () => {
    render(
      <AnniversaryCard
        type="birthday"
        date={new Date('2026-07-19')}
        label="生日"
        icon={<Cake className="w-5 h-5" data-testid="icon" />}
      />
    );

    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});
