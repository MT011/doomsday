import { describe, expect, it } from "vitest";
import { getCaktoPaymentStatus } from "./cakto-webhook";

describe("Cakto payment webhook", () => {
  it("prioritizes purchase approval over a stale nested status", () => {
    expect(getCaktoPaymentStatus({ event: "purchase_approved", data: { status: "waiting_payment" } })).toBe("PAID");
  });

  it("maps refusal, refund, chargeback and expiration events", () => {
    expect(getCaktoPaymentStatus({ event: "purchase_refused", data: {} })).toBe("REJECTED");
    expect(getCaktoPaymentStatus({ event: "refund", data: {} })).toBe("REFUNDED");
    expect(getCaktoPaymentStatus({ event: "chargeback", data: {} })).toBe("CHARGED_BACK");
    expect(getCaktoPaymentStatus({ event: "pix_gerado", data: {} })).toBe("PENDING");
  });

  it("uses a terminal data status when the event itself is not terminal", () => {
    expect(getCaktoPaymentStatus({ event: "initiate_checkout", data: { status: "approved" } })).toBe("PAID");
  });

  it("reads a terminal status from the first item of a grouped payload", () => {
    expect(getCaktoPaymentStatus({ event: "initiate_checkout", data: [{ status: "approved" }] })).toBe("PAID");
  });
});
