import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, pgEnum, json, jsonb, uuid, boolean, unique, index, integer, check } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum("user_role", ["investor", "admin"]);
export const kycStatusEnum = pgEnum("kyc_status", ["pending", "submitted", "approved", "rejected"]);
export const bankDetailsStatusEnum = pgEnum("bank_details_status", ["not_submitted", "pending", "approved", "rejected"]);
export const currencyEnum = pgEnum("currency", ["NGN", "NGNTS", "USDC", "XLM"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["deposit", "withdrawal", "investment", "return", "fee"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "processing", "completed", "failed", "cancelled"]);
export const paymentMethodEnum = pgEnum("payment_method", ["bank_transfer", "card", "stellar", "wallet"]);
export const depositStatusEnum = pgEnum("deposit_status", ["pending", "approved", "rejected"]);
export const withdrawalStatusEnum = pgEnum("withdrawal_status", ["pending", "approved", "rejected", "completed"]);
export const destinationTypeEnum = pgEnum("destination_type", ["bank_account", "crypto_wallet"]);
export const projectStatusEnum = pgEnum("project_status", ["draft", "active", "funded", "completed", "cancelled"]);
export const tokenLedgerActionEnum = pgEnum("token_ledger_action", ["create", "mint", "transfer", "burn", "redemption"]);
export const platformWalletTypeEnum = pgEnum("platform_wallet_type", ["operations", "treasury", "distribution", "liquidity_pool", "treasury_pool"]);
export const secondaryMarketStatusEnum = pgEnum("secondary_market_status", ["pending", "countered", "accepted", "rejected", "completed", "cancelled"]);
export const navSourceEnum = pgEnum("nav_source", ["manual", "formula", "audited"]);
export const cashflowStatusEnum = pgEnum("cashflow_status", ["recorded", "verified", "tokenized"]);
export const treasuryTxTypeEnum = pgEnum("treasury_tx_type", ["inflow", "allocation", "buyback", "replenish", "fee"]);
export const lpPoolTxTypeEnum = pgEnum("lp_pool_tx_type", ["inflow", "outflow", "adjustment"]);
export const redemptionStatusEnum = pgEnum("redemption_status", ["pending", "processing", "completed", "rejected"]);
export const tokenLockTypeEnum = pgEnum("token_lock_type", ["none", "grant", "permanent", "time_locked"]);
export const orderTypeEnum = pgEnum("order_type", ["buy", "sell"]);
export const orderStatusEnum = pgEnum("order_status", ["open", "filled", "cancelled"]);
export const primerContributionStatusEnum = pgEnum("primer_contribution_status", ["pending", "approved", "rejected", "completed"]);
export const walletActivationStatusEnum = pgEnum("wallet_activation_status", ["created", "pending", "activating", "active", "failed"]);
export const walletFundingRequestStatusEnum = pgEnum("wallet_funding_request_status", ["pending", "approved", "rejected", "funded"]);
export const bankDepositStatusEnum = pgEnum("bank_deposit_status", ["pending", "approved", "rejected", "completed"]);
export const depositPaymentMethodEnum = pgEnum("deposit_payment_method", ["bank_transfer", "usdc"]);
export const milestoneStatusEnum = pgEnum("milestone_status", ["draft", "submitted", "approved", "disbursed", "rejected"]);
export const distributionEventStatusEnum = pgEnum("distribution_event_status", ["draft", "pending_approval", "calculated", "active", "completed", "cancelled"]);
export const distributionAllocationStatusEnum = pgEnum("distribution_allocation_status", ["allocated", "partially_withdrawn", "fully_withdrawn", "cancelled"]);
export const distributionWithdrawalStatusEnum = pgEnum("distribution_withdrawal_status", ["pending", "approved", "rejected", "processing", "paid", "cancelled"]);
export const distributionActivityTypeEnum = pgEnum("distribution_activity_type", [
  "event_created",
  "allocations_calculated",
  "withdrawal_requested",
  "withdrawal_approved",
  "withdrawal_rejected",
  "payment_recorded",
  "event_completed",
  "event_cancelled"
]);

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: userRoleEnum("role").notNull().default("investor"),
  kycStatus: kycStatusEnum("kyc_status").notNull().default("pending"),
  kycDocuments: json("kyc_documents").$type<{
    idCard?: string;
    selfie?: string;
    addressProof?: string;
  }>(),
  kycProcessedAt: timestamp("kyc_processed_at"),
  kycProcessedBy: uuid("kyc_processed_by").references(() => users.id, { onDelete: "set null" }),
  kycAdminNotes: text("kyc_admin_notes"),
  bankDetails: json("bank_details").$type<{
    accountName?: string;
    accountNumberEncrypted?: string;
    bankName?: string;
    bankCode?: string;
    verificationDocument?: string;
  }>(),
  bankDetailsStatus: bankDetailsStatusEnum("bank_details_status").notNull().default("not_submitted"),
  bankDetailsSubmittedAt: timestamp("bank_details_submitted_at"),
  bankDetailsApprovedAt: timestamp("bank_details_approved_at"),
  bankDetailsApprovedBy: uuid("bank_details_approved_by").references(() => users.id),
  totalInvestedNGN: decimal("total_invested_ngn", { precision: 18, scale: 2 }).notNull().default("0.00"),
  isSuspended: boolean("is_suspended").notNull().default(false),
  isPrimer: boolean("is_primer").notNull().default(false),
  isLpInvestor: boolean("is_lp_investor").notNull().default(false),
  stellarPublicKey: text("stellar_public_key"),
  stellarSecretKeyEncrypted: text("stellar_secret_key_encrypted"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// KYC Decisions Audit Log - Immutable history of all KYC status changes
// Note: Uses 'no action' on delete to preserve regulatory compliance audit trail
export const kycDecisions = pgTable("kyc_decisions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "no action" }),
  previousStatus: kycStatusEnum("previous_status").notNull(),
  newStatus: kycStatusEnum("new_status").notNull(),
  processedBy: uuid("processed_by").references(() => users.id, { onDelete: "set null" }),
  adminNotes: text("admin_notes"),
  metadata: jsonb("metadata").$type<{
    ipAddress?: string;
    userAgent?: string;
    [key: string]: any;
  }>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  // Index for efficient history queries per user
  userIdCreatedAtIdx: index("kyc_decisions_user_id_created_at_idx").on(table.userId, table.createdAt.desc()),
}));

// Wallets table - Hybrid model (one wallet per user)
export const wallets = pgTable("wallets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  // Fiat balance (NGN) - database-only tracking
  fiatBalance: decimal("fiat_balance", { precision: 18, scale: 2 }).notNull().default("0.00"),
  // Crypto balances - tracked on Stellar blockchain
  cryptoBalances: jsonb("crypto_balances").$type<{
    USDC?: string;
    XLM?: string;
    [tokenSymbol: string]: string | undefined; // Project tokens dynamically
  }>().default(sql`'{}'::jsonb`),
  // Stellar wallet for all crypto assets
  cryptoWalletPublicKey: text("crypto_wallet_public_key"),
  cryptoWalletSecretEncrypted: text("crypto_wallet_secret_encrypted"),
  // Wallet activation tracking
  activationStatus: walletActivationStatusEnum("activation_status").notNull().default("created"),
  activationRequestedAt: timestamp("activation_requested_at"),
  activationApprovedAt: timestamp("activation_approved_at"),
  activatedAt: timestamp("activated_at"),
  activationTxHash: text("activation_tx_hash"),
  activationNotes: text("activation_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Transactions table
export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: transactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  currency: currencyEnum("currency").notNull(),
  status: transactionStatusEnum("status").notNull().default("pending"),
  paymentMethod: paymentMethodEnum("payment_method"),
  reference: text("reference").unique(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Deposit requests table
export const depositRequests = pgTable("deposit_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionId: uuid("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  currency: currencyEnum("currency").notNull(),
  paymentProof: text("payment_proof"),
  status: depositStatusEnum("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  processedBy: uuid("processed_by").references(() => users.id),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Withdrawal requests table
export const withdrawalRequests = pgTable("withdrawal_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  transactionId: uuid("transaction_id").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  currency: currencyEnum("currency").notNull(),
  destinationType: destinationTypeEnum("destination_type").notNull(),
  bankDetails: json("bank_details").$type<{
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
  }>(),
  cryptoAddress: text("crypto_address"),
  status: withdrawalStatusEnum("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  processedBy: uuid("processed_by").references(() => users.id),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  currency: currencyEnum("currency").notNull().default("NGN"),
  targetAmount: decimal("target_amount", { precision: 18, scale: 2 }).notNull(),
  raisedAmount: decimal("raised_amount", { precision: 18, scale: 2 }).notNull().default("0.00"),
  tokenSymbol: text("token_symbol").notNull().unique(),
  tokensIssued: decimal("tokens_issued", { precision: 18, scale: 2 }).notNull(),
  tokensSold: decimal("tokens_sold", { precision: 18, scale: 2 }).notNull().default("0.00"),
  pricePerToken: decimal("price_per_token", { precision: 18, scale: 2 }).notNull(),
  stellarAssetCode: text("stellar_asset_code"),
  stellarIssuerPublicKey: text("stellar_issuer_public_key"),
  stellarIssuerSecretKeyEncrypted: text("stellar_issuer_secret_key_encrypted"),
  stellarDistributionPublicKey: text("stellar_distribution_public_key"),
  stellarDistributionSecretKeyEncrypted: text("stellar_distribution_secret_key_encrypted"),
  stellarIssuerTx: text("stellar_issuer_tx"), // TX hash for issuer account creation
  stellarDistributionTx: text("stellar_distribution_tx"), // TX hash for distribution account creation  
  stellarMintTx: text("stellar_mint_tx"), // TX hash for token minting
  stellarTrustlineTx: text("stellar_trustline_tx"), // TX hash for trustline establishment
  onChainSynced: boolean("on_chain_synced").notNull().default(false), // Whether on-chain ops completed
  status: projectStatusEnum("status").notNull().default("draft"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  images: text("images").array(),
  documents: text("documents").array(),
  // Phase 2: Project operational wallet (holds LP allocations)
  stellarProjectWalletPublicKey: text("stellar_project_wallet_public_key"),
  stellarProjectWalletSecretEncrypted: text("stellar_project_wallet_secret_encrypted"),
  projectWalletCreatedAt: timestamp("project_wallet_created_at"),
  projectWalletFundedAt: timestamp("project_wallet_funded_at"),
  // Phase 2: Capital tracking
  lpCapitalAllocated: decimal("lp_capital_allocated", { precision: 20, scale: 7 }).default("0").notNull(),
  lpCapitalDeployed: decimal("lp_capital_deployed", { precision: 20, scale: 7 }).default("0").notNull(),
  // Phase 3: NAV and LP token pricing
  nav: decimal("nav", { precision: 20, scale: 7 }).default("0").notNull(),
  lpTokensOutstanding: decimal("lp_tokens_outstanding", { precision: 20, scale: 7 }).default("0").notNull(),
  lpTokenPrice: decimal("lp_token_price", { precision: 20, scale: 7 }).default("1").notNull(),
  // Phase 3: Milestone tracking
  totalMilestones: integer("total_milestones").default(0).notNull(),
  completedMilestones: integer("completed_milestones").default(0).notNull(),
  lastMilestoneDate: timestamp("last_milestone_date"),
  // Phase 4.1: RCX Model - Configurable profit distribution (nullable during migration)
  lpReplenishmentPercent: decimal("lp_replenishment_percent", { precision: 5, scale: 2 }),
  regeneratorDistributionPercent: decimal("regenerator_distribution_percent", { precision: 5, scale: 2 }),
  treasuryPercent: decimal("treasury_percent", { precision: 5, scale: 2 }),
  projectRetainedPercent: decimal("project_retained_percent", { precision: 5, scale: 2 }),
  // Phase 4.1: RCX Model - Dual wallet architecture
  operationsWalletPublicKey: text("operations_wallet_public_key"), // Receives LP disbursements
  operationsWalletSecretEncrypted: text("operations_wallet_secret_encrypted"),
  revenueWalletPublicKey: text("revenue_wallet_public_key"), // Receives minted NGNTS from bank deposits
  revenueWalletSecretEncrypted: text("revenue_wallet_secret_encrypted"),
  revenueWalletCreatedAt: timestamp("revenue_wallet_created_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // RCX Model: Profit splits must sum to 100% when all fields are populated
  checkProfitSplitSum: check(
    "projects_profit_split_sum_100",
    sql`(
      lp_replenishment_percent IS NULL OR
      regenerator_distribution_percent IS NULL OR
      treasury_percent IS NULL OR
      project_retained_percent IS NULL
    ) OR (
      lp_replenishment_percent + regenerator_distribution_percent + treasury_percent + project_retained_percent = 100.00
    )`
  ),
}));

// Project Revenue table - Phase 4.1: RCX Model - Track bank deposits and NGNTS minting
export const projectRevenue = pgTable("project_revenue", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  bankDepositAmount: decimal("bank_deposit_amount", { precision: 20, scale: 2 }).notNull(),
  receiptUrl: text("receipt_url"),
  mintedNgnts: decimal("minted_ngnts", { precision: 20, scale: 7 }).notNull(),
  stellarMintTxHash: text("stellar_mint_tx_hash"),
  revenueWalletPublicKey: text("revenue_wallet_public_key"),
  recordedBy: uuid("recorded_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
  distributedAt: timestamp("distributed_at"),
  distributionEventId: uuid("distribution_event_id").references(() => distributionEvents.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Prevent double-recording of same Stellar mint transaction
  uniqueMintTx: unique("project_revenue_project_id_mint_tx_hash_unique").on(table.projectId, table.stellarMintTxHash),
  // Index for efficient project revenue queries
  projectIdIdx: index("project_revenue_project_id_idx").on(table.projectId),
  // Index for distribution event tracking
  distributionEventIdIdx: index("project_revenue_distribution_event_id_idx").on(table.distributionEventId),
  // Data integrity constraints
  checkPositiveBankDeposit: check("project_revenue_bank_deposit_positive", sql`bank_deposit_amount > 0`),
  checkPositiveMintedNgnts: check("project_revenue_minted_ngnts_positive", sql`minted_ngnts > 0`),
}));

// Investments table
export const investments = pgTable("investments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 18, scale: 2 }).notNull(),
  tokensReceived: decimal("tokens_received", { precision: 18, scale: 2 }).notNull(),
  currency: currencyEnum("currency").notNull(),
  transactionId: uuid("transaction_id").references(() => transactions.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Project updates table
export const projectUpdates = pgTable("project_updates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  postedBy: uuid("posted_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Project milestones table - Phase 3: milestone-based disbursement system
export const projectMilestones = pgTable("project_milestones", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  milestoneNumber: integer("milestone_number").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  // Fiat amounts (NGN disbursement)
  targetAmount: decimal("target_amount", { precision: 20, scale: 2 }).notNull(),
  bankTransferAmount: decimal("bank_transfer_amount", { precision: 20, scale: 2 }),
  // Token amount (NGNTS burned)
  ngntsBurned: decimal("ngnts_burned", { precision: 20, scale: 7 }),
  stellarBurnTxHash: varchar("stellar_burn_tx_hash", { length: 64 }),
  // Status and workflow
  status: milestoneStatusEnum("status").notNull().default("draft"),
  // Audit trail
  submittedAt: timestamp("submitted_at"),
  submittedBy: uuid("submitted_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  approvedBy: uuid("approved_by").references(() => users.id, { onDelete: "set null" }),
  disbursedAt: timestamp("disbursed_at"),
  disbursedBy: uuid("disbursed_by").references(() => users.id, { onDelete: "set null" }),
  rejectedAt: timestamp("rejected_at"),
  rejectedBy: uuid("rejected_by").references(() => users.id, { onDelete: "set null" }),
  rejectionReason: text("rejection_reason"),
  // Bank transfer details
  bankTransferReference: varchar("bank_transfer_reference", { length: 255 }),
  bankTransferDate: timestamp("bank_transfer_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Unique constraint on (projectId, milestoneNumber)
  uniqueProjectMilestone: unique().on(table.projectId, table.milestoneNumber),
  // Index on (projectId, status) for filtering
  projectStatusIdx: index("idx_milestones_project_status").on(table.projectId, table.status),
  // CHECK constraint: milestone_number > 0
  milestoneNumberCheck: check("milestone_number_check", sql`${table.milestoneNumber} > 0`),
}));

// Milestone Activity Log table - comprehensive audit trail for milestone operations
export const milestoneActivityLog = pgTable("milestone_activity_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  milestoneId: uuid("milestone_id").notNull().references(() => projectMilestones.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  activityType: varchar("activity_type", { length: 50 }).notNull(),
  performedBy: uuid("performed_by").notNull().references(() => users.id),
  previousStatus: varchar("previous_status", { length: 50 }),
  newStatus: varchar("new_status", { length: 50 }),
  changesSummary: jsonb("changes_summary"),
  metadata: jsonb("metadata"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  milestoneIdx: index("milestone_activity_milestone_idx").on(table.milestoneId),
  projectIdx: index("milestone_activity_project_idx").on(table.projectId),
  activityTypeIdx: index("milestone_activity_type_idx").on(table.activityType),
  performedByIdx: index("milestone_activity_performed_by_idx").on(table.performedBy),
  createdAtIdx: index("milestone_activity_created_at_idx").on(table.createdAt),
}));

// Distribution Events table - Revenue/exit events that trigger LP token holder distributions
export const distributionEvents = pgTable('distribution_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'restrict' }),
  eventType: varchar('event_type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  totalAmount: decimal('total_amount', { precision: 20, scale: 2 }).notNull(),
  distributionDate: timestamp('distribution_date').notNull(),
  status: distributionEventStatusEnum('status').notNull().default('draft'),
  
  snapshotDate: timestamp('snapshot_date'),
  snapshotTotalLpTokens: decimal('snapshot_total_lp_tokens', { precision: 20, scale: 7 }),
  snapshotNav: decimal('snapshot_nav', { precision: 20, scale: 2 }),
  snapshotMetadata: jsonb('snapshot_metadata').$type<{
    sourceTable?: string;
    roundingPolicy?: string;
    navReference?: string;
    [key: string]: any;
  }>().default(sql`'{}'::jsonb`),
  
  totalAllocated: decimal('total_allocated', { precision: 20, scale: 2 }).notNull().default('0'),
  totalWithdrawn: decimal('total_withdrawn', { precision: 20, scale: 2 }).notNull().default('0'),
  totalPending: decimal('total_pending', { precision: 20, scale: 2 }).notNull().default('0'),
  
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'restrict' }),
  approvedAt: timestamp('approved_at'),
  completedAt: timestamp('completed_at'),
  cancelledBy: uuid('cancelled_by').references(() => users.id, { onDelete: 'restrict' }),
  cancelledAt: timestamp('cancelled_at'),
  cancellationReason: text('cancellation_reason'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  projectIdx: index('distribution_events_project_idx').on(table.projectId),
  statusIdx: index('distribution_events_status_idx').on(table.status),
  distributionDateIdx: index('distribution_events_date_idx').on(table.distributionDate),
}));

// Distribution Allocations table - Pro-rata allocations for each LP token holder
export const distributionAllocations = pgTable('distribution_allocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  distributionEventId: uuid('distribution_event_id').notNull().references(() => distributionEvents.id, { onDelete: 'restrict' }),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'restrict' }),
  lpTokenHolderId: uuid('lp_token_holder_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  
  lpTokensHeld: decimal('lp_tokens_held', { precision: 20, scale: 7 }).notNull(),
  ownershipPercentage: decimal('ownership_percentage', { precision: 10, scale: 7 }).notNull(),
  allocatedAmount: decimal('allocated_amount', { precision: 20, scale: 2 }).notNull(),
  
  withdrawnAmount: decimal('withdrawn_amount', { precision: 20, scale: 2 }).notNull().default('0'),
  pendingAmount: decimal('pending_amount', { precision: 20, scale: 2 }).notNull().default('0'),
  availableAmount: decimal('available_amount', { precision: 20, scale: 2 }).notNull(),
  
  status: distributionAllocationStatusEnum('status').notNull().default('allocated'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  distributionEventIdx: index('distribution_allocations_event_idx').on(table.distributionEventId),
  lpHolderIdx: index('distribution_allocations_holder_idx').on(table.lpTokenHolderId),
  projectIdx: index('distribution_allocations_project_idx').on(table.projectId),
  statusIdx: index('distribution_allocations_status_idx').on(table.status),
  activeAllocationsIdx: index('distribution_allocations_active_idx').on(table.status, table.lpTokenHolderId).where(sql`${table.status} != 'fully_withdrawn' AND ${table.status} != 'cancelled'`),
  uniqueAllocation: unique('unique_distribution_allocation').on(table.distributionEventId, table.lpTokenHolderId),
  checkWithdrawnPending: check('check_withdrawn_pending_lte_allocated', sql`${table.withdrawnAmount} + ${table.pendingAmount} <= ${table.allocatedAmount}`),
}));

// Distribution Withdrawals table - LP withdrawal requests for their allocations
export const distributionWithdrawals = pgTable('distribution_withdrawals', {
  id: uuid('id').primaryKey().defaultRandom(),
  distributionAllocationId: uuid('distribution_allocation_id').notNull().references(() => distributionAllocations.id, { onDelete: 'restrict' }),
  distributionEventId: uuid('distribution_event_id').notNull().references(() => distributionEvents.id, { onDelete: 'restrict' }),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'restrict' }),
  lpTokenHolderId: uuid('lp_token_holder_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  
  requestedAmount: decimal('requested_amount', { precision: 20, scale: 2 }).notNull(),
  status: distributionWithdrawalStatusEnum('status').notNull().default('pending'),
  
  bankName: varchar('bank_name', { length: 255 }),
  accountNumber: varchar('account_number', { length: 50 }),
  accountName: varchar('account_name', { length: 255 }),
  
  reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'restrict' }),
  reviewedAt: timestamp('reviewed_at'),
  approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'restrict' }),
  approvedAt: timestamp('approved_at'),
  rejectedBy: uuid('rejected_by').references(() => users.id, { onDelete: 'restrict' }),
  rejectedAt: timestamp('rejected_at'),
  rejectionReason: text('rejection_reason'),
  
  paymentChannel: varchar('payment_channel', { length: 50 }),
  paymentReference: varchar('payment_reference', { length: 255 }),
  paymentDate: timestamp('payment_date'),
  paymentAmount: decimal('payment_amount', { precision: 20, scale: 2 }),
  paidBy: uuid('paid_by').references(() => users.id, { onDelete: 'restrict' }),
  paidAt: timestamp('paid_at'),
  paymentNotes: text('payment_notes'),
  
  requestNotes: text('request_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  allocationIdx: index('distribution_withdrawals_allocation_idx').on(table.distributionAllocationId),
  lpHolderIdx: index('distribution_withdrawals_holder_idx').on(table.lpTokenHolderId),
  statusIdx: index('distribution_withdrawals_status_idx').on(table.status),
  createdAtIdx: index('distribution_withdrawals_created_at_idx').on(table.createdAt),
}));

// Distribution Activity Log table - Audit trail for all distribution operations
export const distributionActivityLog = pgTable('distribution_activity_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  distributionEventId: uuid('distribution_event_id').references(() => distributionEvents.id, { onDelete: 'cascade' }),
  distributionWithdrawalId: uuid('distribution_withdrawal_id').references(() => distributionWithdrawals.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  
  activityType: distributionActivityTypeEnum('activity_type').notNull(),
  
  performedBy: uuid('performed_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  performedByName: varchar('performed_by_name', { length: 255 }),
  previousStatus: varchar('previous_status', { length: 50 }),
  newStatus: varchar('new_status', { length: 50 }),
  changesSummary: jsonb('changes_summary'),
  metadata: jsonb('metadata'),
  auditMetadata: jsonb('audit_metadata').$type<{
    ipAddress?: string;
    userAgent?: string;
    [key: string]: any;
  }>().default(sql`'{}'::jsonb`),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  distributionEventIdx: index('distribution_activity_event_idx').on(table.distributionEventId),
  distributionWithdrawalIdx: index('distribution_activity_withdrawal_idx').on(table.distributionWithdrawalId),
  projectIdx: index('distribution_activity_project_idx').on(table.projectId),
  activityTypeIdx: index('distribution_activity_type_idx').on(table.activityType),
  performedByIdx: index('distribution_activity_performed_by_idx').on(table.performedBy),
  createdAtIdx: index('distribution_activity_created_at_idx').on(table.createdAt),
}));

// Project token balances table - tracks user holdings of project-specific tokens
// INVARIANT: tokenAmount = liquidTokens + lockedTokens at all times
// - tokenAmount: Total tokens held (source of truth)
// - liquidTokens: Tokens available for redemption
// - lockedTokens: Tokens locked due to grants, vesting, or time-locks (not redeemable)
export const projectTokenBalances = pgTable("project_token_balances", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  tokenAmount: decimal("token_amount", { precision: 18, scale: 2 }).notNull().default("0.00"),
  // LP token lock-up fields
  liquidTokens: decimal("liquid_tokens", { precision: 18, scale: 2 }).notNull().default("0.00"),
  lockedTokens: decimal("locked_tokens", { precision: 18, scale: 2 }).notNull().default("0.00"),
  lockType: tokenLockTypeEnum("lock_type").notNull().default("none"),
  lockReason: text("lock_reason"),
  unlockDate: timestamp("unlock_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Project token ledger table - audit trail for all token movements
export const projectTokenLedger = pgTable("project_token_ledger", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  action: tokenLedgerActionEnum("action").notNull(),
  tokenAmount: decimal("token_amount", { precision: 18, scale: 2 }).notNull(),
  stellarTransactionHash: text("stellar_transaction_hash"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Trustlines table - tracks Stellar trustlines for project tokens
export const trustlines = pgTable("trustlines", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  assetCode: text("asset_code").notNull(),
  issuerPublicKey: text("issuer_public_key").notNull(),
  status: text("status").notNull().default("pending"), // pending, active, failed
  txHash: text("tx_hash"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  // Unique constraint: one trustline per user per project
  userProjectUnique: unique().on(table.userId, table.projectId),
}));

// Platform wallets table - 5 wallets for platform operations (including treasury_pool)
export const platformWallets = pgTable("platform_wallets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  walletType: platformWalletTypeEnum("wallet_type").notNull().unique(),
  publicKey: text("public_key").notNull().unique(),
  encryptedSecretKey: text("encrypted_secret_key").notNull(),
  description: text("description"),
  balanceXLM: decimal("balance_xlm", { precision: 18, scale: 7 }).notNull().default("0.0000000"),
  balanceNGNTS: decimal("balance_ngnts", { precision: 18, scale: 2 }).notNull().default("0.00"),
  balanceUSDC: decimal("balance_usdc", { precision: 18, scale: 2 }).notNull().default("0.00"),
  lastSyncedAt: timestamp("last_synced_at"),
  // Phase 4: Regenerative Capital Architecture
  walletRole: varchar("wallet_role", { length: 32 }),
  minReserveThreshold: decimal("min_reserve_threshold", { precision: 30, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Exchange rates table - XLM/NGN conversion rates
export const exchangeRates = pgTable("exchange_rates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  xlmUsd: decimal("xlm_usd", { precision: 18, scale: 8 }).notNull(),
  usdNgn: decimal("usd_ngn", { precision: 18, scale: 2 }).notNull(),
  xlmNgn: decimal("xlm_ngn", { precision: 18, scale: 2 }).notNull(), // Calculated: xlmUsd * usdNgn
  isStale: boolean("is_stale").notNull().default(false),
  manualOverrideEnabled: boolean("manual_override_enabled").notNull().default(false),
  manualXlmNgn: decimal("manual_xlm_ngn", { precision: 18, scale: 2 }),
  lastFetchedAt: timestamp("last_fetched_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Platform settings table - Fee configuration
export const platformSettings = pgTable("platform_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  settingKey: text("setting_key").notNull().unique(),
  settingValue: text("setting_value").notNull(),
  description: text("description"),
  updatedBy: uuid("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Platform bank accounts table - Nigerian bank accounts for deposits
export const platformBankAccounts = pgTable("platform_bank_accounts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(), // e.g., "Bank 1", "Bank 2"
  bankName: text("bank_name").notNull(), // e.g., "First Bank of Nigeria"
  accountNumber: text("account_number").notNull(),
  accountName: text("account_name").notNull(), // Account holder name
  routingCode: text("routing_code"), // Bank routing/sort code (optional)
  isActive: boolean("is_active").notNull().default(false), // Only one can be active at a time
  createdBy: uuid("created_by").references(() => users.id),
  updatedBy: uuid("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Secondary market orders table - Liquidity pool token buyback
export const secondaryMarketOrders = pgTable("secondary_market_orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  tokenSymbol: text("token_symbol").notNull(),
  tokensAmount: decimal("tokens_amount", { precision: 18, scale: 2 }).notNull(),
  askingPriceNGNTS: decimal("asking_price_ngnts", { precision: 18, scale: 2 }).notNull(),
  adminCounterOffer: decimal("admin_counter_offer", { precision: 18, scale: 2 }),
  status: secondaryMarketStatusEnum("status").notNull().default("pending"),
  reason: text("reason"),
  adminNotes: text("admin_notes"),
  lpTransactionHash: text("lp_transaction_hash"),
  processedBy: uuid("processed_by").references(() => users.id),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Phase 4: Regenerative Capital Architecture Tables

// Project NAV history table - Track token appreciation over time
export const projectNavHistory = pgTable("project_nav_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  navPerToken: decimal("nav_per_token", { precision: 30, scale: 8 }).notNull(),
  source: navSourceEnum("source").notNull(),
  effectiveAt: timestamp("effective_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id),
  notes: text("notes"),
  isSuperseded: boolean("is_superseded").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Project cashflows table - Record real-world project revenue
export const projectCashflows = pgTable("project_cashflows", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  amountNgnts: decimal("amount_ngnts", { precision: 30, scale: 2 }).notNull(),
  source: varchar("source", { length: 128 }),
  sourceDocumentUrl: text("source_document_url"),
  verifiedBy: uuid("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  status: cashflowStatusEnum("status").notNull().default("recorded"),
  processed: boolean("processed").notNull().default(false),
  chainTxHash: text("chain_tx_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Treasury pool transactions table - Audit trail for regenerative capital flows
export const treasuryPoolTransactions = pgTable("treasury_pool_transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  type: treasuryTxTypeEnum("type").notNull(),
  amountNgnts: decimal("amount_ngnts", { precision: 30, scale: 2 }).notNull(),
  sourceProjectId: uuid("source_project_id").references(() => projects.id),
  sourceCashflowId: uuid("source_cashflow_id").references(() => projectCashflows.id),
  destinationWallet: varchar("destination_wallet", { length: 64 }),
  relatedTxHash: text("related_tx_hash"),
  metadata: jsonb("metadata").$type<{
    fundingPlan?: any;
    notes?: string;
    [key: string]: any;
  }>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Treasury pool snapshots table - Periodic balance tracking for time-series charts
export const treasuryPoolSnapshots = pgTable("treasury_pool_snapshots", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  balance: decimal("balance", { precision: 30, scale: 2 }).notNull(),
  asOfDate: timestamp("as_of_date", { withTimezone: true }).notNull().defaultNow(),
  sourceHash: text("source_hash"),
  metadata: jsonb("metadata").$type<{
    transactionCount?: number;
    lastTxId?: string;
    [key: string]: any;
  }>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Redemption requests table - Token buyback with hybrid funding logic
export const redemptionRequests = pgTable("redemption_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  tokensAmount: decimal("tokens_amount", { precision: 30, scale: 8 }).notNull(),
  navSnapshot: decimal("nav_snapshot", { precision: 30, scale: 8 }).notNull(),
  navAtRequest: decimal("nav_at_request", { precision: 30, scale: 8 }),
  redemptionValueNgnts: decimal("redemption_value_ngnts", { precision: 30, scale: 2 }).notNull(),
  fundingPlan: jsonb("funding_plan").$type<{
    projectCashflow?: string;
    treasuryPool?: string;
    liquidityPool?: string;
  }>().default(sql`'{}'::jsonb`),
  txHashes: jsonb("tx_hashes").$type<string[]>().default(sql`'[]'::jsonb`),
  status: redemptionStatusEnum("status").notNull().default("pending"),
  adminNotes: text("admin_notes"),
  processedBy: uuid("processed_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

// Audit admin actions table - Complete admin action logging
export const auditAdminActions = pgTable("audit_admin_actions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: uuid("admin_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: varchar("action", { length: 128 }).notNull(),
  target: jsonb("target").$type<{
    type?: string;
    id?: string;
    [key: string]: any;
  }>(),
  details: jsonb("details").$type<{
    before?: any;
    after?: any;
    [key: string]: any;
  }>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// System errors table - Phase 2: Tracks critical errors for manual reconciliation
export const systemErrors = pgTable("system_errors", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  errorType: text("error_type").notNull(),
  severity: text("severity").notNull(), // critical, high, medium, low
  txHash: text("tx_hash"),
  projectId: uuid("project_id").references(() => projects.id),
  amountNgnts: decimal("amount_ngnts", { precision: 20, scale: 7 }),
  errorMessage: text("error_message"),
  resolved: boolean("resolved").default(false).notNull(),
  resolvedBy: uuid("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  resolvedIdx: index("system_errors_resolved_idx").on(table.resolved),
  severityIdx: index("system_errors_severity_idx").on(table.severity),
}));

// Phase 4-D: Token Marketplace (simulated liquidity exchange)
export const tokenOrders = pgTable("token_orders", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  orderType: orderTypeEnum("order_type").notNull(),
  tokenAmount: decimal("token_amount", { precision: 18, scale: 6 }).notNull(),
  pricePerToken: decimal("price_per_token", { precision: 18, scale: 6 }).notNull(),
  status: orderStatusEnum("status").notNull().default("open"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// LP Pool transactions table - Pool-level ledger for tracking inflows/outflows (Phase 1 Quick Win #1)
export const lpPoolTransactions = pgTable("lp_pool_transactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  type: lpPoolTxTypeEnum("type").notNull(),
  amountNgnts: decimal("amount_ngnts", { precision: 30, scale: 2 }).notNull(),
  sourceProjectId: uuid("source_project_id").references(() => projects.id),
  sourceCashflowId: uuid("source_cashflow_id").references(() => projectCashflows.id),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  createdAtIdx: index("lp_pool_tx_created_at_idx").on(table.createdAt),
  sourceCashflowIdx: index("lp_pool_tx_cashflow_idx").on(table.sourceCashflowId),
}));

// LP cashflow allocations table - Track 30% LP revenue share per investor (Phase 1 updated from 20% to 30%)
export const lpCashflowAllocations = pgTable("lp_cashflow_allocations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  cashflowId: uuid("cashflow_id").notNull().references(() => projectCashflows.id, { onDelete: "cascade" }),
  lpUserId: uuid("lp_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  shareAmount: decimal("share_amount", { precision: 30, scale: 2 }).notNull(),
  sharePercentage: decimal("share_percentage", { precision: 5, scale: 2 }).notNull().default("30.00"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Pending regenerator allocations table - Track 40% reserves awaiting distribution (Phase 1 holding bucket)
// Phase 4 will read from this table and distribute proportionally to token holders
export const pendingRegeneratorAllocations = pgTable("pending_regenerator_allocations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  cashflowId: uuid("cashflow_id").notNull().references(() => projectCashflows.id, { onDelete: "cascade" }).unique(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  amountNgnts: decimal("amount_ngnts", { precision: 30, scale: 2 }).notNull(), // 40% of cashflow reserved
  status: varchar("status", { length: 32 }).notNull().default("pending"), // "pending" → "distributed" by Phase 4
  distributedAt: timestamp("distributed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  projectStatusIdx: index("pending_regen_project_status_idx").on(table.projectId, table.status),
}));

// Regenerator cashflow distributions table - Track 40% regenerator revenue share (Phase 4 actual distributions)
// Distributes cashflow proportionally to all token holders based on their token ownership
export const regeneratorCashflowDistributions = pgTable("regenerator_cashflow_distributions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  cashflowId: uuid("cashflow_id").notNull().references(() => projectCashflows.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  tokensHeld: decimal("tokens_held", { precision: 30, scale: 8 }).notNull(), // Snapshot of tokens held at distribution time
  shareAmount: decimal("share_amount", { precision: 30, scale: 2 }).notNull(), // NGNTS distributed to this regenerator
  sharePercentage: decimal("share_percentage", { precision: 5, scale: 4 }).notNull(), // % of total tokens held (4 decimals for precision)
  txHash: text("tx_hash"), // On-chain transaction hash for NGNTS transfer
  distributedAt: timestamp("distributed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // Unique constraint: prevent double distributions for same cashflow + user
  cashflowUserUnique: index("regenerator_cashflow_user_idx").on(table.cashflowId, table.userId),
  // Performance indexes for common queries
  userProjectIdx: index("regenerator_user_project_idx").on(table.userId, table.projectId),
  projectIdx: index("regenerator_project_idx").on(table.projectId),
}));

// Primer Contributions table - Track institutional LP Pool contributions
export const primerContributions = pgTable("primer_contributions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  primerId: uuid("primer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  transactionId: uuid("transaction_id").references(() => transactions.id),
  grossAmountNgn: decimal("gross_amount_ngn", { precision: 18, scale: 2 }), // Original NGN deposit amount
  platformFeeNgn: decimal("platform_fee_ngn", { precision: 18, scale: 2 }), // Fee charged
  amountNgnts: decimal("amount_ngnts", { precision: 18, scale: 2 }).notNull(), // Net NGNTS after fees
  paymentMethod: text("payment_method"), // e.g., "bank_transfer", "cash"
  referenceCode: text("reference_code"), // Unique reference for tracking
  status: primerContributionStatusEnum("status").notNull().default("pending"),
  paymentProof: text("payment_proof"),
  txHash: text("tx_hash"),
  // DEPRECATED: RCX Model - Primers don't receive LP tokens (grant providers, not investors)
  // Kept nullable for historical data, will be removed in future migration
  lpPoolShareSnapshot: decimal("lp_pool_share_snapshot", { precision: 5, scale: 2 }).default(sql`NULL`),
  approvedBy: uuid("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectedReason: text("rejected_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// LP Project Allocations table - Track admin allocation of LP funds to projects (header)
export const lpProjectAllocations = pgTable("lp_project_allocations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  totalAmountNgnts: decimal("total_amount_ngnts", { precision: 18, scale: 2 }).notNull(),
  allocatedBy: uuid("allocated_by").notNull().references(() => users.id),
  allocationDate: timestamp("allocation_date").notNull().defaultNow(),
  txHash: text("tx_hash"),
  status: varchar("status", { length: 32 }).notNull().default("confirmed"),
  replenishedAt: timestamp("replenished_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Primer Project Allocations table - Track which Primers funded which projects (detail)
export const primerProjectAllocations = pgTable("primer_project_allocations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  primerId: uuid("primer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  allocationId: uuid("allocation_id").notNull().references(() => lpProjectAllocations.id, { onDelete: "cascade" }),
  shareAmountNgnts: decimal("share_amount_ngnts", { precision: 18, scale: 2 }).notNull(),
  sharePercent: decimal("share_percent", { precision: 5, scale: 2 }).notNull(),
  poolOwnershipPercent: decimal("pool_ownership_percent", { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Regenerator Wallet Funding Requests table - Track wallet activation funding requests
export const regeneratorWalletFundingRequests = pgTable("regenerator_wallet_funding_requests", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  walletId: uuid("wallet_id").notNull().references(() => wallets.id, { onDelete: "cascade" }),
  requestedBy: uuid("requested_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  amountRequested: decimal("amount_requested", { precision: 18, scale: 7 }).notNull().default("2.0000000"),
  currency: currencyEnum("currency").notNull().default("XLM"),
  netAmount: decimal("net_amount", { precision: 18, scale: 7 }),
  platformFee: decimal("platform_fee", { precision: 18, scale: 7 }).notNull().default("0.0000000"),
  gasFee: decimal("gas_fee", { precision: 18, scale: 7 }).notNull().default("0.0000000"),
  status: walletFundingRequestStatusEnum("status").notNull().default("pending"),
  approvedBy: uuid("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectedReason: text("rejected_reason"),
  txHash: text("tx_hash"),
  txHashes: json("tx_hashes").$type<string[]>(),
  feeBreakdown: json("fee_breakdown").$type<{
    platformFeeXLM: string;
    platformFeeNGN: string;
    gasFeeXLM: string;
    gasFeeNGN: string;
    totalFeesXLM: string;
    totalFeesNGN: string;
    netAmountXLM: string;
    netAmountNGN: string;
    xlmNgnRate: string;
    isFirstTimeActivation: boolean;
  }>(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Regenerator Bank Deposits table - Track NGN bank transfer deposits for NGNTS minting
export const regeneratorBankDeposits = pgTable("regenerator_bank_deposits", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  referenceCode: text("reference_code").notNull().unique(),
  paymentMethod: depositPaymentMethodEnum("payment_method").notNull().default("bank_transfer"),
  amountNGN: decimal("amount_ngn", { precision: 18, scale: 2 }).notNull(),
  ngntsAmount: decimal("ngnts_amount", { precision: 18, scale: 2 }).notNull(),
  platformFee: decimal("platform_fee", { precision: 18, scale: 2 }).notNull().default("0.00"),
  gasFee: decimal("gas_fee", { precision: 18, scale: 6 }).notNull().default("0.00"),
  feeBreakdown: jsonb("fee_breakdown").$type<{
    platformFeeRate: string;
    platformFeeAmount: string;
    networkFeeXLM: string;
    networkFeeNGN: string;
    totalFeesNGN: string;
    netAmount: string;
    needsActivation: boolean;
  }>(),
  status: bankDepositStatusEnum("status").notNull().default("pending"),
  proofUrl: text("proof_url"),
  approvedBy: uuid("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectedReason: text("rejected_reason"),
  adminNotes: text("admin_notes"), // Admin decision notes
  processedBy: uuid("processed_by").references(() => users.id), // Admin who processed
  processedAt: timestamp("processed_at"), // When processed
  txHash: text("tx_hash"),
  notes: text("notes"), // User notes
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Bank Deposit Decisions Audit Log - Immutable history of all deposit status changes
// Tracks approve/reject actions with admin notes and timestamps for compliance
export const bankDepositDecisions = pgTable("bank_deposit_decisions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  depositId: uuid("deposit_id").notNull().references(() => regeneratorBankDeposits.id, { onDelete: "no action" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "no action" }),
  previousStatus: bankDepositStatusEnum("previous_status").notNull(),
  newStatus: bankDepositStatusEnum("new_status").notNull(),
  processedBy: uuid("processed_by").references(() => users.id, { onDelete: "set null" }),
  adminNotes: text("admin_notes"),
  metadata: jsonb("metadata").$type<{
    ipAddress?: string;
    userAgent?: string;
    proofUrl?: string;
    txHash?: string;
    [key: string]: any;
  }>().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  // Index for efficient history queries per deposit
  depositIdCreatedAtIdx: index("bank_deposit_decisions_deposit_id_created_at_idx").on(table.depositId, table.createdAt.desc()),
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  wallets: many(wallets),
  transactions: many(transactions),
  depositRequests: many(depositRequests),
  withdrawalRequests: many(withdrawalRequests),
  walletFundingRequests: many(regeneratorWalletFundingRequests, { relationName: "requester" }),
  approvedWalletFundingRequests: many(regeneratorWalletFundingRequests, { relationName: "approver" }),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
  fundingRequests: many(regeneratorWalletFundingRequests),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}));

export const projectsRelations = relations(projects, ({ many }) => ({
  investments: many(investments),
  updates: many(projectUpdates),
}));

export const investmentsRelations = relations(investments, ({ one }) => ({
  user: one(users, {
    fields: [investments.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [investments.projectId],
    references: [projects.id],
  }),
}));

export const projectUpdatesRelations = relations(projectUpdates, ({ one }) => ({
  project: one(projects, {
    fields: [projectUpdates.projectId],
    references: [projects.id],
  }),
  author: one(users, {
    fields: [projectUpdates.postedBy],
    references: [users.id],
  }),
}));

export const projectTokenBalancesRelations = relations(projectTokenBalances, ({ one }) => ({
  user: one(users, {
    fields: [projectTokenBalances.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [projectTokenBalances.projectId],
    references: [projects.id],
  }),
}));

export const projectTokenLedgerRelations = relations(projectTokenLedger, ({ one }) => ({
  project: one(projects, {
    fields: [projectTokenLedger.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectTokenLedger.userId],
    references: [users.id],
  }),
}));

export const projectNavHistoryRelations = relations(projectNavHistory, ({ one }) => ({
  project: one(projects, {
    fields: [projectNavHistory.projectId],
    references: [projects.id],
  }),
  updatedBy: one(users, {
    fields: [projectNavHistory.updatedBy],
    references: [users.id],
  }),
}));

export const projectCashflowsRelations = relations(projectCashflows, ({ one }) => ({
  project: one(projects, {
    fields: [projectCashflows.projectId],
    references: [projects.id],
  }),
  verifiedBy: one(users, {
    fields: [projectCashflows.verifiedBy],
    references: [users.id],
  }),
}));

export const treasuryPoolTransactionsRelations = relations(treasuryPoolTransactions, ({ one }) => ({
  sourceProject: one(projects, {
    fields: [treasuryPoolTransactions.sourceProjectId],
    references: [projects.id],
  }),
}));

export const redemptionRequestsRelations = relations(redemptionRequests, ({ one }) => ({
  user: one(users, {
    fields: [redemptionRequests.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [redemptionRequests.projectId],
    references: [projects.id],
  }),
  processedBy: one(users, {
    fields: [redemptionRequests.processedBy],
    references: [users.id],
  }),
}));

export const auditAdminActionsRelations = relations(auditAdminActions, ({ one }) => ({
  admin: one(users, {
    fields: [auditAdminActions.adminId],
    references: [users.id],
  }),
}));

export const systemErrorsRelations = relations(systemErrors, ({ one }) => ({
  project: one(projects, {
    fields: [systemErrors.projectId],
    references: [projects.id],
  }),
  resolver: one(users, {
    fields: [systemErrors.resolvedBy],
    references: [users.id],
  }),
}));

export const tokenOrdersRelations = relations(tokenOrders, ({ one }) => ({
  user: one(users, {
    fields: [tokenOrders.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [tokenOrders.projectId],
    references: [projects.id],
  }),
}));

export const lpPoolTransactionsRelations = relations(lpPoolTransactions, ({ one }) => ({
  sourceProject: one(projects, {
    fields: [lpPoolTransactions.sourceProjectId],
    references: [projects.id],
  }),
  sourceCashflow: one(projectCashflows, {
    fields: [lpPoolTransactions.sourceCashflowId],
    references: [projectCashflows.id],
  }),
}));

export const lpCashflowAllocationsRelations = relations(lpCashflowAllocations, ({ one }) => ({
  cashflow: one(projectCashflows, {
    fields: [lpCashflowAllocations.cashflowId],
    references: [projectCashflows.id],
  }),
  lpUser: one(users, {
    fields: [lpCashflowAllocations.lpUserId],
    references: [users.id],
  }),
}));

export const pendingRegeneratorAllocationsRelations = relations(pendingRegeneratorAllocations, ({ one }) => ({
  cashflow: one(projectCashflows, {
    fields: [pendingRegeneratorAllocations.cashflowId],
    references: [projectCashflows.id],
  }),
  project: one(projects, {
    fields: [pendingRegeneratorAllocations.projectId],
    references: [projects.id],
  }),
}));

export const regeneratorCashflowDistributionsRelations = relations(regeneratorCashflowDistributions, ({ one }) => ({
  cashflow: one(projectCashflows, {
    fields: [regeneratorCashflowDistributions.cashflowId],
    references: [projectCashflows.id],
  }),
  user: one(users, {
    fields: [regeneratorCashflowDistributions.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [regeneratorCashflowDistributions.projectId],
    references: [projects.id],
  }),
}));

export const primerContributionsRelations = relations(primerContributions, ({ one }) => ({
  primer: one(users, {
    fields: [primerContributions.primerId],
    references: [users.id],
  }),
  transaction: one(transactions, {
    fields: [primerContributions.transactionId],
    references: [transactions.id],
  }),
  approver: one(users, {
    fields: [primerContributions.approvedBy],
    references: [users.id],
  }),
}));

export const lpProjectAllocationsRelations = relations(lpProjectAllocations, ({ one, many }) => ({
  project: one(projects, {
    fields: [lpProjectAllocations.projectId],
    references: [projects.id],
  }),
  allocator: one(users, {
    fields: [lpProjectAllocations.allocatedBy],
    references: [users.id],
  }),
  primerAllocations: many(primerProjectAllocations),
}));

export const primerProjectAllocationsRelations = relations(primerProjectAllocations, ({ one }) => ({
  primer: one(users, {
    fields: [primerProjectAllocations.primerId],
    references: [users.id],
  }),
  allocation: one(lpProjectAllocations, {
    fields: [primerProjectAllocations.allocationId],
    references: [lpProjectAllocations.id],
  }),
}));

export const regeneratorWalletFundingRequestsRelations = relations(regeneratorWalletFundingRequests, ({ one }) => ({
  wallet: one(wallets, {
    fields: [regeneratorWalletFundingRequests.walletId],
    references: [wallets.id],
  }),
  requester: one(users, {
    fields: [regeneratorWalletFundingRequests.requestedBy],
    references: [users.id],
    relationName: "requester",
  }),
  approver: one(users, {
    fields: [regeneratorWalletFundingRequests.approvedBy],
    references: [users.id],
    relationName: "approver",
  }),
}));

// Schemas for validation
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  phone: z.string().min(10),
  passwordHash: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  kycStatus: true,
  role: true,
});

export const registerUserSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(10),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  isPrimer: z.boolean().optional().default(false),
  isLpInvestor: z.boolean().optional().default(false),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const insertWalletSchema = createInsertSchema(wallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKycDecisionSchema = createInsertSchema(kycDecisions).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDepositRequestSchema = createInsertSchema(depositRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  processedAt: true,
});

export const initiateDepositSchema = z.object({
  currency: z.enum(["NGN", "USDC", "XLM"]),
});

export const confirmDepositSchema = z.object({
  transactionReference: z.string(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid decimal"),
  currency: z.enum(["NGN", "USDC", "XLM"]),
});

export const approveDepositSchema = z.object({
  action: z.enum(["approve", "reject"]),
  approvedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid decimal").optional(),
  adminNotes: z.string().optional(),
});

export const insertWithdrawalRequestSchema = createInsertSchema(withdrawalRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  processedAt: true,
  status: true,
});

export const initiateWithdrawalSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid decimal"),
  currency: z.enum(["NGN", "USDC", "XLM"]),
  destinationType: z.enum(["bank_account", "crypto_wallet"]),
  cryptoAddress: z.string().optional(),
}).refine((data) => {
  if (data.destinationType === "crypto_wallet") {
    return !!data.cryptoAddress;
  }
  return true;
}, {
  message: "Crypto address required for crypto withdrawals"
});

export const approveWithdrawalSchema = z.object({
  action: z.enum(["approve", "reject"]),
  processedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid decimal").optional(),
  adminNotes: z.string().optional(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvestmentSchema = createInsertSchema(investments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectUpdateSchema = createInsertSchema(projectUpdates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Project Milestones schemas
export const insertProjectMilestoneSchema = createInsertSchema(projectMilestones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProjectMilestone = z.infer<typeof insertProjectMilestoneSchema>;
export type SelectProjectMilestone = typeof projectMilestones.$inferSelect;

// Project Revenue schemas - Phase 4.1: RCX Model
export const insertProjectRevenueSchema = createInsertSchema(projectRevenue).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  bankDepositAmount: z.string().refine(
    (val) => parseFloat(val) > 0,
    { message: "Bank deposit amount must be greater than 0" }
  ),
  mintedNgnts: z.string().refine(
    (val) => parseFloat(val) > 0,
    { message: "Minted NGNTS amount must be greater than 0" }
  ),
});

export type InsertProjectRevenue = z.infer<typeof insertProjectRevenueSchema>;
export type SelectProjectRevenue = typeof projectRevenue.$inferSelect;

export const updateKycStatusSchema = z.object({
  action: z.enum(["approve", "reject"]),
  adminNotes: z.string().optional(),
});

export const insertProjectTokenBalanceSchema = createInsertSchema(projectTokenBalances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProjectTokenLedgerSchema = createInsertSchema(projectTokenLedger).omit({
  id: true,
  createdAt: true,
});

// RCX Model: Profit split configuration schema (without refinement to allow merging)
const profitSplitSchemaFields = z.object({
  lpReplenishmentPercent: z.string()
    .regex(/^\d+(\.\d{1,2})?$/, "Must be a valid percentage")
    .refine((val) => {
      const num = parseFloat(val);
      return num >= 0 && num <= 100;
    }, "Must be between 0 and 100"),
  regeneratorDistributionPercent: z.string()
    .regex(/^\d+(\.\d{1,2})?$/, "Must be a valid percentage")
    .refine((val) => {
      const num = parseFloat(val);
      return num >= 0 && num <= 100;
    }, "Must be between 0 and 100"),
  treasuryPercent: z.string()
    .regex(/^\d+(\.\d{1,2})?$/, "Must be a valid percentage")
    .refine((val) => {
      const num = parseFloat(val);
      return num >= 0 && num <= 100;
    }, "Must be between 0 and 100"),
  projectRetainedPercent: z.string()
    .regex(/^\d+(\.\d{1,2})?$/, "Must be a valid percentage")
    .refine((val) => {
      const num = parseFloat(val);
      return num >= 0 && num <= 100;
    }, "Must be between 0 and 100"),
});

// Dual wallet architecture schema
const dualWalletSchema = z.object({
  operationsWalletPublicKey: z.string()
    .min(56, "Stellar public key must be 56 characters")
    .max(56, "Stellar public key must be 56 characters")
    .regex(/^G[A-Z2-7]{55}$/, "Must be a valid Stellar public key"),
  revenueWalletPublicKey: z.string()
    .min(56, "Stellar public key must be 56 characters")
    .max(56, "Stellar public key must be 56 characters")
    .regex(/^G[A-Z2-7]{55}$/, "Must be a valid Stellar public key"),
});

export const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  location: z.string().min(1),
  currency: z.enum(["NGN", "USDC", "XLM"]).optional().default("NGN"),
  targetAmount: z.string().regex(/^\d+(\.\d{0,2})?$/, "Amount must be a valid decimal"),
  tokenSymbol: z.string().min(1).max(12).regex(/^[A-Z0-9]+$/, "Token symbol must be uppercase alphanumeric"),
  tokensIssued: z.string().regex(/^\d+(\.\d{0,2})?$/, "Amount must be a valid decimal"),
  pricePerToken: z.string().regex(/^\d+(\.\d{0,2})?$/, "Amount must be a valid decimal"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
}).merge(profitSplitSchemaFields).merge(dualWalletSchema).refine((data) => {
  const sum = parseFloat(data.lpReplenishmentPercent) +
              parseFloat(data.regeneratorDistributionPercent) +
              parseFloat(data.treasuryPercent) +
              parseFloat(data.projectRetainedPercent);
  return Math.abs(sum - 100) < 0.01; // Float comparison tolerance
}, { 
  message: "Profit split percentages must sum to exactly 100%",
  path: ["profitSplit"], // Top-level error, not tied to specific field
});

export const suspendUserSchema = z.object({
  isSuspended: z.boolean(),
  reason: z.string().optional(),
});

export const insertPlatformWalletSchema = createInsertSchema(platformWallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertExchangeRateSchema = createInsertSchema(exchangeRates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlatformSettingSchema = createInsertSchema(platformSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlatformBankAccountSchema = createInsertSchema(platformBankAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const createPlatformBankAccountSchema = z.object({
  title: z.string().min(1, "Title is required"),
  bankName: z.string().min(1, "Bank name is required"),
  accountNumber: z.string().min(10, "Account number must be at least 10 digits").max(10, "Account number must be exactly 10 digits"),
  companyName: z.string().min(1, "Company name is required"),
});

export const updatePlatformSettingsSchema = z.object({
  depositFeePercent: z.number().min(0).max(10).optional(),
  investmentFeePercent: z.number().min(0).max(10).optional(),
  withdrawalFeePercent: z.number().min(0).max(10).optional(),
  xlmMarkupMultiplier: z.number().min(1).max(20).optional(),
  minDepositNGN: z.number().min(0).optional(),
  minWithdrawalNGN: z.number().min(0).optional(),
});

export const updateExchangeRateSchema = z.object({
  manualOverrideEnabled: z.boolean(),
  manualXlmNgn: z.string().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid decimal").optional(),
});

export const insertSecondaryMarketOrderSchema = createInsertSchema(secondaryMarketOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  processedAt: true,
  status: true,
});

export const createSecondaryMarketOrderSchema = z.object({
  projectId: z.string().uuid(),
  tokenSymbol: z.string().min(1),
  tokensAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid decimal"),
  askingPriceNGNTS: z.string().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid decimal"),
  reason: z.string().optional(),
});

export const processSecondaryMarketOrderSchema = z.object({
  action: z.enum(["accept", "reject", "counter"]),
  counterOffer: z.string().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid decimal").optional(),
  adminNotes: z.string().optional(),
});

// Phase 4: Regenerative Capital Architecture Schemas
export const insertProjectNavHistorySchema = createInsertSchema(projectNavHistory).omit({
  id: true,
  createdAt: true,
});

export const createProjectNavHistorySchema = z.object({
  projectId: z.string().uuid(),
  navPerToken: z.string().regex(/^\d+(\.\d{1,8})?$/, "NAV must be a valid decimal with up to 8 decimals"),
  source: z.enum(["manual", "formula", "audited"]),
  notes: z.string().optional(),
});

export const insertProjectCashflowSchema = createInsertSchema(projectCashflows).omit({
  id: true,
  createdAt: true,
});

export const createProjectCashflowSchema = z.object({
  projectId: z.string().uuid(),
  amountNgnts: z.string().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid decimal"),
  source: z.string().max(128).optional(),
  sourceDocumentUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

export const verifyProjectCashflowSchema = z.object({
  status: z.enum(["verified", "tokenized"]),
  chainTxHash: z.string().optional(),
});

export const insertTreasuryPoolTransactionSchema = createInsertSchema(treasuryPoolTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertTreasuryPoolSnapshotSchema = createInsertSchema(treasuryPoolSnapshots).omit({
  id: true,
  createdAt: true,
});

export const insertRedemptionRequestSchema = createInsertSchema(redemptionRequests).omit({
  id: true,
  createdAt: true,
  processedAt: true,
  status: true,
});

export const createRedemptionRequestSchema = z.object({
  projectId: z.string().uuid(),
  tokensAmount: z.string().regex(/^\d+(\.\d{1,8})?$/, "Tokens must be a valid decimal with up to 8 decimals"),
});

export const processRedemptionRequestSchema = z.object({
  action: z.enum(["approve", "reject"]),
  adminNotes: z.string().optional(),
});

export const insertAuditAdminActionSchema = createInsertSchema(auditAdminActions).omit({
  id: true,
  createdAt: true,
});

export const insertSystemErrorSchema = createInsertSchema(systemErrors).omit({
  id: true,
  createdAt: true,
});

export const insertTokenOrderSchema = createInsertSchema(tokenOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
});

export const createTokenOrderSchema = z.object({
  projectId: z.string().uuid(),
  orderType: z.enum(["buy", "sell"]),
  tokenAmount: z.string().regex(/^\d+(\.\d{1,6})?$/, "Token amount must be a valid decimal with up to 6 decimals"),
  pricePerToken: z.string().regex(/^\d+(\.\d{1,6})?$/, "Price must be a valid decimal with up to 6 decimals"),
});

export const insertLpPoolTransactionSchema = createInsertSchema(lpPoolTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertLpCashflowAllocationSchema = createInsertSchema(lpCashflowAllocations).omit({
  id: true,
  createdAt: true,
});

export const insertPendingRegeneratorAllocationSchema = createInsertSchema(pendingRegeneratorAllocations).omit({
  id: true,
  createdAt: true,
});

export const insertRegeneratorCashflowDistributionSchema = createInsertSchema(regeneratorCashflowDistributions).omit({
  id: true,
  createdAt: true,
});

export const insertPrimerContributionSchema = createInsertSchema(primerContributions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
  approvedBy: true,
  status: true,
  lpPoolShareSnapshot: true, // RCX Model: Deprecated - Primers don't receive LP tokens
});

export const createPrimerContributionSchema = z.object({
  grossAmountNgn: z.string().regex(/^\d+(\.\d{1,2})?$/, "Gross amount must be a valid decimal"),
  platformFeeNgn: z.string().regex(/^\d+(\.\d{1,2})?$/, "Platform fee must be a valid decimal"),
  amountNgnts: z.string().regex(/^\d+(\.\d{1,2})?$/, "Net amount must be a valid decimal"),
  paymentMethod: z.string().optional(),
  referenceCode: z.string().optional(),
  // paymentProof handled via multipart file upload (req.file), not as a string field
});

export const primerContributionPreviewSchema = z.object({
  amountNGN: z.string()
    .regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid decimal")
    .refine((val) => {
      const num = parseFloat(val);
      return num >= 1000 && num <= 100000000;
    }, "Amount must be between ₦1,000 and ₦100,000,000"),
});

export const approvePrimerContributionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  rejectedReason: z.string().optional(),
});

export const insertLpProjectAllocationSchema = createInsertSchema(lpProjectAllocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  allocationDate: true,
});

export const createLpProjectAllocationSchema = z.object({
  projectId: z.string().uuid(),
  totalAmountNgnts: z.string().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid decimal"),
  notes: z.string().optional(),
});

export const insertPrimerProjectAllocationSchema = createInsertSchema(primerProjectAllocations).omit({
  id: true,
  createdAt: true,
});

export const insertRegeneratorWalletFundingRequestSchema = createInsertSchema(regeneratorWalletFundingRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedBy: true,
  approvedAt: true,
  status: true,
});

export const createWalletFundingRequestSchema = z.object({
  amountRequested: z.string().regex(/^\d+(\.\d{1,6})?$/, "Amount must be a valid decimal").default("2.0"),
  notes: z.string().optional(),
});

export const approveWalletFundingRequestSchema = z.object({
  action: z.enum(["approve", "reject"]),
  rejectedReason: z.string().optional(),
});

export const insertRegeneratorBankDepositSchema = createInsertSchema(regeneratorBankDeposits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedBy: true,
  approvedAt: true,
  status: true,
  txHash: true,
});

export const createBankDepositRequestSchema = z.object({
  amountNGN: z.string().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid decimal with up to 2 decimal places"),
  referenceCode: z.string().regex(/^NGN-[A-Z0-9]{8,12}-[A-Z0-9]{4,6}$/, "Invalid reference code format").max(30).optional(),
  notes: z.string().optional(),
});

export const approveBankDepositSchema = z.object({
  action: z.enum(["approve", "reject"]),
  rejectedReason: z.string().optional(),
});

export const insertDistributionEventSchema = createInsertSchema(distributionEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  snapshotDate: true,
  snapshotTotalLpTokens: true,
  snapshotNav: true,
  snapshotMetadata: true,
  totalAllocated: true,
  totalWithdrawn: true,
  totalPending: true,
  approvedBy: true,
  approvedAt: true,
  completedAt: true,
  cancelledBy: true,
  cancelledAt: true,
  cancellationReason: true,
});

export const createDistributionEventSchema = z.object({
  projectId: z.string().uuid(),
  eventType: z.string().max(50),
  title: z.string().max(255),
  description: z.string().optional(),
  totalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Total amount must be a valid decimal"),
  distributionDate: z.coerce.date(),
});

export const insertDistributionAllocationSchema = createInsertSchema(distributionAllocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  withdrawnAmount: true,
  pendingAmount: true,
});

export const insertDistributionWithdrawalSchema = createInsertSchema(distributionWithdrawals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  reviewedBy: true,
  reviewedAt: true,
  approvedBy: true,
  approvedAt: true,
  rejectedBy: true,
  rejectedAt: true,
  rejectionReason: true,
  paymentChannel: true,
  paymentReference: true,
  paymentDate: true,
  paymentAmount: true,
  paidBy: true,
  paidAt: true,
  paymentNotes: true,
});

export const createDistributionWithdrawalSchema = z.object({
  distributionAllocationId: z.string().uuid(),
  requestedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Requested amount must be a valid decimal"),
  bankName: z.string().max(255).optional(),
  accountNumber: z.string().max(50).optional(),
  accountName: z.string().max(255).optional(),
  requestNotes: z.string().optional(),
});

export const approveDistributionWithdrawalSchema = z.object({
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().optional(),
});

export const recordDistributionPaymentSchema = z.object({
  paymentChannel: z.string().max(50).optional(),
  paymentReference: z.string().max(255),
  paymentDate: z.coerce.date(),
  paymentAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Payment amount must be a valid decimal"),
  paymentNotes: z.string().optional(),
});

export const insertDistributionActivityLogSchema = createInsertSchema(distributionActivityLog).omit({
  id: true,
  createdAt: true,
});

// Bank deposit fee preview response type
export type BankDepositFeePreview = {
  amountNGN: number;
  platformFee: number;
  platformFeePercent: number;
  gasFeeXLM: number;
  gasFeeNGN: number;
  walletActivationFee: number;
  xlmNgnRate: number;
  totalFeesNGN: number;
  ngntsAmount: number;
  needsWalletActivation: boolean;
};

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type LoginUser = z.infer<typeof loginSchema>;
export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type KycDecision = typeof kycDecisions.$inferSelect;
export type InsertKycDecision = z.infer<typeof insertKycDecisionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type DepositRequest = typeof depositRequests.$inferSelect;
export type InsertDepositRequest = z.infer<typeof insertDepositRequestSchema>;
export type WithdrawalRequest = typeof withdrawalRequests.$inferSelect;
export type InsertWithdrawalRequest = z.infer<typeof insertWithdrawalRequestSchema>;
export type InitiateDeposit = z.infer<typeof initiateDepositSchema>;
export type ConfirmDeposit = z.infer<typeof confirmDepositSchema>;
export type ApproveDeposit = z.infer<typeof approveDepositSchema>;
export type InitiateWithdrawal = z.infer<typeof initiateWithdrawalSchema>;
export type ApproveWithdrawal = z.infer<typeof approveWithdrawalSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Investment = typeof investments.$inferSelect;
export type InsertInvestment = z.infer<typeof insertInvestmentSchema>;
export type ProjectUpdate = typeof projectUpdates.$inferSelect;
export type InsertProjectUpdate = z.infer<typeof insertProjectUpdateSchema>;
export type UpdateKycStatus = z.infer<typeof updateKycStatusSchema>;
export type ProjectTokenBalance = typeof projectTokenBalances.$inferSelect;
export type InsertProjectTokenBalance = z.infer<typeof insertProjectTokenBalanceSchema>;
export type ProjectTokenLedger = typeof projectTokenLedger.$inferSelect;
export type InsertProjectTokenLedger = z.infer<typeof insertProjectTokenLedgerSchema>;
export type CreateProject = z.infer<typeof createProjectSchema>;
export type SuspendUser = z.infer<typeof suspendUserSchema>;
export type PlatformWallet = typeof platformWallets.$inferSelect;
export type InsertPlatformWallet = z.infer<typeof insertPlatformWalletSchema>;
export type ExchangeRate = typeof exchangeRates.$inferSelect;
export type InsertExchangeRate = z.infer<typeof insertExchangeRateSchema>;
export type UpdateExchangeRate = z.infer<typeof updateExchangeRateSchema>;
export type PlatformSetting = typeof platformSettings.$inferSelect;
export type InsertPlatformSetting = z.infer<typeof insertPlatformSettingSchema>;
export type UpdatePlatformSettings = z.infer<typeof updatePlatformSettingsSchema>;
export type PlatformBankAccount = typeof platformBankAccounts.$inferSelect;
export type InsertPlatformBankAccount = z.infer<typeof insertPlatformBankAccountSchema>;
export type CreatePlatformBankAccount = z.infer<typeof createPlatformBankAccountSchema>;
export type SecondaryMarketOrder = typeof secondaryMarketOrders.$inferSelect;
export type InsertSecondaryMarketOrder = z.infer<typeof insertSecondaryMarketOrderSchema>;
export type CreateSecondaryMarketOrder = z.infer<typeof createSecondaryMarketOrderSchema>;
export type ProcessSecondaryMarketOrder = z.infer<typeof processSecondaryMarketOrderSchema>;
export type ProjectNavHistory = typeof projectNavHistory.$inferSelect;
export type InsertProjectNavHistory = z.infer<typeof insertProjectNavHistorySchema>;
export type CreateProjectNavHistory = z.infer<typeof createProjectNavHistorySchema>;
export type ProjectCashflow = typeof projectCashflows.$inferSelect;
export type InsertProjectCashflow = z.infer<typeof insertProjectCashflowSchema>;
export type CreateProjectCashflow = z.infer<typeof createProjectCashflowSchema>;
export type VerifyProjectCashflow = z.infer<typeof verifyProjectCashflowSchema>;
export type TreasuryPoolTransaction = typeof treasuryPoolTransactions.$inferSelect;
export type InsertTreasuryPoolTransaction = z.infer<typeof insertTreasuryPoolTransactionSchema>;
export type TreasuryPoolSnapshot = typeof treasuryPoolSnapshots.$inferSelect;
export type InsertTreasuryPoolSnapshot = z.infer<typeof insertTreasuryPoolSnapshotSchema>;
export type RedemptionRequest = typeof redemptionRequests.$inferSelect;
export type InsertRedemptionRequest = z.infer<typeof insertRedemptionRequestSchema>;
export type CreateRedemptionRequest = z.infer<typeof createRedemptionRequestSchema>;
export type ProcessRedemptionRequest = z.infer<typeof processRedemptionRequestSchema>;
export type AuditAdminAction = typeof auditAdminActions.$inferSelect;
export type InsertAuditAdminAction = z.infer<typeof insertAuditAdminActionSchema>;
export type SystemError = typeof systemErrors.$inferSelect;
export type InsertSystemError = z.infer<typeof insertSystemErrorSchema>;
export type TokenOrder = typeof tokenOrders.$inferSelect;
export type InsertTokenOrder = z.infer<typeof insertTokenOrderSchema>;
export type CreateTokenOrder = z.infer<typeof createTokenOrderSchema>;
export type LpCashflowAllocation = typeof lpCashflowAllocations.$inferSelect;
export type InsertLpCashflowAllocation = z.infer<typeof insertLpCashflowAllocationSchema>;
export type PrimerContribution = typeof primerContributions.$inferSelect;
export type InsertPrimerContribution = z.infer<typeof insertPrimerContributionSchema>;
export type CreatePrimerContribution = z.infer<typeof createPrimerContributionSchema>;
export type PrimerContributionPreview = z.infer<typeof primerContributionPreviewSchema>;
export type ApprovePrimerContribution = z.infer<typeof approvePrimerContributionSchema>;
export type LpProjectAllocation = typeof lpProjectAllocations.$inferSelect;
export type InsertLpProjectAllocation = z.infer<typeof insertLpProjectAllocationSchema>;
export type CreateLpProjectAllocation = z.infer<typeof createLpProjectAllocationSchema>;
export type PrimerProjectAllocation = typeof primerProjectAllocations.$inferSelect;
export type InsertPrimerProjectAllocation = z.infer<typeof insertPrimerProjectAllocationSchema>;
export type RegeneratorWalletFundingRequest = typeof regeneratorWalletFundingRequests.$inferSelect;
export type InsertRegeneratorWalletFundingRequest = z.infer<typeof insertRegeneratorWalletFundingRequestSchema>;
export type CreateWalletFundingRequest = z.infer<typeof createWalletFundingRequestSchema>;
export type ApproveWalletFundingRequest = z.infer<typeof approveWalletFundingRequestSchema>;
export type RegeneratorBankDeposit = typeof regeneratorBankDeposits.$inferSelect;
export type InsertRegeneratorBankDeposit = z.infer<typeof insertRegeneratorBankDepositSchema>;
export type CreateBankDepositRequest = z.infer<typeof createBankDepositRequestSchema>;
export type ApproveBankDeposit = z.infer<typeof approveBankDepositSchema>;
export type BankDepositDecision = typeof bankDepositDecisions.$inferSelect;
export type DistributionEvent = typeof distributionEvents.$inferSelect;
export type InsertDistributionEvent = z.infer<typeof insertDistributionEventSchema>;
export type CreateDistributionEvent = z.infer<typeof createDistributionEventSchema>;
export type DistributionAllocation = typeof distributionAllocations.$inferSelect;
export type InsertDistributionAllocation = z.infer<typeof insertDistributionAllocationSchema>;
export type DistributionWithdrawal = typeof distributionWithdrawals.$inferSelect;
export type InsertDistributionWithdrawal = z.infer<typeof insertDistributionWithdrawalSchema>;
export type CreateDistributionWithdrawal = z.infer<typeof createDistributionWithdrawalSchema>;
export type ApproveDistributionWithdrawal = z.infer<typeof approveDistributionWithdrawalSchema>;
export type RecordDistributionPayment = z.infer<typeof recordDistributionPaymentSchema>;
export type DistributionActivityLog = typeof distributionActivityLog.$inferSelect;
export type InsertDistributionActivityLog = z.infer<typeof insertDistributionActivityLogSchema>;
