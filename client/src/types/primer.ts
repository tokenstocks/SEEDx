// Primer-specific type definitions for API responses

// RCX Model: Impact metrics for grant providers (not investment returns)
export interface PrimerStats {
  totalContributed: number;           // Total NGNTS contributed to LP Pool
  capitalDeployed: number;             // Capital allocated to active projects
  activeProjects: number;              // Number of projects funded
  regenerationMultiplier: string;      // LP regeneration rate (current LP / contribution)
  regeneratorsEnabled: number;         // Token traders enabled through capital deployment
}

// RCX Model: Primer contribution tracking (grant model, not investment)
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
  // Removed: lpPoolShareSnapshot (ownership concept - Primers are grant providers)
  createdAt: string;
  updatedAt: string;
}

// RCX Model: Capital deployment allocation (not ownership share)
export interface PrimerAllocation {
  id: string;
  projectId: string;
  projectName: string;
  allocationDate: string;
  totalAmount: string;
  yourShareAmount: string;
  // Removed: sharePercent (ownership concept - Primers are grant providers)
}

// RCX Model: Timeline events for grant contributions and capital deployment
export interface PrimerTimelineEvent {
  id: string;
  type: "contribution_submitted" | "contribution_approved" | "contribution_rejected" | "capital_allocated";
  timestamp: string;
  data: {
    amount?: string;
    txHash?: string;
    // Removed: lpPoolShare (ownership percentage - Primers are grant providers)
    reason?: string;
    projectName?: string;
    projectLocation?: string;
    shareAmount?: string;
    // Removed: sharePercent (ownership percentage - Primers are grant providers)
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
