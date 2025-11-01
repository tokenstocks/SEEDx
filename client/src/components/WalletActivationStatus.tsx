import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface WalletActivationStatusProps {
  stellarPublicKey: string;
}

// Get Horizon URL from environment or default to testnet
const HORIZON_URL = import.meta.env.VITE_STELLAR_HORIZON_URL || "https://horizon-testnet.stellar.org";

export function WalletActivationStatus({ stellarPublicKey }: WalletActivationStatusProps) {
  const { data: accountExists, isLoading } = useQuery({
    queryKey: ["stellar-account", stellarPublicKey],
    queryFn: async () => {
      try {
        const response = await fetch(
          `${HORIZON_URL}/accounts/${stellarPublicKey}`
        );
        return response.ok;
      } catch {
        return false;
      }
    },
    enabled: !!stellarPublicKey,
    staleTime: 60000, // Cache for 1 minute
  });

  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="w-3 h-3 animate-spin" />
        Checking...
      </Badge>
    );
  }

  if (accountExists) {
    return (
      <Badge variant="default" className="gap-1" data-testid="badge-wallet-active">
        <CheckCircle className="w-3 h-3" />
        Activated
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1" data-testid="badge-wallet-pending">
      <AlertCircle className="w-3 h-3" />
      Pending Activation
    </Badge>
  );
}
