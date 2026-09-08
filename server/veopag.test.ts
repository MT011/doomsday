import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildVeoPagWebhookUrl,
  isVeoPagSignatureValid,
  normalizeVeoPagDocument,
  normalizeVeoPagPhone,
  normalizeVeoPagPixImage,
  normalizeVeoPagStatus,
  safeVeoPagValidationMessage,
} from "./veopag.js";

describe("VeoPag PIX adapter", () => {
  it("normalizes documented payment statuses", () => {
    expect(normalizeVeoPagStatus("COMPLETED")).toBe("PAID");
    expect(normalizeVeoPagStatus("FAILED")).toBe("FAILED");
    expect(normalizeVeoPagStatus("PENDING")).toBe("PENDING");
  });

  it("normalizes payer document and phone", () => {
    expect(normalizeVeoPagDocument("123.456.789-09")).toBe("12345678909");
    expect(normalizeVeoPagPhone("(11) 98765-4321")).toBe("11987654321");
  });

  it("normalizes VeoPag QR image formats for browser rendering", () => {
    const rawBase64 = "iVBORw0KGgo" + "A".repeat(120);
    expect(normalizeVeoPagPixImage(rawBase64)).toBe(`data:image/png;base64,${rawBase64}`);
    expect(normalizeVeoPagPixImage("data:image/png;base64,abc")).toBe("data:image/png;base64,abc");
    expect(normalizeVeoPagPixImage("https://cdn.example.com/qr.png")).toBe("https://cdn.example.com/qr.png");
    expect(normalizeVeoPagPixImage("not-an-image")).toBeNull();
  });

  it("builds the official HTTPS webhook path", () => {
    expect(buildVeoPagWebhookUrl("https://www.prevendadoomsday.com.br/")).toBe("https://www.prevendadoomsday.com.br/api/veopag/webhook");
    expect(() => buildVeoPagWebhookUrl("http://localhost:3000")).toThrow(/HTTPS/);
  });

  it("validates HMAC signature over timestamp and raw body", () => {
    const secret = "webhook-secret";
    const timestamp = "1787750000";
    const rawBody = '{"status":"COMPLETED"}';
    const signature = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
    expect(isVeoPagSignatureValid(secret, timestamp, rawBody, signature, Number(timestamp))).toBe(true);
    expect(isVeoPagSignatureValid(secret, timestamp, rawBody, `${signature}x`, Number(timestamp))).toBe(false);
  });

  it("does not expose credentials in provider errors", () => {
    expect(safeVeoPagValidationMessage({ message: "invalid client_secret token" })).toContain("Verifique os dados");
  });
});
