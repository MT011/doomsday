export type MetaPurchaseInput = {
  orderCode: string;
  value: number;
  itemCount: number;
};

type MetaPixelFunction = (
  action: "track",
  eventName: "Purchase",
  parameters: Record<string, string | number | string[]>,
  options?: { eventID: string },
) => void;

export function getMetaPurchaseParameters({ orderCode, value, itemCount }: MetaPurchaseInput) {
  return {
    content_ids: [orderCode],
    content_type: "product",
    currency: "BRL",
    num_items: itemCount,
    value: Number(value.toFixed(2)),
  };
}

export function trackMetaPurchase(input: MetaPurchaseInput) {
  if (typeof window === "undefined" || !Number.isFinite(input.value) || input.value <= 0) return false;

  const pixel = (window as Window & { fbq?: MetaPixelFunction }).fbq;
  if (typeof pixel !== "function") return false;

  pixel("track", "Purchase", getMetaPurchaseParameters(input), {
    eventID: `purchase_${input.orderCode}`,
  });
  return true;
}
