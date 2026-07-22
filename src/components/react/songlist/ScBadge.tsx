import { Gem } from 'lucide-react';

export interface ScBadgeProps {
  amount: string;
}

export default function ScBadge({ amount }: ScBadgeProps) {
  return (
    <span className="sc-badge" title={`礼物曲 ${amount}`}>
      <Gem className="sc-badge__gem" aria-hidden="true" />
      {amount}
    </span>
  );
}
