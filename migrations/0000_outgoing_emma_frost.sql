CREATE TYPE "public"."currency" AS ENUM('NGN', 'USDC', 'XLM');--> statement-breakpoint
CREATE TYPE "public"."deposit_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."destination_type" AS ENUM('bank_account', 'crypto_wallet');--> statement-breakpoint
CREATE TYPE "public"."kyc_status" AS ENUM('pending', 'submitted', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('bank_transfer', 'card', 'stellar', 'wallet');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('deposit', 'withdrawal', 'investment', 'return', 'fee');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('investor', 'admin');--> statement-breakpoint
CREATE TYPE "public"."withdrawal_status" AS ENUM('pending', 'approved', 'rejected', 'completed');--> statement-breakpoint
CREATE TABLE "deposit_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"currency" "currency" NOT NULL,
	"payment_proof" text,
	"status" "deposit_status" DEFAULT 'pending' NOT NULL,
	"admin_notes" text,
	"processed_by" uuid,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"currency" "currency" NOT NULL,
	"status" "transaction_status" DEFAULT 'pending' NOT NULL,
	"payment_method" "payment_method",
	"reference" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"role" "user_role" DEFAULT 'investor' NOT NULL,
	"kyc_status" "kyc_status" DEFAULT 'pending' NOT NULL,
	"kyc_documents" json,
	"stellar_public_key" text,
	"stellar_secret_key_encrypted" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"currency" "currency" NOT NULL,
	"balance" numeric(18, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "withdrawal_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"currency" "currency" NOT NULL,
	"destination_type" "destination_type" NOT NULL,
	"bank_details" json,
	"crypto_address" text,
	"status" "withdrawal_status" DEFAULT 'pending' NOT NULL,
	"admin_notes" text,
	"processed_by" uuid,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deposit_requests" ADD CONSTRAINT "deposit_requests_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposit_requests" ADD CONSTRAINT "deposit_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposit_requests" ADD CONSTRAINT "deposit_requests_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;