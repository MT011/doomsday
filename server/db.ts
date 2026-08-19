import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { amplopayPixPayments, InsertAmploPayPixPayment } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function createAmploPayPixPayment(values: InsertAmploPayPixPayment) {
  const db = await getDb();
  if (!db) throw new Error("O banco de dados não está disponível para criar a cobrança PIX.");
  try {
    const row = {
      orderCode: values.orderCode,
      identifier: values.identifier,
      status: values.status,
      amountCents: values.amountCents,
      buyerName: values.buyerName,
      buyerEmail: values.buyerEmail,
      buyerDocument: values.buyerDocument,
      cinema: JSON.stringify(values.cinema),
      session: JSON.stringify(values.session),
      seats: JSON.stringify(values.seats),
      transactionId: values.transactionId ?? undefined,
      pixCode: values.pixCode ?? undefined,
      pixImageUrl: values.pixImageUrl ?? undefined,
      webhookToken: values.webhookToken ?? undefined,
      lastWebhookEvent: values.lastWebhookEvent ?? undefined,
      webhookProcessedAt: values.webhookProcessedAt ?? undefined,
      paidAt: values.paidAt ?? undefined,
      providerPayload: values.providerPayload ? JSON.stringify(values.providerPayload) : undefined,
    };
    await db.insert(amplopayPixPayments).values(row as any);
  } catch (error: any) {
    console.error("[DB] Insert failed:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    throw new Error("Erro ao salvar cobrança PIX: " + (error?.message ?? "desconhecido"));
  }
  return getAmploPayPixPaymentByOrderCode(values.orderCode);
}

export async function getAmploPayPixPaymentByOrderCode(orderCode: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(amplopayPixPayments).where(eq(amplopayPixPayments.orderCode, orderCode)).limit(1);
  return result[0];
}

export async function getAmploPayPixPaymentByTransactionId(transactionId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(amplopayPixPayments).where(eq(amplopayPixPayments.transactionId, transactionId)).limit(1);
  return result[0];
}

export async function updateAmploPayPixPayment(orderCode: string, values: Partial<InsertAmploPayPixPayment>) {
  const db = await getDb();
  if (!db) throw new Error("O banco de dados não está disponível para atualizar a cobrança PIX.");
  await db.update(amplopayPixPayments).set(values).where(eq(amplopayPixPayments.orderCode, orderCode));
  return getAmploPayPixPaymentByOrderCode(orderCode);
}
