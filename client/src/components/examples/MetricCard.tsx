import MetricCard from '../MetricCard';
import { DollarSign } from 'lucide-react';

export default function MetricCardExample() {
  return (
    <div className="max-w-xs">
      <MetricCard
        icon={DollarSign}
        label="Portfolio Value"
        value="$24,350"
        change="+12.5%"
        changeType="positive"
      />
    </div>
  );
}
