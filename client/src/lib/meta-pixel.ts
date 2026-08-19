export const META_PIXEL_ID = "3311339612363930";

export type MetaPixelEvent = "ViewContent" | "AddToCart" | "InitiateCheckout" | "AddPaymentInfo" | "Purchase";

export type MetaPixelEventParameters = {
  content_ids: string[];
  content_name: string;
  content_type: "product";
  currency: "BRL";
  num_items?: number;
  value: number;
};

declare global {
  interface Window {
    fbq?: (action: "track", event: MetaPixelEvent, parameters: MetaPixelEventParameters) => void;
  }
}

/**
 * Dispara somente eventos comerciais agregados. Dados identificáveis do comprador
 * (nome, e-mail, CPF, telefone, código PIX) nunca são enviados ao Meta Pixel.
 */
export function trackMetaPixel(event: MetaPixelEvent, parameters: MetaPixelEventParameters) {
  if (typeof window === "undefined" || typeof window.fbq !== "function") return false;
  window.fbq("track", event, parameters);
  return true;
}

export function getTicketEventParameters({ value, quantity, sessionId }: { value: number; quantity: number; sessionId?: string }): MetaPixelEventParameters {
  return {
    content_ids: [sessionId || "avengers-doomsday-presale"],
    content_name: "Avengers: Doomsday — Pré-venda",
    content_type: "product",
    currency: "BRL",
    num_items: quantity,
    value: Number(value.toFixed(2)),
  };
}
