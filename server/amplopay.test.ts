import { describe, expect, it } from "vitest";
import { buildWebhookUrl, formatBrazilCpf, formatBrazilPhone, isSecureTokenMatch, normalizeAmploPayStatus, safeProviderValidationMessage } from "./amplopay";
import { getPublicOrigin } from "./routers";

describe("AmploPay PIX adapter", () => {
  it("normalizes provider statuses before persisting payment state", () => {
    expect(normalizeAmploPayStatus("COMPLETED")).toBe("PAID");
    expect(normalizeAmploPayStatus("TRANSACTION_CANCELED")).toBe("CANCELED");
    expect(normalizeAmploPayStatus("unexpected")).toBe("PENDING");
  });

  it("accepts only matching webhook tokens", () => {
    expect(isSecureTokenMatch("token-verified", "token-verified")).toBe(true);
    expect(isSecureTokenMatch("token-verified", "token-other")).toBe(false);
    expect(isSecureTokenMatch(undefined, "token-verified")).toBe(false);
  });

  it("builds the fixed HTTPS webhook endpoint", () => {
    expect(buildWebhookUrl("https://presale.example.com/")).toBe("https://presale.example.com/api/amplopay/webhook");
    expect(() => buildWebhookUrl("http://presale.example.com")).toThrow("HTTPS");
  });

  it("uses the configured public origin behind a proxy and rejects a divergent checkout origin", () => {
    const publicOrigin = "https://www.prevendadoomsday.com.br";
    process.env.AMPLOPAY_CALLBACK_ORIGIN = publicOrigin;
    expect(getPublicOrigin({ headers: { origin: publicOrigin } })).toBe(publicOrigin);
    expect(() => getPublicOrigin({ headers: { origin: "https://origem-maliciosa.example" } })).toThrow("não corresponde");
    delete process.env.AMPLOPAY_CALLBACK_ORIGIN;
  });

  it("normalizes CPF and phone data required by the PIX provider", () => {
    expect(formatBrazilCpf("13659397660")).toBe("136.593.976-60");
    expect(formatBrazilPhone("11999999999")).toBe("(11) 99999-9999");
    expect(() => formatBrazilCpf("123")).toThrow("CPF");
    expect(() => formatBrazilPhone("1199")).toThrow("celular");
  });

  it("returns only rejected field names from a provider validation error", () => {
    expect(safeProviderValidationMessage({ details: { "client.document": "sensitive input", amount: "invalid" } })).toBe("Dados da cobrança inválidos nos campos: client.document, amount.");
    expect(safeProviderValidationMessage({ details: "raw provider payload" })).toContain("Verifique nome, CPF, celular");
  });
});
