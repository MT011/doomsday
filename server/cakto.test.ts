import { describe, expect, it } from "vitest";
import {
  buildCaktoWebhookUrl,
  createCaktoIdempotencyKey,
  createCaktoOfferName,
  getCaktoWebhookOrderCode,
  getCaktoWebhookTransactionId,
  isCaktoSecretMatch,
  normalizeCaktoDocument,
  normalizeCaktoPhone,
  normalizeCaktoStatus,
  safeCaktoValidationMessage,
} from "./cakto";

describe("Cakto PIX adapter", () => {
  it("normalizes Cakto statuses and events", () => {
    expect(normalizeCaktoStatus("waiting_payment")).toBe("PENDING");
    expect(normalizeCaktoStatus("waiting_payment", "purchase_approved")).toBe("PAID");
    expect(normalizeCaktoStatus("refused")).toBe("REJECTED");
    expect(normalizeCaktoStatus("chargeback")).toBe("CHARGED_BACK");
    expect(normalizeCaktoStatus("pix_expired")).toBe("CANCELED");
  });

  it("normalizes Brazilian customer data for the Cakto payload", () => {
    expect(normalizeCaktoPhone("(11) 99999-9999")).toBe("5511999999999");
    expect(normalizeCaktoDocument("136.593.976-60")).toBe("13659397660");
    expect(() => normalizeCaktoPhone("1199")).toThrow("celular");
    expect(() => normalizeCaktoDocument("123")).toThrow("CPF");
  });

  it("builds an HTTPS webhook URL and deterministic offer naming", () => {
    expect(buildCaktoWebhookUrl("https://prevendadoomsday.com.br/")).toBe("https://prevendadoomsday.com.br/api/cakto/webhook");
    expect(() => buildCaktoWebhookUrl("http://localhost:3000")).toThrow("HTTPS");
    expect(createCaktoOfferName(5128)).toContain("5128");
  });

  it("creates an idempotency key within the provider limit", () => {
    const key = createCaktoIdempotencyKey("DD-PIX-ABC123");
    expect(key).toContain("dd-dd-pix-abc123");
    expect(key.length).toBeLessThanOrEqual(255);
  });

  it("compares webhook secrets without accepting missing or different values", () => {
    expect(isCaktoSecretMatch("webhook-secret", "webhook-secret")).toBe(true);
    expect(isCaktoSecretMatch("webhook-secret", "another-secret")).toBe(false);
    expect(isCaktoSecretMatch(undefined, "webhook-secret")).toBe(false);
  });

  it("extracts the Cakto transaction and local order code", () => {
    const payload = {
      event: "purchase_approved",
      data: {
        id: "cakto-payment-id",
        externalId: "cakto-external-id",
        refId: "cakto-ref",
        metadata: { orderCode: "DD-PIX-LOCAL" },
      },
    };
    expect(getCaktoWebhookTransactionId(payload)).toBe("cakto-payment-id");
    expect(getCaktoWebhookOrderCode(payload)).toBe("DD-PIX-LOCAL");
  });

  it("extracts the first item from Cakto's grouped webhook payload", () => {
    const payload = {
      event: "purchase_approved",
      data: [
        {
          id: "cakto-grouped-payment-id",
          baseAmount: 55.8,
          metadata: { orderCode: "DD-PIX-GROUPED" },
        },
      ],
    };
    expect(getCaktoWebhookTransactionId(payload)).toBe("cakto-grouped-payment-id");
    expect(getCaktoWebhookOrderCode(payload)).toBe("DD-PIX-GROUPED");
  });

  it("preserves safe provider validation details without exposing credentials", () => {
    expect(safeCaktoValidationMessage({ detail: "client_secret inválido" })).toContain("recusou");
    expect(safeCaktoValidationMessage({ paymentMethod: ["Método não suportado"] })).toContain("paymentMethod: Método não suportado");
    expect(safeCaktoValidationMessage({ amount: ["inválido"] })).toContain("amount: inválido");
  });
});
