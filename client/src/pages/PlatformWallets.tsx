import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PlatformWallet {
  id: string;
  walletType: "operations" | "treasury" | "distribution" | "liquidity_pool";
  publicKey: string;
  description: string;
  balanceXLM: string;
  balanceNGNTS: string;
  balanceUSDC: string;
  lastSyncedAt: string | null;
  createdAt: string;
}

export default function PlatformWallets() {
  const { toast } = useToast();

  const { data: walletsData, isLoading } = useQuery<{ wallets: PlatformWallet[] }>({
    queryKey: ["/api/admin/platform-wallets"],
  });

  const wallets = walletsData?.wallets || [];

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: `${label} copied successfully`,
    });
  };

  const getWalletTypeLabel = (type: string) => {
    const labels: Record<string, { title: string; color: string }> = {
      operations: { title: "Operations", color: "bg-blue-500" },
      treasury: { title: "Treasury", color: "bg-amber-500" },
      distribution: { title: "Distribution", color: "bg-green-500" },
      liquidity_pool: { title: "Liquidity Pool", color: "bg-purple-500" },
    };
    return labels[type] || { title: type, color: "bg-gray-500" };
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">Platform Wallets</h1>
        <p className="text-muted-foreground mt-2">
          Manage the 4 core platform wallets for TokenStocks operations
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {wallets.map((wallet) => {
          const typeInfo = getWalletTypeLabel(wallet.walletType);
          const stellarExplorerUrl = `https://stellar.expert/explorer/testnet/account/${wallet.publicKey}`;

          return (
            <Card key={wallet.id} className="relative overflow-hidden" data-testid={`card-wallet-${wallet.walletType}`}>
              <div className={`absolute top-0 left-0 right-0 h-1 ${typeInfo.color}`} />
              
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    <CardTitle className="text-xl">{typeInfo.title}</CardTitle>
                  </div>
                  <Badge variant="outline" data-testid={`badge-wallet-type-${wallet.walletType}`}>
                    {wallet.walletType}
                  </Badge>
                </div>
                <CardDescription>{wallet.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Public Key */}
                <div className="space-y-1">
                  <label className="text-sm font-medium text-muted-foreground">Public Key</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-muted p-2 rounded font-mono" data-testid={`text-public-key-${wallet.walletType}`}>
                      {wallet.publicKey}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => copyToClipboard(wallet.publicKey, "Public key")}
                      data-testid={`button-copy-key-${wallet.walletType}`}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      data-testid={`button-explorer-${wallet.walletType}`}
                    >
                      <a href={stellarExplorerUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Balances */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">XLM</label>
                    <p className="text-sm font-semibold" data-testid={`text-xlm-balance-${wallet.walletType}`}>
                      {parseFloat(wallet.balanceXLM).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 7,
                      })}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">NGNTS</label>
                    <p className="text-sm font-semibold" data-testid={`text-ngnts-balance-${wallet.walletType}`}>
                      {parseFloat(wallet.balanceNGNTS).toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">USDC</label>
                    <p className="text-sm font-semibold" data-testid={`text-usdc-balance-${wallet.walletType}`}>
                      {parseFloat(wallet.balanceUSDC).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Last Synced */}
                {wallet.lastSyncedAt && (
                  <div className="text-xs text-muted-foreground">
                    Last synced: {new Date(wallet.lastSyncedAt).toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {wallets.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No Platform Wallets Found</p>
            <p className="text-muted-foreground">
              Initialize platform wallets using POST /api/admin/platform-wallets/initialize
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
