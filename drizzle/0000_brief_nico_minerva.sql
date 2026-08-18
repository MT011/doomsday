CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" varchar(16) DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "amplopayPixPayments" (
	"id" serial PRIMARY KEY NOT NULL,
	"orderCode" varchar(64) NOT NULL,
	"identifier" varchar(96) NOT NULL,
	"transactionId" varchar(128),
	"status" varchar(32) DEFAULT 'PENDING' NOT NULL,
	"amountCents" integer NOT NULL,
	"buyerName" varchar(255) NOT NULL,
	"buyerEmail" varchar(320) NOT NULL,
	"buyerDocument" varchar(64) NOT NULL,
	"cinema" json NOT NULL,
	"session" json NOT NULL,
	"seats" json NOT NULL,
	"pixCode" text,
	"pixImageUrl" text,
	"webhookToken" varchar(512),
	"lastWebhookEvent" varchar(64),
	"webhookProcessedAt" timestamp,
	"paidAt" timestamp,
	"providerPayload" json,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "amplopayPixPayments_orderCode_unique" UNIQUE("orderCode"),
	CONSTRAINT "amplopayPixPayments_identifier_unique" UNIQUE("identifier"),
	CONSTRAINT "amplopayPixPayments_transactionId_unique" UNIQUE("transactionId")
);
