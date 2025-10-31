import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}

export default function MetricCard({ icon: Icon, label, value, change, changeType = 'neutral' }: MetricCardProps) {
  const changeColor = {
    positive: 'text-primary',
    negative: 'text-destructive',
    neutral: 'text-muted-foreground'
  }[changeType];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        {change && (
          <span className={`text-sm font-medium ${changeColor}`} data-testid={`text-change-${label}`}>
            {change}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground" data-testid={`text-label-${label}`}>{label}</p>
        <p className="text-2xl font-bold" data-testid={`text-value-${label}`}>{value}</p>
      </div>
    </Card>
  );
}
