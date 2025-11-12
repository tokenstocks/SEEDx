import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Eye, EyeOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Investor {
  userId: string;
  email: string;
  totalInvested: string;
  investmentCount: number;
  tokensReceived: string;
  currentTokenBalance: string;
  liquidTokens: string;
  lockedTokens: string;
  firstInvestment: Date;
  lastInvestment: Date;
}

interface InvestorLeaderboardProps {
  investors: Investor[];
  anonymized: boolean;
  onToggleAnonymize: () => void;
  loading?: boolean;
}

export default function InvestorLeaderboard({ 
  investors, 
  anonymized, 
  onToggleAnonymize,
  loading = false 
}: InvestorLeaderboardProps) {
  const formatNGN = (value: string) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(parseFloat(value));
  };

  const formatTokens = (value: string) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(parseFloat(value));
  };

  // Show top 10
  const topInvestors = investors.slice(0, 10);

  return (
    <Card className="bg-white/5 backdrop-blur-md border-white/10" data-testid="card-investor-leaderboard">
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="w-5 h-5 text-blue-400" />
              Top Investors
            </CardTitle>
            <CardDescription>
              Showing top 10 investors by total contribution
            </CardDescription>
          </div>
          <Button
            onClick={onToggleAnonymize}
            variant="outline"
            size="sm"
            className="gap-2"
            data-testid="button-toggle-anonymize"
          >
            {anonymized ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {anonymized ? "Show Emails" : "Anonymize"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : topInvestors.length > 0 ? (
          <div className="space-y-3">
            {topInvestors.map((investor, index) => (
              <div
                key={investor.userId}
                className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                data-testid={`row-investor-${index}`}
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                      <span className="text-white font-medium truncate" data-testid={`text-investor-email-${index}`}>
                        {investor.email}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-slate-400 text-xs mb-1">Total Invested</p>
                        <p className="text-emerald-400 font-semibold" data-testid={`text-total-invested-${index}`}>
                          {formatNGN(investor.totalInvested)}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-slate-400 text-xs mb-1">Current Holdings</p>
                        <p className="text-blue-400 font-semibold">
                          {formatTokens(investor.currentTokenBalance)}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-slate-400 text-xs mb-1">Investments</p>
                        <p className="text-white">
                          {investor.investmentCount}x
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-slate-400 text-xs mb-1">Last Investment</p>
                        <p className="text-slate-300 text-xs">
                          {formatDistanceToNow(new Date(investor.lastInvestment), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No investors yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
