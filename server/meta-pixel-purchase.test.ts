import { describe, expect, it } from "vitest";
import { getMetaPurchaseParameters } from "../client/src/lib/meta-pixel";

describe("evento Purchase do Meta Pixel", () => {
  it("envia somente dados comerciais mínimos da compra confirmada", () => {
    const parameters = getMetaPurchaseParameters({
      orderCode: "DD-AB12CD",
      value: 102.56,
      itemCount: 2,
    });

    expect(parameters).toEqual({
      content_ids: ["DD-AB12CD"],
      content_type: "product",
      currency: "BRL",
      num_items: 2,
      value: 102.56,
    });
    expect(JSON.stringify(parameters)).not.toMatch(/cpf|document|phone|email|pix/i);
  });
});
