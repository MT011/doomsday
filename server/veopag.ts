import { createHmac, timingSafeEqual } from "node:crypto";

export const VEOPAG_API_BASE_URL = "https://api.veopag.com";

export type VeoPagPaymentStatus = "PENDING" | "PAID" | "FAILED" | "REJECTED" | "CANCELED" | "REFUNDED" | "CHARGED_BACK";

type ProviderResponse = Record<string, unknown>;

type VeoPagBuyer = {
  name: string;
  email: string;
  document: string;
  phone?: string;
};

export type VeoPagPixCharge = {
  transactionId: string;
  status: VeoPagPaymentStatus;
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
    current = (current as ProviderResponse)[key];
  }
  return readString(current);
}

export function normalizeVeoPagPixImage(value: unknown) {
  const raw = readString(value);
  if (!raw) return null;
  if (/^data:image\/[a-z0-9.+-]+;base64,/i.test(raw)) return raw;
  if (/^(?:https?:\/\/|\/)/i.test(raw)) return raw;
  const compact = raw.replace(/\s+/g, "");
  if (compact.length > 100 && /^[A-Za-z0-9+/=]+$/.test(compact)) return `data:image/png;base64,${compact}`;
  return null;
}

function getVeoPagCredentials() {
  const clientId = process.env.VEOPAG_CLIENT_ID;
  const clientSecret = process.env.VEOPAG_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("As credenciais da VeoPag não estão configuradas no servidor.");
  return { clientId, clientSecret };
}

function safeProviderText(value: unknown) {
  if (typeof value === "string") return value.trim().slice(0, 180);
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string").map(item => item.trim()).filter(Boolean).join(" ").slice(0, 180) || undefined;
  return undefined;
}

export function safeVeoPagValidationMessage(payload: ProviderResponse) {
  const message = safeProviderText(payload.message) ?? safeProviderText(payload.error_message) ?? safeProviderText(payload.error);
  if (message && !/secret|token|credential|authorization/i.test(message)) return `A VeoPag recusou a cobrança: ${message}`;
  return "A VeoPag recusou a cobrança. Verifique os dados do comprador e tente novamente.";
}

export function normalizeVeoPagStatus(status: unknown): VeoPagPaymentStatus {
  switch (String(status ?? "").toUpperCase().replace(/[- ]/g, "_")) {
    case "COMPLETED":
    case "PAID":
    case "APPROVED":
    case "PAYMENT_RECEIVED":
      return "PAID";
    case "FAILED":
    case "ERROR":
      return "FAILED";
    case "REJECTED":
    case "REFUSED":
      return "REJECTED";
    case "CANCELED":
    case "CANCELLED":
    case "EXPIRED":
      return "CANCELED";
    case "REFUNDED":
      return "REFUNDED";
    case "CHARGED_BACK":
    case "CHARGEBACK":
      return "CHARGED_BACK";
    default:
      return "PENDING";
  }
}

export function normalizeVeoPagDocument(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11 && digits.length !== 14) throw new Error("Informe um CPF ou CNPJ válido para gerar o PIX.");
  return digits;
}

export function normalizeVeoPagPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return digits;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) return digits.slice(2);
  throw new Error("Informe um celular válido com DDD para gerar o PIX.");
}

export function buildVeoPagWebhookUrl(origin: string) {
  const normalizedOrigin = origin.replace(/\/$/, "");
  if (!/^https:\/\//i.test(normalizedOrigin)) throw new Error("A URL pública HTTPS é necessária para receber confirmações PIX.");
  return `${normalizedOrigin}/api/veopag/webhook`;
}

export function isVeoPagSignatureValid(secret: string | undefined, timestamp: string | undefined, rawBody: string, received: string | undefined, nowSeconds = Math.floor(Date.now() / 1000)) {
  if (!secret || !timestamp || !received || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

async function getVeoPagAccessToken() {
  const now = Date.now();
  if (accessTokenCache && accessTokenCache.expiresAt > now + 60_000) return accessTokenCache.token;
  const { clientId, clientSecret } = getVeoPagCredentials();
  const response = await fetch(`${VEOPAG_API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  });
  const payload = await response.json().catch(() => ({})) as ProviderResponse;
  if (!response.ok) throw new Error(safeVeoPagValidationMessage(payload));
  const token = readString(payload.token);
  if (!token) throw new Error("A VeoPag não retornou um token de acesso válido.");
  accessTokenCache = { token, expiresAt: now + 55 * 60 * 1000 };
  return token;
}

export async function createVeoPagPixCharge(input: {
  amount: number;
  externalId: string;
  callbackUrl: string;
  buyer: VeoPagBuyer;
  metadata?: Record<string, string>;
}): Promise<VeoPagPixCharge> {
  if (process.env.VEOPAG_PIX_ENABLED !== "true") throw new Error("O PIX VeoPag ainda não está habilitado no servidor.");
  const token = await getVeoPagAccessToken();
  const response = await fetch(`${VEOPAG_API_BASE_URL}/api/payments/deposit`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      amount: Number(input.amount.toFixed(2)),
      external_id: input.externalId,
      clientCallbackUrl: input.callbackUrl,
      payer: {
        name: input.buyer.name,
        email: input.buyer.email,
        document: normalizeVeoPagDocument(input.buyer.document),
        ...(input.buyer.phone ? { phone: normalizeVeoPagPhone(input.buyer.phone) } : {}),
      },
      ...(input.metadata ? { platform: "DOOMSDAY", utm_content: input.metadata.orderCode } : {}),
    }),
  });
  const payload = await response.json().catch(() => ({})) as ProviderResponse;
  if (!response.ok) throw new Error(safeVeoPagValidationMessage(payload));
  const qr = payload.qrCodeResponse && typeof payload.qrCodeResponse === "object" ? payload.qrCodeResponse as ProviderResponse : payload;
  const data = payload.data && typeof payload.data === "object" ? payload.data as ProviderResponse : undefined;
  const dataQr = data?.qrCodeResponse && typeof data.qrCodeResponse === "object" ? data.qrCodeResponse as ProviderResponse : data;
  const transactionId = readString(qr.transactionId) ?? readString(dataQr?.transactionId) ?? readString(payload.transaction_id) ?? readString(payload.transactionId) ?? readString(payload.id) ?? readString(data?.transaction_id) ?? readString(data?.transactionId) ?? readString(data?.id);
  const pixCode = readString(qr.qrcode) ?? readString(qr.qrCode) ?? readString(qr.qr_code) ?? readString(qr.copyPaste) ?? readString(dataQr?.qrcode) ?? readString(dataQr?.qrCode) ?? readString(dataQr?.qr_code) ?? readString(payload.qrcode) ?? readString(payload.qrCode) ?? readString(payload.qr_code) ?? readString(payload.pixCode) ?? readString(data?.qrcode) ?? readString(data?.qrCode) ?? readString(data?.qr_code) ?? readString(data?.pixCode);
  const pixImageUrl = normalizeVeoPagPixImage(
    readString(qr.qrcodeBase64) ?? readString(qr.qrCodeBase64) ?? readString(dataQr?.qrcodeBase64) ?? readString(dataQr?.qrCodeBase64) ?? readString(payload.qrcodeBase64) ?? readString(payload.qrCodeBase64) ?? readString(data?.qrcodeBase64) ?? readString(data?.qrCodeBase64),
  );
  const returnedAmount = readNumber(qr.amount) ?? readNumber(dataQr?.amount) ?? readNumber(payload.amount) ?? readNumber(data?.amount);
  if (!transactionId || !pixCode || returnedAmount === undefined) throw new Error("A resposta da VeoPag não trouxe os dados necessários para confirmar a cobrança PIX com segurança.");
  if (Math.round(returnedAmount * 100) !== Math.round(input.amount * 100)) throw new Error("A VeoPag retornou um valor diferente do total calculado para o pedido.");
  return { transactionId, status: normalizeVeoPagStatus(qr.status ?? payload.status), pixCode, pixImageUrl, providerPayload: payload };
}

export function getVeoPagWebhookOrderCode(payload: ProviderResponse) {
  return readString(payload.external_id) ?? readString(payload.externalId);
}

export function getVeoPagWebhookTransactionId(payload: ProviderResponse) {
  return readString(payload.transaction_id) ?? readString(payload.transactionId);
}

export function getVeoPagWebhookAmount(payload: ProviderResponse) {
  return readNumber(payload.amount);
}

export function getVeoPagWebhookStatus(payload: ProviderResponse) {
  return normalizeVeoPagStatus(payload.status);
}

export function clearVeoPagTokenCacheForTests() {
  accessTokenCache = null;
}
