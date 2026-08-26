import { getAmploPayPixPaymentByOrderCode, getAmploPayPixPaymentByTransactionId, updateAmploPayPixPayment } from "./db.js";
import { getVeoPagWebhookAmount, getVeoPagWebhookOrderCode, getVeoPagWebhookStatus, getVeoPagWebhookTransactionId, isVeoPagSignatureValid } from "./veopag.js";

type ProviderResponse = Record<string, unknown>;

export function registerVeoPagWebhook(app: any) {
  app.post("/api/veopag/webhook", async (req: any, res: any) => {
    const rawBody = typeof req.rawBody === "string" ? req.rawBody : undefined;
    const signature = req.get?.("X-Webhook-Signature") as string | undefined;
    const timestamp = req.get?.("X-Webhook-Timestamp") as string | undefined;
    if (!rawBody || !isVeoPagSignatureValid(process.env.VEOPAG_WEBHOOK_SECRET, timestamp, rawBody, signature)) {
      res.status(401).json({ error: "Assinatura do webhook VeoPag inválida." });
      return;
    }

    const payload = (req.body ?? {}) as ProviderResponse;
    if (payload.type !== undefined && String(payload.type).toLowerCase() !== "deposit") {
      res.status(400).json({ error: "Evento VeoPag não é um depósito." });
      return;
    }
    if (payload.currency !== undefined && String(payload.currency).toUpperCase() !== "BRL") {
      res.status(400).json({ error: "Apenas depósitos PIX em BRL são aceitos." });
      return;
    }
    const transactionId = getVeoPagWebhookTransactionId(payload);
    const orderCode = getVeoPagWebhookOrderCode(payload);
    const payment = transactionId
      ? await getAmploPayPixPaymentByTransactionId(transactionId)
      : orderCode
        ? await getAmploPayPixPaymentByOrderCode(orderCode)
        : undefined;
    if (!payment) {
      res.status(404).json({ error: "Cobrança PIX VeoPag não encontrada." });
      return;
    }

    const receivedAmount = getVeoPagWebhookAmount(payload);
    if (receivedAmount !== undefined && Math.round(receivedAmount * 100) !== payment.amountCents) {
      res.status(422).json({ error: "O valor do webhook não corresponde à cobrança registrada." });
      return;
    }

    const status = getVeoPagWebhookStatus(payload);
    const alreadyPaid = payment.status === "PAID";
    if (alreadyPaid && status === "PENDING") {
      res.status(200).json({ received: true, idempotent: true });
      return;
    }

    await updateAmploPayPixPayment(payment.orderCode, {
      status,
      lastWebhookEvent: typeof payload.status === "string" ? payload.status : "unknown",
      webhookProcessedAt: new Date(),
      ...(status === "PAID" && !alreadyPaid ? { paidAt: new Date() } : {}),
      providerPayload: payload,
    });
    res.status(200).json({ received: true, idempotent: alreadyPaid && status === "PAID" });
  });
}
