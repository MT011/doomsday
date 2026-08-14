export type FlowScreen = "discover" | "sessions" | "seats" | "checkout" | "confirmation";

export function getSeatsScreen(): FlowScreen {
  return "seats";
}

export function getCheckoutScreen(): FlowScreen {
  return "checkout";
}

export function getPreviousScreen(screen: FlowScreen): FlowScreen {
  const previous: Record<FlowScreen, FlowScreen> = {
    discover: "discover",
    sessions: "discover",
    seats: "sessions",
    checkout: "seats",
    confirmation: "checkout",
  };
  return previous[screen];
}

export function getScreenAfterPixStatus({ screen, status, hasPayment, hasOrder }: { screen: FlowScreen; status?: string; hasPayment: boolean; hasOrder: boolean }): FlowScreen {
  return screen === "checkout" && status === "PAID" && hasPayment && !hasOrder ? "confirmation" : screen;
}
