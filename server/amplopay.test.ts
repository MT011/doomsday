import { describe, expect, it } from "vitest";
import { buildWebhookUrl, isSecureTokenMatch, normalizeAmploPayStatus } from "./amplopay";

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
});
