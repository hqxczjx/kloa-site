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
        className="bottom-24 right-6 md:bottom-24 md:right-6 sm:bottom-5 sm:right-4 w-40 md:w-48"
      />
      <AnniversaryCard
        type="debut"
        date={new Date('2026-01-16')}
        label="出道日"
        icon={<Sparkles className="w-5 h-5 text-pink-500 dark:text-blue-500" />}
        className="bottom-56 right-6 md:bottom-56 md:right-6 sm:bottom-36 sm:right-4 w-40 md:w-48"
      />
    </>
  );
}
