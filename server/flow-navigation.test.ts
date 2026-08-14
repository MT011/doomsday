import { describe, expect, it } from "vitest";
import { getCheckoutScreen, getPreviousScreen, getScreenAfterPixStatus, getSeatsScreen } from "../client/src/lib/flow-navigation";
import { canConfirmPixCheckout, isCheckoutPurchaseReady } from "../client/src/lib/pix-confirmation";

describe("transições do funil de compra", () => {
  it("preserva as transições de sessões para assentos e de assentos para pagamento", () => {
    expect(getSeatsScreen()).toBe("seats");
    expect(getCheckoutScreen()).toBe("checkout");
  });

  it("preserva todos os retornos contextuais", () => {
    expect(getPreviousScreen("sessions")).toBe("discover");
    expect(getPreviousScreen("seats")).toBe("sessions");
    expect(getPreviousScreen("checkout")).toBe("seats");
    expect(getPreviousScreen("confirmation")).toBe("checkout");
  });

  it("avança checkout para confirmação apenas com PIX aprovado localmente", () => {
    expect(getScreenAfterPixStatus({ screen: "checkout", status: "PAID", hasPayment: true, hasOrder: false })).toBe("confirmation");
    expect(getScreenAfterPixStatus({ screen: "checkout", status: "PENDING", hasPayment: true, hasOrder: false })).toBe("checkout");
    expect(getScreenAfterPixStatus({ screen: "checkout", status: "PAID", hasPayment: false, hasOrder: false })).toBe("checkout");
    expect(getScreenAfterPixStatus({ screen: "confirmation", status: "PAID", hasPayment: true, hasOrder: false })).toBe("confirmation");
  });

  it("só considera o checkout pronto quando há comprador, todos os assentos e valor positivo", () => {
    expect(isCheckoutPurchaseReady({ hasBuyer: true, selectedSeatCount: 2, ticketQuantity: 2, amount: 102.56 })).toBe(true);
    expect(isCheckoutPurchaseReady({ hasBuyer: false, selectedSeatCount: 2, ticketQuantity: 2, amount: 102.56 })).toBe(false);
    expect(isCheckoutPurchaseReady({ hasBuyer: true, selectedSeatCount: 1, ticketQuantity: 2, amount: 102.56 })).toBe(false);
    expect(isCheckoutPurchaseReady({ hasBuyer: true, selectedSeatCount: 2, ticketQuantity: 2, amount: 0 })).toBe(false);
  });

  it("confirma PIX somente com pedido completo e bloqueia o retorno em loop após criar o pedido", () => {
    const completeCheckout = { screen: "checkout" as const, status: "PAID", hasPayment: true, hasBuyer: true, selectedSeatCount: 2, ticketQuantity: 2, amount: 102.56 };
    expect(canConfirmPixCheckout({ ...completeCheckout, hasOrder: false })).toBe(true);
    expect(canConfirmPixCheckout({ ...completeCheckout, hasOrder: true })).toBe(false);
  });
});
