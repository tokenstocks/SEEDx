/**
 * Phase 4-C Frontend Type Definitions
 * Type-safe interfaces for regenerative capital system APIs
 */

// ============================================================================
// REDEMPTION TYPES
// ============================================================================

export interface RedemptionRequest {
  id: string;
  userId: string;
  projectId: string;
  tokensAmount: string;
  navSnapshot: string;
  navAtRequest: string | null;
  redemptionValueNgnts: string;
  fundingPlan: {
    projectCashflow?: string;
    treasuryPool?: string;
    liquidityPool?: string;
  };
  txHashes: string[];
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  adminNotes: string | null;
  processedBy: string | null;
  createdAt: string;
  processedAt: string | null;
  // Joined fields from API
  userEmail?: string;
  userFirstName?: string;
  userLastName?: string;
  projectName?: string;
  projectTokenSymbol?: string;
}

export interface CreateRedemptionRequest {
  projectId: string;
  tokensAmount: string;
}

export interface ProcessRedemptionRequest {
  action: 'approve' | 'reject';
  adminNotes?: string;
}

export interface RedemptionListResponse {
  redemptions: RedemptionRequest[];
}

export interface PendingRedemptionsResponse {
  pendingRedemptions: RedemptionRequest[];
}

// ============================================================================
// NAV (Net Asset Value) TYPES
// ============================================================================

export interface NavEntry {
  id: string;
  projectId: string;
  navPerToken: string;
  source: 'manual' | 'formula' | 'audited';
  effectiveAt: string;
  updatedBy: string | null;
  notes: string | null;
  isSuperseded: boolean;
  createdAt: string;
  // Joined fields
  updatedByEmail?: string;
  updatedByName?: string;
}

export interface CreateNavRequest {
  navPerToken: string;
  source: 'manual' | 'formula' | 'audited';
  effectiveAt?: string;
  notes?: string;
}

export interface NavHistoryResponse {
  current: NavEntry | null;
  history: NavEntry[];
}

// ============================================================================
// CASHFLOW TYPES
// ============================================================================

export interface ProjectCashflow {
  id: string;
  projectId: string;
  amountNgnts: string;
  source: string | null;
  sourceDocumentUrl: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  status: 'recorded' | 'verified' | 'tokenized';
  chainTxHash: string | null;
  createdAt: string;
  // Joined fields
  projectName?: string;
  verifiedByEmail?: string;
  verifiedByName?: string;
}

export interface CreateCashflowRequest {
  projectId: string;
  amountNgnts: string;
  source?: string;
  sourceDocumentUrl?: string;
}

export interface VerifyCashflowRequest {
  notes?: string;
}

export interface CashflowListResponse {
  cashflows: ProjectCashflow[];
}

// ============================================================================
// TREASURY TYPES
// ============================================================================

export interface TreasurySummary {
  virtualBalance: string;
  totalTransactions: number;
  transactionBreakdown: {
    inflow: number;
    allocation: number;
    buyback: number;
    replenish: number;
    fee: number;
  };
}

export interface TreasurySnapshot {
  id: string;
  balance: string;
  asOfDate: string;
  sourceHash: string | null;
  metadata: {
    transactionCount?: number;
    lastTxId?: string;
    [key: string]: any;
  };
  createdAt: string;
}

export interface TreasuryReconciliation {
  status: 'ok' | 'discrepancy';
  computedBalance: string;
  lastSnapshotBalance: string | null;
  lastSnapshotDate: string | null;
  discrepancy: string | null;
  recommendations: string[];
}

export interface TreasuryTransaction {
  id: string;
  type: 'inflow' | 'allocation' | 'buyback' | 'replenish' | 'fee';
  amountNgnts: string;
  sourceProjectId: string | null;
  destinationWallet: string | null;
  relatedTxHash: string | null;
  metadata: {
    fundingPlan?: any;
    notes?: string;
    [key: string]: any;
  };
  createdAt: string;
  // Joined fields
  sourceProjectName?: string;
}

export interface TreasurySnapshotsResponse {
  snapshots: TreasurySnapshot[];
}

// ============================================================================
// AUDIT LOG TYPES
// ============================================================================

export interface AuditAction {
  id: string;
  adminId: string;
  action: string;
  target: {
    type?: string;
    id?: string;
    [key: string]: any;
  } | null;
  details: {
    before?: any;
    after?: any;
    [key: string]: any;
  } | null;
  createdAt: string;
  // Joined fields
  adminEmail?: string;
  adminName?: string;
}

export interface AuditLogFilters {
  action?: string;
  adminId?: string;
  startDate?: string;
  endDate?: string;
}

export interface AuditLogResponse {
  actions: AuditAction[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// PLATFORM SETTINGS TYPES
// ============================================================================

export interface PlatformConfig {
  cashflowAllocation: {
    project: number;
    treasury: number;
    lp: number;
  };
  redemptionFundingPriority: ('project' | 'treasury' | 'liquidity_pool')[];
}

export interface UpdateCashflowAllocationRequest {
  project: number;
  treasury: number;
  lp: number;
}

export interface UpdateRedemptionPriorityRequest {
  priority: ('project' | 'treasury' | 'liquidity_pool')[];
}

// ============================================================================
// PORTFOLIO/INVESTMENT TYPES (Extended for Redemptions)
// ============================================================================

export interface ProjectHolding {
  projectId: string;
  projectName: string;
  tokenSymbol: string;
  tokensHeld: string;
  currentNav: string | null;
  currentValueNgnts: string;
  pricePerToken: string;
  totalInvested: string;
  returnPercentage: string;
}

export interface PortfolioSummary {
  holdings: ProjectHolding[];
  totalValueNgnts: string;
  totalInvestedNgnts: string;
  totalReturnsNgnts: string;
  overallReturnPercentage: string;
}
