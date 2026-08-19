import { integer, json, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 16 }).notNull().default("user"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const amplopayPixPayments = pgTable("amplopayPixPayments", {
  id: serial("id").primaryKey(),
  orderCode: varchar("orderCode", { length: 64 }).notNull().unique(),
  identifier: varchar("identifier", { length: 96 }).notNull().unique(),
  transactionId: varchar("transactionId", { length: 128 }).unique(),
  status: varchar("status", { length: 16 }).notNull().default("PENDING"),
  amountCents: integer("amountCents").notNull(),
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
  webhookProcessedAt: timestamp("webhookProcessedAt", { withTimezone: true }),
  paidAt: timestamp("paidAt", { withTimezone: true }),
  providerPayload: json("providerPayload"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type AmploPayPixPayment = typeof amplopayPixPayments.$inferSelect;
export type InsertAmploPayPixPayment = typeof amplopayPixPayments.$inferInsert;
