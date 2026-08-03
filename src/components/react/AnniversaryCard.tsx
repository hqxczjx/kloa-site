import { useMemo, useState, useEffect } from 'react';
import type { ReactElement } from 'react';

interface AnniversaryCardProps {
  date: Date;
  label: string;
  icon: ReactElement;
  className?: string;
}

export default function AnniversaryCard({ date, label, icon, className = '' }: AnniversaryCardProps) {
  // 天数依赖「今天」，渲染期算会导致 SSR/客户端不一致 → 移入 useEffect，初始占位。
  const [days, setDays] = useState<number | null>(null);

  // formatDate 只依赖固定 date prop（不取「今天」），SSR/客户端一致，可保留渲染期计算。
  const formatDate = useMemo(() => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [date]);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextDate = new Date(date);
    nextDate.setFullYear(today.getFullYear());
    if (nextDate < today) {
      nextDate.setFullYear(today.getFullYear() + 1);
    }
    setDays(Math.floor((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  }, [date]);

  return (
    <div
      className={`fixed glass rounded-2xl p-4 backdrop-blur-md bg-white/10 dark:bg-slate-900/10 border border-white/20 dark:border-white/5 shadow-lg hover:scale-105 transition-transform duration-300 animate-fade-up ${className}`}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
      </div>

      <div className="mb-2">
        <div className="text-2xl font-bold font-serif" style={{ color: 'var(--text-primary)' }}>
          {formatDate}
        </div>
      </div>

      <div>
        <div className="text-xs opacity-75">距离{label}纪念日</div>
        <div className="text-2xl font-bold font-serif" style={{ color: 'var(--text-primary)' }}>
          {days === null ? '—' : `${days} 天`}
        </div>
      </div>
    </div>
  );
}
