// Primer-specific type definitions for API responses

export interface PrimerStats {
  totalContributed: number;
  activeProjects: number;
  poolSharePercent: number;
  regeneratorsEnabled: number;
}

export interface PrimerContribution {
  id: string;
  primerId: string;
  amountNgnts: string;
  status: "pending" | "approved" | "rejected";
  paymentProof: string | null;
  referenceCode: string | null;
  paymentMethod: string | null;
  platformFee: string | null;
  txHash: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  lpPoolShareSnapshot: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PrimerAllocation {
  id: string;
  projectId: string;
  projectName: string;
  allocationDate: string;
  totalAmount: string;
  yourShareAmount: string;
  sharePercent: string;
}

export interface PrimerTimelineEvent {
  id: string;
  type: "contribution_submitted" | "contribution_approved" | "contribution_rejected" | "capital_allocated";
  timestamp: string;
  data: {
    amount?: string;
    txHash?: string;
    lpPoolShare?: string;
    reason?: string;
    projectName?: string;
    projectLocation?: string;
    shareAmount?: string;
    sharePercent?: string;
  };
}

export interface PrimerWalletBalances {
  activated: boolean;
  activationStatus: string;
  publicKey: string;
  balances: {
    xlm: string;
    usdc: string;
    ngnts: string;
  };
}
