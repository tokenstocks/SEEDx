import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MapPin, CheckCircle2 } from "lucide-react";

interface InvestmentCardProps {
  image: string;
  title: string;
  location: string;
  tokenSymbol: string;
  expectedAPY: number;
  investmentPeriod: string;
  minInvestment: number;
  fundingProgress: number;
  isFeatured?: boolean;
  isVerified?: boolean;
  onInvest?: () => void;
}

export default function InvestmentCard({
  image,
  title,
  location,
  tokenSymbol,
  expectedAPY,
  investmentPeriod,
  minInvestment,
  fundingProgress,
  isFeatured = false,
  isVerified = true,
  onInvest,
}: InvestmentCardProps) {
  return (
    <Card className="overflow-hidden rounded-2xl hover-elevate">
      <div className="relative aspect-video overflow-hidden">
        <img src={image} alt={title} className="w-full h-full object-cover" />
        <div className="absolute top-3 left-3 flex gap-2">
          {isFeatured && (
            <Badge className="bg-secondary/90 backdrop-blur-sm" data-testid={`badge-featured-${title}`}>
              Featured
            </Badge>
          )}
          {isVerified && (
            <Badge variant="outline" className="bg-background/90 backdrop-blur-sm" data-testid={`badge-verified-${title}`}>
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Verified
            </Badge>
          )}
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <h3 className="text-xl font-semibold mb-2" data-testid={`text-title-${title}`}>{title}</h3>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span data-testid={`text-location-${title}`}>{location}</span>
            </div>
            <Badge variant="outline" className="font-mono" data-testid={`badge-token-${title}`}>
              {tokenSymbol}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 py-4 border-t border-b">
          <div>
            <div className="text-2xl font-bold text-primary" data-testid={`text-apy-${title}`}>{expectedAPY}%</div>
            <div className="text-xs text-muted-foreground">Expected APY</div>
          </div>
          <div>
            <div className="text-sm font-semibold" data-testid={`text-period-${title}`}>{investmentPeriod}</div>
            <div className="text-xs text-muted-foreground">Period</div>
          </div>
          <div>
            <div className="text-sm font-semibold" data-testid={`text-min-${title}`}>${minInvestment.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Min. Investment</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Funding Progress</span>
            <span className="font-semibold" data-testid={`text-progress-${title}`}>{fundingProgress}%</span>
          </div>
          <Progress value={fundingProgress} className="h-2" data-testid={`progress-funding-${title}`} />
        </div>

        <Button 
          className="w-full" 
          onClick={onInvest}
          data-testid={`button-invest-${title}`}
        >
          Invest Now
        </Button>
      </div>
    </Card>
  );
}
