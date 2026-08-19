import { afterEach, describe, expect, it, vi } from "vitest";
import { getTicketEventParameters, trackMetaPixel } from "../client/src/lib/meta-pixel";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Meta Pixel", () => {
  it("monta eventos comerciais sem incluir dados pessoais do comprador", () => {
    expect(getTicketEventParameters({ value: 102.56, quantity: 2, sessionId: "sessao-1820" })).toEqual({
      content_ids: ["sessao-1820"],
      content_name: "Avengers: Doomsday — Pré-venda",
      content_type: "product",
      currency: "BRL",
      num_items: 2,
      value: 102.56,
    });
  });

  it("envia o evento somente quando o código-base do Pixel está disponível", () => {
    const fbq = vi.fn();
    vi.stubGlobal("window", { fbq });

    expect(trackMetaPixel("InitiateCheckout", getTicketEventParameters({ value: 51.28, quantity: 1 }))).toBe(true);
    expect(fbq).toHaveBeenCalledWith("track", "InitiateCheckout", expect.objectContaining({ currency: "BRL", value: 51.28 }));
  });

  it("não falha quando o visitante bloqueia o carregamento do Pixel", () => {
    vi.stubGlobal("window", {});

    expect(trackMetaPixel("Purchase", getTicketEventParameters({ value: 51.28, quantity: 1 }))).toBe(false);
  });
});
