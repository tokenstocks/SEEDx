import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Package, Users, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface BlockchainActivity {
  id: string;
  type: "project_created" | "token_minted" | "account_created";
  projectName?: string;
  tokenSymbol?: string;
  userEmail?: string;
  transactionHash: string | null;
  timestamp: string;
}

interface BlockchainActivityFeedProps {
  limit?: number;
}

export function BlockchainActivityFeed({ limit = 10 }: BlockchainActivityFeedProps) {
  // Query for recent blockchain activities
  const { data: activities, isLoading } = useQuery<BlockchainActivity[]>({
    queryKey: ["/api/blockchain/activity", limit],
    queryFn: async () => {
      // This would need a backend endpoint to aggregate blockchain activities
      // For now, we'll use project token ledger as a proxy
      const response = await fetch(`/api/admin/blockchain/activity?limit=${limit}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (!response.ok) {
        // Fallback to empty array if endpoint doesn't exist yet
        return [];
      }
      
      const data = await response.json();
      return data.activities || [];
    },
    enabled: true,
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "project_created":
        return <Package className="w-4 h-4" />;
      case "token_minted":
        return <Send className="w-4 h-4" />;
      case "account_created":
        return <Users className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case "project_created":
        return "Project Created";
      case "token_minted":
        return "Tokens Minted";
      case "account_created":
        return "Account Activated";
      default:
        return "Activity";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Blockchain Activity</CardTitle>
        <CardDescription>Recent on-chain transactions</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : activities && activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-4 p-3 border rounded-lg"
                data-testid={`activity-${activity.id}`}
              >
                <div className="p-2 bg-primary/10 rounded-lg">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">
                        {getActivityLabel(activity.type)}
                      </p>
                      {activity.projectName && (
                        <p className="text-sm text-muted-foreground">
                          {activity.projectName}
                          {activity.tokenSymbol && ` (${activity.tokenSymbol})`}
                        </p>
                      )}
                      {activity.userEmail && (
                        <p className="text-xs text-muted-foreground">
                          {activity.userEmail}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </Badge>
                  </div>
                  {activity.transactionHash && (
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${activity.transactionHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                    >
                      <span className="font-mono">
                        {activity.transactionHash.substring(0, 16)}...
                      </span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No blockchain activity yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Activity will appear when projects are created or tokens are minted
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
