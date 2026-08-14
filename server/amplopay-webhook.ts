import type { Express, Request, Response } from "express";
import { getAmploPayPixPaymentByTransactionId, updateAmploPayPixPayment } from "./db";
import { isSecureTokenMatch, normalizeAmploPayStatus } from "./amplopay";

type WebhookPayload = Record<string, unknown> & {
  event?: string;
  token?: string;
  transaction?: Record<string, unknown>;
};

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

function getTransactionId(payload: WebhookPayload) {
  return readString(payload.transaction?.id) ?? readString(payload.transactionId);
}

function getProviderStatus(payload: WebhookPayload) {
  return normalizeAmploPayStatus(payload.transaction?.status ?? payload.status ?? payload.event);
}

export function registerAmploPayWebhook(app: Express) {
  app.post("/api/amplopay/webhook", async (req: Request, res: Response) => {
    const payload = req.body as WebhookPayload;
    const transactionId = getTransactionId(payload);
    if (!transactionId) {
      res.status(400).json({ error: "Identificador da transação ausente." });
      return;
    }

    const payment = await getAmploPayPixPaymentByTransactionId(transactionId);
    if (!payment) {
      res.status(404).json({ error: "Cobrança PIX não encontrada." });
      return;
    }
    if (!isSecureTokenMatch(payment.webhookToken, payload.token)) {
      res.status(401).json({ error: "Token de webhook inválido." });
      return;
    }

    const receivedAmount = readNumber(payload.transaction?.chargeAmount) ?? readNumber(payload.transaction?.amount);
    if (receivedAmount !== undefined && Math.round(receivedAmount * 100) !== payment.amountCents) {
      res.status(422).json({ error: "O valor do webhook não corresponde à cobrança registrada." });
      return;
    }

    const status = getProviderStatus(payload);
    const event = readString(payload.event) ?? "TRANSACTION_UPDATED";
    const alreadyPaid = payment.status === "PAID";
    await updateAmploPayPixPayment(payment.orderCode, {
      status,
      lastWebhookEvent: event,
      webhookProcessedAt: new Date(),
      ...(status === "PAID" && !alreadyPaid ? { paidAt: new Date() } : {}),
      providerPayload: payload,
    });

    res.status(200).json({ received: true, idempotent: alreadyPaid && status === "PAID" });
  });
}
