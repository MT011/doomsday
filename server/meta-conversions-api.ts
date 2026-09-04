import { createHash } from "node:crypto";

const DEFAULT_PIXEL_ID = "3311339612363930";
const DEFAULT_GRAPH_VERSION = "v23.0";
const DEFAULT_EVENT_SOURCE_URL = "https://www.prevendadoomsday.com.br/";

export type MetaPurchaseServerInput = {
  orderCode: string;
  amountCents: number;
  itemCount: number;
  buyerEmail?: string | null;
  buyerName?: string | null;
  paidAt?: Date | string | null;
  eventSourceUrl?: string;
};

type MetaEnvironment = Record<string, string | undefined>;

type MetaApiResponse = {
  events_received?: number;
  messages?: string[];
  error?: { message?: string; type?: string; code?: number };
};

export type MetaPurchaseResult =
  | { sent: true; eventId: string; eventsReceived?: number }
  | { sent: false; reason: "not_configured" | "invalid_input" | "api_error" };

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function hashMetaUserData(value: string | null | undefined) {
  const normalized = value ? normalize(value) : "";
  return normalized ? createHash("sha256").update(normalized).digest("hex") : undefined;
}

export function getMetaPurchaseEvent(input: MetaPurchaseServerInput, env: MetaEnvironment = process.env) {
  const amountCents = Math.round(input.amountCents);
  const eventId = `purchase_${input.orderCode}`;
  const paidAt = input.paidAt ? new Date(input.paidAt) : new Date();
  const eventTime = Math.floor(paidAt.getTime() / 1000);
  const userData: Record<string, string> = {};
  const email = hashMetaUserData(input.buyerEmail);
  const name = hashMetaUserData(input.buyerName);
  if (email) userData.em = email;
  if (name) userData.fn = name;
  userData.external_id = hashMetaUserData(input.orderCode) as string;

  return {
    event_name: "Purchase",
    event_time: Number.isFinite(eventTime) ? eventTime : Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    event_source_url: input.eventSourceUrl ?? env.META_EVENT_SOURCE_URL ?? DEFAULT_EVENT_SOURCE_URL,
    user_data: userData,
    custom_data: {
      currency: "BRL",
      value: Number((amountCents / 100).toFixed(2)),
      content_ids: [input.orderCode],
      content_type: "product",
      num_items: Math.max(1, Math.round(input.itemCount)),
    },
  };
}

function getConfig(env: MetaEnvironment) {
  return {
    accessToken: env.META_CONVERSIONS_API_ACCESS_TOKEN?.trim(),
    pixelId: env.META_PIXEL_ID?.trim() || DEFAULT_PIXEL_ID,
    graphVersion: env.META_GRAPH_API_VERSION?.trim() || DEFAULT_GRAPH_VERSION,
  };
}

export async function sendMetaPurchase(input: MetaPurchaseServerInput, env: MetaEnvironment = process.env): Promise<MetaPurchaseResult> {
  const config = getConfig(env);
  if (!config.accessToken) return { sent: false, reason: "not_configured" };
  if (!input.orderCode || !Number.isFinite(input.amountCents) || input.amountCents <= 0) {
    return { sent: false, reason: "invalid_input" };
  }

  const endpoint = `https://graph.facebook.com/${config.graphVersion}/${encodeURIComponent(config.pixelId)}/events`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [getMetaPurchaseEvent(input, env)], access_token: config.accessToken }),
  });
  const result = await response.json().catch(() => ({})) as MetaApiResponse;
  if (!response.ok || result.error) {
    console.warn("[Meta CAPI] Purchase não aceito pela API", { status: response.status, type: result.error?.type, code: result.error?.code });
    return { sent: false, reason: "api_error" };
  }

  return { sent: true, eventId: `purchase_${input.orderCode}`, eventsReceived: result.events_received };
}
