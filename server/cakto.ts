import { randomUUID, timingSafeEqual } from "node:crypto";

export const CAKTO_API_BASE_URL = "https://api.cakto.com.br/public_api";

export type CaktoPaymentStatus = "PENDING" | "PAID" | "FAILED" | "REJECTED" | "CANCELED" | "REFUNDED" | "CHARGED_BACK";

type ProviderResponse = Record<string, unknown>;

type CaktoBuyer = {
  name: string;
  email: string;
  document: string;
  phone: string;
};

export type CaktoOffer = {
  id: string;
  name: string;
  priceCents: number;
  providerPayload: ProviderResponse;
};

export type CaktoPixCharge = {
  transactionId: string;
  status: CaktoPaymentStatus;
  pixCode: string;
  pixImageUrl: string | null;
  providerPayload: ProviderResponse;
};

let accessTokenCache: { token: string; expiresAt: number } | null = null;

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

function readNestedString(value: unknown, path: string[]): string | undefined {
  let current: unknown = value;
  for (const key of path) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return readString(current);
}

function getCaktoCredentials() {
  const clientId = process.env.CAKTO_API_CLIENT_ID;
  const clientSecret = process.env.CAKTO_API_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("As credenciais da Cakto não estão configuradas no servidor.");
  }
  return { clientId, clientSecret };
}

export function safeCaktoValidationMessage(payload: ProviderResponse) {
  const detail = readString(payload.detail);
  if (detail && !/secret|token|credential|authorization/i.test(detail)) return detail.slice(0, 240);
  const fields = Object.keys(payload)
    .filter((field) => /^[a-zA-Z][a-zA-Z0-9_.-]{0,63}$/.test(field))
    .filter((field) => field !== "detail")
    .filter((field) => !/secret|token|credential|authorization/i.test(field))
    .slice(0, 5);
  return fields.length
    ? `Dados da cobrança Cakto inválidos nos campos: ${fields.join(", ")}.`
    : "A Cakto recusou a cobrança. Verifique os dados do comprador e tente novamente.";
}

export function normalizeCaktoStatus(status: unknown, event?: unknown): CaktoPaymentStatus {
  const value = String(event ?? status ?? "").toUpperCase().replace(/[- ]/g, "_");
  if (["PURCHASE_APPROVED", "PAID", "APPROVED", "PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"].includes(value)) return "PAID";
  if (["PURCHASE_REFUSED", "REFUSED", "REJECTED", "PAYMENT_REFUSED"].includes(value)) return "REJECTED";
  if (["REFUND", "REFUNDED", "PAYMENT_REFUNDED"].includes(value)) return "REFUNDED";
  if (["CHARGEBACK", "CHARGED_BACK"].includes(value)) return "CHARGED_BACK";
  if (["EXPIRED", "PIX_EXPIRED", "CANCELED", "CANCELLED", "CANCEL"].includes(value)) return "CANCELED";
  if (["FAILED", "ERROR"].includes(value)) return "FAILED";
  return "PENDING";
}

export function normalizeCaktoPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.length === 12 || digits.length === 13) return digits.startsWith("55") ? digits : `55${digits}`;
  throw new Error("Informe um celular válido com DDD para gerar o PIX.");
}

export function normalizeCaktoDocument(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11 && digits.length !== 14) throw new Error("Informe um CPF ou CNPJ válido para gerar o PIX.");
  return digits;
}

export function buildCaktoWebhookUrl(origin: string) {
  const normalizedOrigin = origin.replace(/\/$/, "");
  if (!/^https:\/\//i.test(normalizedOrigin)) throw new Error("A URL pública HTTPS é necessária para receber confirmações PIX.");
  return `${normalizedOrigin}/api/cakto/webhook`;
}

export function createCaktoIdempotencyKey(orderCode: string) {
  return `dd-${orderCode.toLowerCase()}-${randomUUID()}`.slice(0, 255);
}

export function createCaktoOfferName(amountCents: number) {
  return `Avengers: Doomsday — Ingresso(s) — ${amountCents}`;
}

export function isCaktoSecretMatch(expected: string | undefined, received: unknown) {
  if (!expected || typeof received !== "string") return false;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

async function getCaktoAccessToken() {
  const now = Date.now();
  if (accessTokenCache && accessTokenCache.expiresAt > now + 60_000) return accessTokenCache.token;

  const { clientId, clientSecret } = getCaktoCredentials();
  const body = new URLSearchParams({ client_id: clientId, client_secret: clientSecret });
  const response = await fetch(`${CAKTO_API_BASE_URL}/token/`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = await response.json().catch(() => ({})) as ProviderResponse;
  if (!response.ok) throw new Error(safeCaktoValidationMessage(payload));

  const token = readString(payload.access_token);
  const expiresIn = readNumber(payload.expires_in) ?? 36_000;
  if (!token) throw new Error("A Cakto não retornou um token de acesso válido.");
  accessTokenCache = { token, expiresAt: now + expiresIn * 1000 };
  return token;
}

async function caktoRequest(path: string, init: RequestInit = {}) {
  const token = await getCaktoAccessToken();
  const response = await fetch(`${CAKTO_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({})) as ProviderResponse;
  if (!response.ok) throw new Error(safeCaktoValidationMessage(payload));
  return payload;
}

export async function createCaktoOffer(input: { productId: string; amountCents: number; name?: string }): Promise<CaktoOffer> {
  if (!input.productId.trim()) throw new Error("O produto Cakto não está configurado no servidor.");
  const payload = await caktoRequest("/offers/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: input.name ?? createCaktoOfferName(input.amountCents),
      price: Number((input.amountCents / 100).toFixed(2)),
      product: input.productId,
    }),
  });
  const id = readString(payload.id);
  const price = readNumber(payload.price);
  if (!id || price === undefined) throw new Error("A Cakto não retornou uma oferta utilizável.");
  const priceCents = Math.round(price * 100);
  if (priceCents !== input.amountCents) throw new Error("A oferta Cakto retornou um valor diferente do total do pedido.");
  return { id, name: readString(payload.name) ?? createCaktoOfferName(input.amountCents), priceCents, providerPayload: payload };
}

export async function createCaktoPixCharge(input: {
  orderCode: string;
  idempotencyKey: string;
  offerId: string;
  amountCents: number;
  buyer: CaktoBuyer;
  fingerprint: string;
  metadata: Record<string, string>;
  pixExpiresIn?: number;
}): Promise<CaktoPixCharge> {
  const payload = await caktoRequest("/payments/", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      paymentMethod: "pix",
      customer: {
        name: input.buyer.name,
        email: input.buyer.email,
        phone: normalizeCaktoPhone(input.buyer.phone),
        fingerprint: input.fingerprint,
        docType: input.buyer.document.replace(/\D/g, "").length === 14 ? "cnpj" : "cpf",
        docNumber: normalizeCaktoDocument(input.buyer.document),
      },
      items: [{ offerId: input.offerId, quantity: 1, offerType: "main" }],
      pixExpiresIn: input.pixExpiresIn ?? 3600,
      metadata: input.metadata,
    }),
  });

  const transactionId = readString(payload.id) ?? readString(payload.externalId);
  const pixCode = readNestedString(payload, ["pix", "qrCode"]);
  const pixImageUrl = readNestedString(payload, ["pix", "qrCodeBase64"]) ?? null;
  const status = normalizeCaktoStatus(payload.status);
  const returnedAmount = readNumber(payload.amount);
  if (!transactionId || !pixCode || returnedAmount === undefined) {
    throw new Error("A resposta da Cakto não trouxe os dados necessários para confirmar a cobrança PIX com segurança.");
  }
  if (Math.round(returnedAmount * 100) !== input.amountCents) {
    throw new Error("A Cakto retornou um valor diferente do total calculado para o pedido.");
  }
  return { transactionId, status, pixCode, pixImageUrl, providerPayload: payload };
}

export function getCaktoWebhookEvent(payload: ProviderResponse) {
  return readString(payload.event) ?? "unknown";
}

export function getCaktoWebhookData(payload: ProviderResponse) {
  const rawData = payload.data;
  if (Array.isArray(rawData)) {
    const firstObject = rawData.find((item) => item && typeof item === "object" && !Array.isArray(item));
    return firstObject ? firstObject as ProviderResponse : {};
  }
  return rawData && typeof rawData === "object" ? rawData as ProviderResponse : {};
}

export function getCaktoWebhookTransactionId(payload: ProviderResponse) {
  const data = getCaktoWebhookData(payload);
  return readString(data.id) ?? readString(data.externalId) ?? readString(data.refId);
}

export function getCaktoWebhookOrderCode(payload: ProviderResponse) {
  const data = getCaktoWebhookData(payload);
  const metadata = data.metadata;
  if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
    return readString((metadata as ProviderResponse).orderCode);
  }
  return undefined;
}
