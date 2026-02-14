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
  const nextOccurrence = useMemo(() => {
    const today = new Date();
    const nextDate = new Date(date);
    nextDate.setFullYear(today.getFullYear());
    if (nextDate < today) {
      nextDate.setFullYear(today.getFullYear() + 1);
    }
    return nextDate;
  }, [date]);

  const daysUntilNext = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.floor((nextOccurrence.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }, [nextOccurrence]);

  const formatDate = useMemo(() => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [date]);

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

      <div className="mb-2">
        <div className="text-2xl font-bold font-serif" style={{ color: 'var(--text-primary)' }}>
          {formatDate}
        </div>
      </div>

      <div>
        <div className="text-xs opacity-75">距离{label}纪念日</div>
        <div className="text-2xl font-bold font-serif" style={{ color: 'var(--text-primary)' }}>
          {daysUntilNext} 天
        </div>
      </div>
    </motion.div>
  );
}
