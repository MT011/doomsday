import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { amplopayPixPayments, InsertAmploPayPixPayment, InsertUser, users } from "../drizzle/schema.js";
import { ENV } from "./_core/env.js";

type EnvironmentValues = Record<string, string | undefined>;
type DatabaseErrorLike = { message?: unknown; code?: unknown; cause?: unknown };
type PostgresDatabase = ReturnType<typeof drizzle>;

let _db: PostgresDatabase | null = null;
let _pool: Pool | null = null;
let _pixPaymentsTableReady: Promise<void> | null = null;
let _databaseInitializationError: Error | null = null;

const PIX_PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REJECTED", "CANCELED", "REFUNDED", "CHARGED_BACK"];

export const PIX_PAYMENTS_CREATE_SQL = `
  CREATE TABLE IF NOT EXISTS "amplopayPixPayments" (
    "id" SERIAL PRIMARY KEY,
    "orderCode" VARCHAR(64) NOT NULL UNIQUE,
    "identifier" VARCHAR(96) NOT NULL UNIQUE,
    "transactionId" VARCHAR(128) UNIQUE,
    "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK ("status" IN (${PIX_PAYMENT_STATUSES.map(status => `'${status}'`).join(", ")})),
    "amountCents" INTEGER NOT NULL,
    "buyerName" VARCHAR(255) NOT NULL,
    "buyerEmail" VARCHAR(320) NOT NULL,
    "buyerDocument" VARCHAR(64) NOT NULL,
    "cinema" JSON NOT NULL,
    "session" JSON NOT NULL,
    "seats" JSON NOT NULL,
    "pixCode" TEXT,
    "pixImageUrl" TEXT,
    "webhookToken" VARCHAR(512),
    "lastWebhookEvent" VARCHAR(64),
    "webhookProcessedAt" TIMESTAMPTZ,
    "paidAt" TIMESTAMPTZ,
    "providerPayload" JSON,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

export const PIX_PAYMENTS_TRANSACTION_ID_UNIQUE_SQL = `
  CREATE UNIQUE INDEX IF NOT EXISTS "amplopayPixPayments_transactionId_unique"
  ON public."amplopayPixPayments" ("transactionId")
`;

function asDatabaseError(value: unknown): DatabaseErrorLike {
  return typeof value === "object" && value !== null ? value as DatabaseErrorLike : {};
}

function sanitizeDatabaseErrorDetail(value: unknown) {
  if (typeof value !== "string") return undefined;
  return value
    .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "postgresql://[oculto]")
    .replace(/password\s*[:=]\s*[^\s,;]+/gi, "password=[oculto]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 480);
}

export function formatPostgresInitializationError(error: unknown) {
  const outer = asDatabaseError(error);
  const cause = asDatabaseError(outer.cause);
  const code = typeof cause.code === "string" || typeof outer.code === "string" ? String(cause.code ?? outer.code) : undefined;
  const detail = sanitizeDatabaseErrorDetail(cause.message) ?? sanitizeDatabaseErrorDetail(outer.message);
  return `Não foi possível preparar o banco PIX do Supabase${code ? ` (código ${code})` : ""}${detail ? `: ${detail}` : "."}`;
}

export function getSupabaseDatabaseUrl(env: EnvironmentValues = process.env) {
  const connectionString = env.POSTGRES_URL?.trim() || env.DATABASE_URL?.trim();
  if (!connectionString) return undefined;
  if (!/^postgres(?:ql)?:\/\//i.test(connectionString)) {
    throw new Error("A conexão do Supabase precisa usar uma URL PostgreSQL segura.");
  }
  return connectionString;
}

export function getSupabasePoolConnectionString(connectionString: string) {
  const url = new URL(connectionString);
  for (const key of ["sslmode", "ssl", "sslrootcert", "sslcert", "sslkey"]) {
    url.searchParams.delete(key);
  }
  return url.toString();
}

async function ensurePixPaymentsTable(db: PostgresDatabase) {
  if (!_pixPaymentsTableReady) {
    _pixPaymentsTableReady = db.execute(sql.raw(PIX_PAYMENTS_CREATE_SQL))
      .then(() => db.execute(sql.raw(PIX_PAYMENTS_TRANSACTION_ID_UNIQUE_SQL)))
      .then(() => undefined)
      .catch(error => {
      _pixPaymentsTableReady = null;
      throw new Error(formatPostgresInitializationError(error));
    });
  }
  await _pixPaymentsTableReady;
}

export async function getDb() {
  if (!_db) {
    try {
      const connectionString = getSupabaseDatabaseUrl();
      if (connectionString) {
        _pool = new Pool({
          connectionString: getSupabasePoolConnectionString(connectionString),
          max: 1,
          ssl: { rejectUnauthorized: false },
        });
        _db = drizzle({ client: _pool });
      }
    } catch (error) {
      _databaseInitializationError = new Error(formatPostgresInitializationError(error));
      console.warn("[Database] Failed to initialize:", _databaseInitializationError.message);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = { updatedAt: new Date() };
  const textFields = ["name", "email", "loginMethod"] as const;

  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }

  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;

  await db.insert(users).values(values).onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function createAmploPayPixPayment(values: InsertAmploPayPixPayment) {
  const db = await getDb();
  if (!db) throw _databaseInitializationError ?? new Error("O banco de dados não está disponível para criar a cobrança PIX.");
  await ensurePixPaymentsTable(db);
  await db.insert(amplopayPixPayments).values(values);
  return getAmploPayPixPaymentByOrderCode(values.orderCode);
}

export async function getAmploPayPixPaymentByOrderCode(orderCode: string) {
  const db = await getDb();
  if (!db) {
    if (_databaseInitializationError) throw _databaseInitializationError;
    return undefined;
  }
  await ensurePixPaymentsTable(db);
  const result = await db.select().from(amplopayPixPayments).where(eq(amplopayPixPayments.orderCode, orderCode)).limit(1);
  return result[0];
}

export async function getAmploPayPixPaymentByTransactionId(transactionId: string) {
  const db = await getDb();
  if (!db) {
    if (_databaseInitializationError) throw _databaseInitializationError;
    return undefined;
  }
  await ensurePixPaymentsTable(db);
  const result = await db.select().from(amplopayPixPayments).where(eq(amplopayPixPayments.transactionId, transactionId)).limit(1);
  return result[0];
}

export async function updateAmploPayPixPayment(orderCode: string, values: Partial<InsertAmploPayPixPayment>) {
  const db = await getDb();
  if (!db) throw _databaseInitializationError ?? new Error("O banco de dados não está disponível para atualizar a cobrança PIX.");
  await ensurePixPaymentsTable(db);
  await db.update(amplopayPixPayments).set({ ...values, updatedAt: new Date() }).where(eq(amplopayPixPayments.orderCode, orderCode));
  return getAmploPayPixPaymentByOrderCode(orderCode);
}
