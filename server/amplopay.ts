import { createHash, randomUUID, timingSafeEqual } from "node:crypto";

export const AMPLOPAY_API_BASE_URL = "https://app.amplopay.com/api/v1";

export type AmploPayPaymentStatus = "PENDING" | "PAID" | "FAILED" | "REJECTED" | "CANCELED" | "REFUNDED" | "CHARGED_BACK";

export type AmploPayPixChargeInput = {
  identifier: string;
  amount: number;
  buyer: { name: string; email: string; document: string; phone?: string };
  products: Array<{ id: string; name: string; quantity: number; price: number }>;
  dueDate: string;
  callbackUrl: string;
  metadata: Record<string, string>;
};

export type AmploPayPixCharge = {
  transactionId: string;
  status: AmploPayPaymentStatus;
  pixCode: string;
  pixImageUrl: string | null;
  webhookToken: string;
  providerPayload: Record<string, unknown>;
};

type ProviderResponse = Record<string, unknown>;

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function readNestedString(value: unknown, path: string[]): string | undefined {
  let current: unknown = value;
  for (const key of path) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return readString(current);
}

export function safeProviderValidationMessage(payload: ProviderResponse) {
  const details = payload.details;
  if (details && typeof details === "object" && !Array.isArray(details)) {
    const fields = Object.keys(details as Record<string, unknown>)
      .filter((field) => /^[a-zA-Z][a-zA-Z0-9_.-]{0,63}$/.test(field))
      .slice(0, 5);
    if (fields.length) return `Dados da cobrança inválidos nos campos: ${fields.join(", ")}.`;
  }
  return "Dados da cobrança inválidos. Verifique nome, CPF, celular e tente novamente.";
}

function getAmploPayCredentials() {
  const publicKey = process.env.AMPLOPAY_PUBLIC_KEY;
  const secretKey = process.env.AMPLOPAY_SECRET_KEY;
  if (!publicKey || !secretKey) throw new Error("As credenciais da AmploPay não estão configuradas no servidor.");
  return { publicKey, secretKey };
}

export function normalizeAmploPayStatus(status: unknown): AmploPayPaymentStatus {
  switch (String(status ?? "").toUpperCase()) {
    case "PAID":
    case "COMPLETED":
    case "TRANSACTION_PAID":
      return "PAID";
    case "FAILED":
      return "FAILED";
    case "REJECTED":
      return "REJECTED";
    case "CANCELED":
    case "CANCELLED":
    case "TRANSACTION_CANCELED":
      return "CANCELED";
    case "REFUNDED":
    case "TRANSACTION_REFUNDED":
      return "REFUNDED";
    case "CHARGED_BACK":
    case "TRANSACTION_CHARGED_BACK":
      return "CHARGED_BACK";
    default:
      return "PENDING";
  }
}

export function createAmploPayIdentifier(orderCode: string) {
  const entropy = randomUUID().replace(/-/g, "").slice(0, 12);
  return `dd-${orderCode.toLowerCase()}-${entropy}`.slice(0, 96);
}

export function formatBrazilCpf(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11) throw new Error("Informe um CPF com 11 dígitos para gerar o PIX.");
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatBrazilPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 10 && digits.length !== 11) throw new Error("Informe um celular válido com DDD para gerar o PIX.");
  const areaCode = digits.slice(0, 2);
  const localNumber = digits.slice(2);
  const divider = localNumber.length === 9 ? 5 : 4;
  return `(${areaCode}) ${localNumber.slice(0, divider)}-${localNumber.slice(divider)}`;
}

export function buildWebhookUrl(origin: string) {
  const normalizedOrigin = origin.replace(/\/$/, "");
  if (!/^https:\/\//i.test(normalizedOrigin)) throw new Error("A URL pública HTTPS é necessária para receber confirmações PIX.");
  return `${normalizedOrigin}/api/amplopay/webhook`;
}

export function isSecureTokenMatch(expected: string | null | undefined, candidate: unknown) {
  if (!expected || typeof candidate !== "string") return false;
  const expectedBuffer = Buffer.from(expected);
  const candidateBuffer = Buffer.from(candidate);
  return expectedBuffer.length === candidateBuffer.length && timingSafeEqual(expectedBuffer, candidateBuffer);
}

export function payloadFingerprint(payload: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export async function validateAmploPayCredentials() {
  const { publicKey, secretKey } = getAmploPayCredentials();
  const response = await fetch(`${AMPLOPAY_API_BASE_URL}/gateway/producer/credentials`, {
    headers: { "x-public-key": publicKey, "x-secret-key": secretKey },
  });
  if (!response.ok) throw new Error("A AmploPay recusou as credenciais configuradas.");
  return response.json() as Promise<{ name: string; permissions: string[]; grantAllPermissions: boolean; expiresAt: string | null }>;
}

export async function createAmploPayPixCharge(input: AmploPayPixChargeInput): Promise<AmploPayPixCharge> {
  if (process.env.AMPLOPAY_PIX_ENABLED !== "true") {
    throw new Error("O PIX AmploPay está configurado, mas aguarda a ativação após o cadastro do webhook.");
  }
  const { publicKey, secretKey } = getAmploPayCredentials();
  const response = await fetch(`${AMPLOPAY_API_BASE_URL}/gateway/pix/receive`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-public-key": publicKey,
      "x-secret-key": secretKey,
    },
    body: JSON.stringify({
      identifier: input.identifier,
      amount: input.amount,
      client: {
        name: input.buyer.name,
        email: input.buyer.email,
        document: input.buyer.document,
        ...(input.buyer.phone ? { phone: input.buyer.phone } : {}),
      },
      products: input.products,
      dueDate: input.dueDate,
      metadata: input.metadata,
      callbackUrl: input.callbackUrl,
    }),
  });

  const payload = await response.json().catch(() => ({})) as ProviderResponse;
  if (!response.ok) {
    throw new Error(safeProviderValidationMessage(payload));
  }

  const transactionId = readString(payload.transactionId) ?? readString(payload.id);
  const pixCode = readNestedString(payload, ["pix", "code"]) ?? readNestedString(payload, ["pixInformation", "qrCode"]);
  const pixImageUrl = readNestedString(payload, ["pix", "image"]) ?? readNestedString(payload, ["pixInformation", "image"]) ?? null;
  const webhookToken = readString(payload.token) ?? readString(payload.webhookToken);
  if (!transactionId || !pixCode || !webhookToken) {
    throw new Error("A resposta da AmploPay não trouxe os dados necessários para confirmar a cobrança PIX com segurança.");
  }

  return {
    transactionId,
    status: normalizeAmploPayStatus(payload.status),
    pixCode,
    pixImageUrl,
    webhookToken,
    providerPayload: payload,
  };
}
