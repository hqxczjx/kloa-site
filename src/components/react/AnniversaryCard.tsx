import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { ReactElement } from 'react';

type AnniversaryType = 'birthday' | 'debut';

interface AnniversaryCardProps {
  type: AnniversaryType;
  date: Date;
  label: string;
  icon: ReactElement;
  className?: string;
}

export default function AnniversaryCard({ type, date, label, icon, className = '' }: AnniversaryCardProps) {
  // type 参数为未来扩展预留，用于不同纪念日类型的差异化处理
  void type;
  const daysSince = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const anniversary = new Date(date);
    anniversary.setHours(0, 0, 0, 0);
    const days = Math.floor((today.getTime() - anniversary.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, days);
  }, [date]);

  const nextOccurrence = useMemo(() => {
    const today = new Date();
    const nextDate = new Date(date);
    nextDate.setFullYear(today.getFullYear());
    if (nextDate < today) {
      nextDate.setFullYear(today.getFullYear() + 1);
    }
    return nextDate;
  }, [date]);

  const daysRemaining = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.floor((nextOccurrence.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }, [nextOccurrence]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className={`fixed glass rounded-2xl p-4 backdrop-blur-md bg-white/10 dark:bg-slate-900/10 border border-white/20 dark:border-white/5 shadow-lg hover:scale-105 transition-transform duration-300 ${className}`}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
      </div>

      <div className="mb-1">
        <div className="text-2xl font-bold font-serif" style={{ color: 'var(--text-primary)' }}>
          {daysRemaining} 天
        </div>
        <div className="text-xs opacity-75">距离{label}</div>
      </div>

      <div>
        <div className="text-sm opacity-90" style={{ color: 'var(--text-primary)' }}>
          {daysSince} 天
        </div>
        <div className="text-xs opacity-60">已过</div>
      </div>
    </motion.div>
  );
}
