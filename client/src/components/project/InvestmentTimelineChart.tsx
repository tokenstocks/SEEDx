import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface TimelineDataPoint {
  period: string;
  investmentCount: number;
  totalAmount: string;
  uniqueInvestors: number;
}

interface InvestmentTimelineChartProps {
  data: TimelineDataPoint[];
  interval: 'daily' | 'weekly';
}

export default function InvestmentTimelineChart({ data, interval }: InvestmentTimelineChartProps) {
  // Format data for Recharts
  const chartData = data.map(d => ({
    date: new Date(d.period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    amount: parseFloat(d.totalAmount),
    count: d.investmentCount,
    investors: d.uniqueInvestors,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-white/20 rounded-lg p-3 shadow-xl">
          <p className="text-white font-semibold mb-2">{payload[0].payload.date}</p>
          <p className="text-emerald-400 text-sm">
            Amount: ₦{payload[0].value.toLocaleString()}
          </p>
          <p className="text-blue-400 text-sm">
            Investments: {payload[0].payload.count}
          </p>
          <p className="text-purple-400 text-sm">
            Investors: {payload[0].payload.investors}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-white/5 backdrop-blur-md border-white/10" data-testid="card-timeline-chart">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <TrendingUp className="w-5 h-5 text-emerald-400" />
          Investment Timeline
        </CardTitle>
        <CardDescription>
          {interval === 'daily' ? 'Daily' : 'Weekly'} investment volume over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="date" 
                stroke="rgba(255,255,255,0.5)"
                tick={{ fill: 'rgba(255,255,255,0.7)' }}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.5)"
                tick={{ fill: 'rgba(255,255,255,0.7)' }}
                tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="amount" 
                fill="rgba(16, 185, 129, 0.8)"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-slate-400">
            No investment data available for the selected period
          </div>
        )}
      </CardContent>
    </Card>
  );
}
