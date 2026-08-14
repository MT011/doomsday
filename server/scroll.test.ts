import { afterEach, describe, expect, it, vi } from "vitest";
import { scrollToPurchaseFlow } from "../client/src/lib/scroll";

afterEach(() => vi.unstubAllGlobals());

describe("rolagem do fluxo de compra", () => {
  it("posiciona a etapa de pagamento no topo do fluxo", () => {
    const scrollIntoView = vi.fn();
    vi.stubGlobal("document", {
      getElementById: vi.fn(() => ({ scrollIntoView })),
    });

    scrollToPurchaseFlow();

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });
});
