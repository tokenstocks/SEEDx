import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, pgEnum, json, uuid, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum("user_role", ["investor", "admin"]);
export const kycStatusEnum = pgEnum("kyc_status", ["pending", "submitted", "approved", "rejected"]);
export const currencyEnum = pgEnum("currency", ["NGN", "USDC", "XLM"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["deposit", "withdrawal", "investment", "return", "fee"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "processing", "completed", "failed", "cancelled"]);
export const paymentMethodEnum = pgEnum("payment_method", ["bank_transfer", "card", "stellar", "wallet"]);
export const depositStatusEnum = pgEnum("deposit_status", ["pending", "approved", "rejected"]);
export const withdrawalStatusEnum = pgEnum("withdrawal_status", ["pending", "approved", "rejected", "completed"]);
export const destinationTypeEnum = pgEnum("destination_type", ["bank_account", "crypto_wallet"]);
export const projectStatusEnum = pgEnum("project_status", ["draft", "active", "funded", "completed", "cancelled"]);
export const tokenLedgerActionEnum = pgEnum("token_ledger_action", ["create", "mint", "transfer", "burn", "redemption"]);

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
  isSuspended: boolean("is_suspended").notNull().default(false),
  stellarPublicKey: text("stellar_public_key"),
  stellarSecretKeyEncrypted: text("stellar_secret_key_encrypted"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Wallets table - Hybrid model (one wallet per user)
export const wallets = pgTable("wallets", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  // Fiat balance (NGN) - database-only tracking
  fiatBalance: decimal("fiat_balance", { precision: 18, scale: 2 }).notNull().default("0.00"),
  // Crypto balances - tracked on Stellar blockchain
  cryptoBalances: json("crypto_balances").$type<{
    USDC?: string;
    XLM?: string;
    [tokenSymbol: string]: string | undefined; // Project tokens dynamically
  }>().default(sql`'{}'::json`),
  // Stellar wallet for all crypto assets
  cryptoWalletPublicKey: text("crypto_wallet_public_key"),
  cryptoWalletSecretEncrypted: text("crypto_wallet_secret_encrypted"),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

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

// Project token balances table - tracks user holdings of project-specific tokens
export const projectTokenBalances = pgTable("project_token_balances", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  tokenAmount: decimal("token_amount", { precision: 18, scale: 2 }).notNull().default("0.00"),
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  wallets: many(wallets),
  transactions: many(transactions),
  depositRequests: many(depositRequests),
  withdrawalRequests: many(withdrawalRequests),
}));

export const walletsRelations = relations(wallets, ({ one }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
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
  bankDetails: z.object({
    accountName: z.string().min(1),
    accountNumber: z.string().min(1),
    bankName: z.string().min(1),
  }).optional(),
  cryptoAddress: z.string().optional(),
}).refine((data) => {
  if (data.destinationType === "bank_account") {
    return !!data.bankDetails;
  }
  if (data.destinationType === "crypto_wallet") {
    return !!data.cryptoAddress;
  }
  return false;
}, {
  message: "Bank details required for bank withdrawals, crypto address required for crypto withdrawals"
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

export const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  location: z.string().min(1),
  targetAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid decimal"),
  tokenSymbol: z.string().min(1).max(12).regex(/^[A-Z0-9]+$/, "Token symbol must be uppercase alphanumeric"),
  tokensIssued: z.string().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid decimal"),
  pricePerToken: z.string().regex(/^\d+(\.\d{1,2})?$/, "Amount must be a valid decimal"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const suspendUserSchema = z.object({
  isSuspended: z.boolean(),
  reason: z.string().optional(),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type RegisterUser = z.infer<typeof registerUserSchema>;
export type LoginUser = z.infer<typeof loginSchema>;
export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = z.infer<typeof insertWalletSchema>;
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
