import { describe, expect, it } from "vitest";
import { getProviderStatus } from "./amplopay-webhook";

describe("AmploPay payment webhook", () => {
  it("prioritizes a paid webhook event even when the nested transaction status is stale", () => {
    expect(getProviderStatus({ event: "TRANSACTION_PAID", transaction: { status: "PENDING" } })).toBe("PAID");
  });

  it("uses the provider transaction status when the event carries no terminal payment state", () => {
    expect(getProviderStatus({ event: "TRANSACTION_CREATED", transaction: { status: "COMPLETED" } })).toBe("PAID");
  });
});
