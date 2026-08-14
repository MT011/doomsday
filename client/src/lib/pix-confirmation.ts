import { getScreenAfterPixStatus, type FlowScreen } from "@/lib/flow-navigation";

export type CheckoutPurchaseReadiness = {
  hasBuyer: boolean;
  selectedSeatCount: number;
  ticketQuantity: number;
  amount: number;
};

export function isCheckoutPurchaseReady({ hasBuyer, selectedSeatCount, ticketQuantity, amount }: CheckoutPurchaseReadiness) {
  return hasBuyer && ticketQuantity > 0 && selectedSeatCount === ticketQuantity && amount > 0;
}

export type PixConfirmationDecision = CheckoutPurchaseReadiness & {
  screen: FlowScreen;
  status?: string;
  hasPayment: boolean;
  hasOrder: boolean;
};

export function canConfirmPixCheckout({ screen, status, hasPayment, hasOrder, ...purchase }: PixConfirmationDecision) {
  return isCheckoutPurchaseReady(purchase) && getScreenAfterPixStatus({ screen, status, hasPayment, hasOrder }) === "confirmation";
}
