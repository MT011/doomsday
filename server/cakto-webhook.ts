import { getAmploPayPixPaymentByTransactionId, updateAmploPayPixPayment } from "./db.js";
import {
  getCaktoWebhookData,
  getCaktoWebhookEvent,
  getCaktoWebhookOrderCode,
  getCaktoWebhookTransactionId,
  isCaktoSecretMatch,
  normalizeCaktoStatus,
} from "./cakto.js";

type CaktoWebhookPayload = Record<string, unknown>;

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

function getCaktoPaymentStatus(payload: CaktoWebhookPayload) {
  const event = getCaktoWebhookEvent(payload);
  const data = getCaktoWebhookData(payload);
  const eventStatus = normalizeCaktoStatus(undefined, event);
  return eventStatus === "PENDING" ? normalizeCaktoStatus(data.status) : eventStatus;
}

export function registerCaktoWebhook(app: any) {
  app.post("/api/cakto/webhook", async (req: any, res: any) => {
    const payload = (req.body ?? {}) as CaktoWebhookPayload;
    const expectedSecret = process.env.CAKTO_WEBHOOK_SECRET;
    if (!isCaktoSecretMatch(expectedSecret, payload.secret)) {
      res.status(401).json({ error: "Segredo de webhook inválido." });
      return;
    }

    const data = getCaktoWebhookData(payload);
    const transactionId = getCaktoWebhookTransactionId(payload);
    const orderCode = getCaktoWebhookOrderCode(payload);
    const payment = transactionId
      ? await getAmploPayPixPaymentByTransactionId(transactionId)
      : orderCode
        ? await import("./db.js").then(({ getAmploPayPixPaymentByOrderCode }) => getAmploPayPixPaymentByOrderCode(orderCode))
        : undefined;
    if (!payment) {
      res.status(404).json({ error: "Cobrança PIX Cakto não encontrada." });
      return;
    }

    const receivedAmount = readNumber(data.amount) ?? readNumber(data.baseAmount);
    if (receivedAmount !== undefined && Math.round(receivedAmount * 100) !== payment.amountCents) {
      res.status(422).json({ error: "O valor do webhook não corresponde à cobrança registrada." });
      return;
    }

    const status = getCaktoPaymentStatus(payload);
    const event = getCaktoWebhookEvent(payload);
    const alreadyPaid = payment.status === "PAID";
    if (status === "PENDING" && alreadyPaid) {
      res.status(200).json({ received: true, idempotent: true });
      return;
    }

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

export { getCaktoPaymentStatus };
