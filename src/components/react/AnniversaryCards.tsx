import { Cake, Sparkles } from 'lucide-react';
import AnniversaryCard from './AnniversaryCard';

export default function AnniversaryCards() {
  return (
    <>
      <AnniversaryCard
        type="birthday"
        date={new Date('2026-07-19')}
        label="生日"
        icon={<Cake className="w-5 h-5 text-pink-500 dark:text-blue-500" />}
        className="absolute bottom-36 right-4 md:fixed md:bottom-24 md:right-6 w-36 md:w-48 z-20"
      />
      <AnniversaryCard
        type="debut"
        date={new Date('2026-01-16')}
        label="出道日"
        icon={<Sparkles className="w-5 h-5 text-pink-500 dark:text-blue-500" />}
        className="absolute bottom-4 right-4 md:fixed md:bottom-64 md:right-6 w-36 md:w-48 z-20"
      />
    </>
  );
}
