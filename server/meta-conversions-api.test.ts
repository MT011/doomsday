import { describe, expect, it } from "vitest";
import { getMetaPurchaseEvent, hashMetaUserData } from "./meta-conversions-api";

describe("Meta Conversions API", () => {
  it("normaliza e aplica SHA-256 aos dados de matching", () => {
    expect(hashMetaUserData("  CLIENTE@EMAIL.COM ")).toBe(
      "f958615b63651da5744af7b0a2b748af2c98321b938f8275b8859f9109874a3b",
    );
  });

  it("cria Purchase com event_id igual ao Pixel e sem dados sensíveis crus", () => {
    const event = getMetaPurchaseEvent({
      orderCode: "DD-AB12CD",
      amountCents: 7440,
      itemCount: 2,
      buyerEmail: "cliente@example.com",
      buyerName: "Cliente Teste",
      paidAt: "2026-09-04T12:00:00.000Z",
    });

    expect(event.event_name).toBe("Purchase");
    expect(event.event_id).toBe("purchase_DD-AB12CD");
    expect(event.action_source).toBe("website");
    expect(event.custom_data).toMatchObject({ currency: "BRL", value: 74.4, num_items: 2 });
    expect(JSON.stringify(event)).not.toContain("cliente@example.com");
    expect(JSON.stringify(event)).not.toContain("Cliente Teste");
  });
});
