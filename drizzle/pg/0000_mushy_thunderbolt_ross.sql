CREATE TABLE "amplopayPixPayments" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderCode" varchar(64) NOT NULL,
	"identifier" varchar(96) NOT NULL,
	"transactionId" varchar(128),
	"status" varchar(16) DEFAULT 'PENDING' NOT NULL,
	"amountCents" integer NOT NULL,
	"buyerName" varchar(255) NOT NULL,
	"buyerEmail" varchar(320) NOT NULL,
	"buyerDocument" varchar(64) NOT NULL,
	"cinema" jsonb NOT NULL,
	"session" jsonb NOT NULL,
	"seats" jsonb NOT NULL,
	"pixCode" text,
	"pixImageUrl" text,
	"webhookToken" varchar(512),
	"lastWebhookEvent" varchar(64),
	"webhookProcessedAt" timestamp with time zone,
	"paidAt" timestamp with time zone,
	"providerPayload" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "amplopayPixPayments_orderCode_unique" UNIQUE("orderCode"),
	CONSTRAINT "amplopayPixPayments_identifier_unique" UNIQUE("identifier"),
	CONSTRAINT "amplopayPixPayments_transactionId_unique" UNIQUE("transactionId")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" varchar(16) DEFAULT 'user' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
