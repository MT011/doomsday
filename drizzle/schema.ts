import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const amplopayPixPayments = mysqlTable("amplopayPixPayments", {
  id: int("id").autoincrement().primaryKey(),
  orderCode: varchar("orderCode", { length: 64 }).notNull().unique(),
  identifier: varchar("identifier", { length: 96 }).notNull().unique(),
  transactionId: varchar("transactionId", { length: 128 }).unique(),
  status: mysqlEnum("status", ["PENDING", "PAID", "FAILED", "REJECTED", "CANCELED", "REFUNDED", "CHARGED_BACK"]).notNull().default("PENDING"),
  amountCents: int("amountCents").notNull(),
  buyerName: varchar("buyerName", { length: 255 }).notNull(),
  buyerEmail: varchar("buyerEmail", { length: 320 }).notNull(),
  buyerDocument: varchar("buyerDocument", { length: 64 }).notNull(),
  cinema: json("cinema").notNull(),
  session: json("session").notNull(),
  seats: json("seats").notNull(),
  pixCode: text("pixCode"),
  pixImageUrl: text("pixImageUrl"),
  webhookToken: varchar("webhookToken", { length: 512 }),
  lastWebhookEvent: varchar("lastWebhookEvent", { length: 64 }),
  webhookProcessedAt: timestamp("webhookProcessedAt"),
  paidAt: timestamp("paidAt"),
  providerPayload: json("providerPayload"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AmploPayPixPayment = typeof amplopayPixPayments.$inferSelect;
export type InsertAmploPayPixPayment = typeof amplopayPixPayments.$inferInsert;
