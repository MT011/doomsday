import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import type { PoolOptions } from "mysql2";
import { amplopayPixPayments, InsertAmploPayPixPayment, InsertUser, users } from "../drizzle/schema.js";
import { ENV } from './_core/env.js';

let _db: ReturnType<typeof drizzle> | null = null;
let _pixPaymentsTableReady: Promise<void> | null = null;

type EnvironmentValues = Record<string, string | undefined>;
export const TIDB_APPLICATION_DATABASE = "doomsday_presale";

const TIDB_SYSTEM_DATABASES = new Set(["information_schema", "mysql", "performance_schema", "sys"]);

export function needsTiDbApplicationDatabase(database: string | undefined) {
  return !database || TIDB_SYSTEM_DATABASES.has(database.trim().toLowerCase());
}

export function getTiDbConnectionOptions(env: EnvironmentValues = process.env): PoolOptions | undefined {
  const host = env.TIDB_HOST?.trim();
  const user = env.TIDB_USER?.trim();
  const password = env.TIDB_PASSWORD;
  if (!host || !user || !password) return undefined;

  const parsedPort = Number(env.TIDB_PORT ?? "4000");
  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    throw new Error("A porta configurada para o TiDB é inválida.");
  }

  return {
    host,
    port: parsedPort,
    user,
    password,
    database: env.TIDB_DATABASE?.trim() || "sys",
    ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
  };
}

export const PIX_PAYMENTS_CREATE_SQL = `
  CREATE TABLE IF NOT EXISTS \`amplopayPixPayments\` (
    \`id\` INT NOT NULL AUTO_INCREMENT,
    \`orderCode\` VARCHAR(64) NOT NULL,
    \`identifier\` VARCHAR(96) NOT NULL,
    \`transactionId\` VARCHAR(128) NULL,
    \`status\` ENUM('PENDING', 'PAID', 'FAILED', 'REJECTED', 'CANCELED', 'REFUNDED', 'CHARGED_BACK') NOT NULL DEFAULT 'PENDING',
    \`amountCents\` INT NOT NULL,
    \`buyerName\` VARCHAR(255) NOT NULL,
    \`buyerEmail\` VARCHAR(320) NOT NULL,
    \`buyerDocument\` VARCHAR(64) NOT NULL,
    \`cinema\` JSON NOT NULL,
    \`session\` JSON NOT NULL,
    \`seats\` JSON NOT NULL,
    \`pixCode\` TEXT NULL,
    \`pixImageUrl\` TEXT NULL,
    \`webhookToken\` VARCHAR(512) NULL,
    \`lastWebhookEvent\` VARCHAR(64) NULL,
    \`webhookProcessedAt\` TIMESTAMP NULL,
    \`paidAt\` TIMESTAMP NULL,
    \`providerPayload\` JSON NULL,
    \`createdAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    \`updatedAt\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`amplopayPixPayments_orderCode_unique\` (\`orderCode\`),
    UNIQUE KEY \`amplopayPixPayments_identifier_unique\` (\`identifier\`),
    UNIQUE KEY \`amplopayPixPayments_transactionId_unique\` (\`transactionId\`)
  )
`;

async function ensurePixPaymentsTable(db: ReturnType<typeof drizzle>) {
  if (!_pixPaymentsTableReady) {
    _pixPaymentsTableReady = db.execute(sql.raw(PIX_PAYMENTS_CREATE_SQL)).then(() => undefined).catch(error => {
      _pixPaymentsTableReady = null;
      throw error;
    });
  }
  await _pixPaymentsTableReady;
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db) {
    try {
      const tiDbOptions = getTiDbConnectionOptions();
      if (tiDbOptions) {
        if (needsTiDbApplicationDatabase(tiDbOptions.database)) {
          const bootstrapDb = drizzle({ connection: tiDbOptions });
          await bootstrapDb.execute(sql.raw(`CREATE DATABASE IF NOT EXISTS \`${TIDB_APPLICATION_DATABASE}\``));
          _db = drizzle({ connection: { ...tiDbOptions, database: TIDB_APPLICATION_DATABASE } });
        } else {
          _db = drizzle({ connection: tiDbOptions });
        }
      } else if (process.env.DATABASE_URL) {
        _db = drizzle(process.env.DATABASE_URL);
      }
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createAmploPayPixPayment(values: InsertAmploPayPixPayment) {
  const db = await getDb();
  if (!db) throw new Error("O banco de dados não está disponível para criar a cobrança PIX.");
  await ensurePixPaymentsTable(db);
  await db.insert(amplopayPixPayments).values(values);
  return getAmploPayPixPaymentByOrderCode(values.orderCode);
}

export async function getAmploPayPixPaymentByOrderCode(orderCode: string) {
  const db = await getDb();
  if (!db) return undefined;
  await ensurePixPaymentsTable(db);
  const result = await db.select().from(amplopayPixPayments).where(eq(amplopayPixPayments.orderCode, orderCode)).limit(1);
  return result[0];
}

export async function getAmploPayPixPaymentByTransactionId(transactionId: string) {
  const db = await getDb();
  if (!db) return undefined;
  await ensurePixPaymentsTable(db);
  const result = await db.select().from(amplopayPixPayments).where(eq(amplopayPixPayments.transactionId, transactionId)).limit(1);
  return result[0];
}

export async function updateAmploPayPixPayment(orderCode: string, values: Partial<InsertAmploPayPixPayment>) {
  const db = await getDb();
  if (!db) throw new Error("O banco de dados não está disponível para atualizar a cobrança PIX.");
  await ensurePixPaymentsTable(db);
  await db.update(amplopayPixPayments).set(values).where(eq(amplopayPixPayments.orderCode, orderCode));
  return getAmploPayPixPaymentByOrderCode(orderCode);
}
