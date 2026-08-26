import { randomUUID } from "node:crypto";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";
import { buildCaktoWebhookUrl, createCaktoOffer, createCaktoPixCharge } from "./cakto.js";
import { buildVeoPagWebhookUrl, createVeoPagPixCharge } from "./veopag.js";
import { buildWebhookUrl, createAmploPayIdentifier, createAmploPayPixCharge, formatBrazilCpf, formatBrazilPhone } from "./amplopay.js";
import { createCaktoOfferRecord, createAmploPayPixPayment, getCaktoOfferByAmount, getAmploPayPixPaymentByOrderCode, updateAmploPayPixPayment } from "./db.js";
import { getPublicOrigin } from "./pix-origin.js";
import { createDemoOrder, sendDemoConfirmationEmail } from "./presale.js";

export type PublicApiContext = {
  req: any;
  res: any;
  user: {
    id: number;
    openId: string;
    name: string | null;
    email: string | null;
    loginMethod: string | null;
    role: string;
    createdAt: Date;
    updatedAt: Date;
    lastSignedIn: Date;
  } | null;
};

const t = initTRPC.context<PublicApiContext>().create({ transformer: superjson });
const router = t.router;
const publicProcedure = t.procedure;

const seatSchema = z.object({
  id: z.string().min(1),
  row: z.string().min(1),
  number: z.number().int().positive(),
  ticketType: z.enum(["inteira", "meia"]),
});

const orderSchema = z.object({
  buyer: z.object({
    name: z.string().trim().min(3),
    email: z.string().email(),
    document: z.string().trim().min(5),
    phone: z.string().trim().min(10).max(32),
  }),
  payment: z.enum(["pix", "card"]),
  cinema: z.object({ name: z.string(), city: z.string(), state: z.string(), uf: z.string() }),
  session: z.object({
    id: z.string(),
    date: z.string(),
    dateLabel: z.string(),
    time: z.string(),
    language: z.string(),
    format: z.enum(["2D", "3D", "IMAX"]),
    room: z.string(),
    price: z.number().positive(),
  }),
  seats: z.array(seatSchema).min(1).max(8),
});

const pixOrderSchema = orderSchema.omit({ payment: true }).extend({
  fingerprint: z.string().trim().min(1).max(255).optional(),
});
const WHOLE_TICKET_PRICE = 51.28;
const HALF_TICKET_PRICE = 25.64;

type PixReadinessEnvironment = Record<string, string | undefined>;

type PixProvider = "amplopay" | "cakto" | "veopag";

export function getPixProvider(env: PixReadinessEnvironment = process.env): PixProvider {
  const provider = env.PIX_PROVIDER?.trim().toLowerCase();
  return provider === "cakto" || provider === "veopag" ? provider : "amplopay";
}

export function getPixReadiness(env: PixReadinessEnvironment = process.env) {
  if (getPixProvider(env) === "cakto") {
    return {
      pixEnabled: env.CAKTO_PIX_ENABLED === "true",
      credentialsConfigured: Boolean(env.CAKTO_API_CLIENT_ID?.trim() && env.CAKTO_API_CLIENT_SECRET?.trim() && env.CAKTO_PRODUCT_ID?.trim()),
      callbackOriginConfigured: Boolean((env.PIX_CALLBACK_ORIGIN ?? env.CAKTO_CALLBACK_ORIGIN ?? env.AMPLOPAY_CALLBACK_ORIGIN)?.trim()),
    };
  }
  if (getPixProvider(env) === "veopag") {
    return {
      pixEnabled: env.VEOPAG_PIX_ENABLED === "true",
      credentialsConfigured: Boolean(env.VEOPAG_CLIENT_ID?.trim() && env.VEOPAG_CLIENT_SECRET?.trim()),
      callbackOriginConfigured: Boolean((env.PIX_CALLBACK_ORIGIN ?? env.VEOPAG_CALLBACK_ORIGIN ?? env.AMPLOPAY_CALLBACK_ORIGIN)?.trim()),
    };
  }
  return {
    pixEnabled: env.AMPLOPAY_PIX_ENABLED === "true",
    credentialsConfigured: Boolean(env.AMPLOPAY_PUBLIC_KEY?.trim() && env.AMPLOPAY_SECRET_KEY?.trim()),
    callbackOriginConfigured: Boolean(env.AMPLOPAY_CALLBACK_ORIGIN?.trim()),
  };
}

function calculateOrderAmount(seats: Array<{ ticketType: "inteira" | "meia" }>) {
  return Number(seats.reduce((total, seat) => total + (seat.ticketType === "meia" ? HALF_TICKET_PRICE : WHOLE_TICKET_PRICE), 0).toFixed(2));
}

export const publicApiRouter = router({
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    logout: publicProcedure.mutation(() => ({ success: true } as const)),
  }),
  presale: router({
    getPixReadiness: publicProcedure.query(() => getPixReadiness()),
    createDemoOrder: publicProcedure.input(orderSchema).mutation(({ input }) => createDemoOrder(input)),
    sendDemoConfirmationEmail: publicProcedure
      .input(z.object({ orderCode: z.string().min(1), email: z.string().email() }))
      .mutation(({ input }) => sendDemoConfirmationEmail(input)),
    createPixPayment: publicProcedure.input(pixOrderSchema).mutation(async ({ input, ctx }) => {
      const provider = getPixProvider();
      const amount = calculateOrderAmount(input.seats);
      const amountCents = Math.round(amount * 100);
      const orderCode = `DD-PIX-${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
      const identifier = createAmploPayIdentifier(orderCode);
      const publicOrigin = getPublicOrigin(ctx.req);
      const callbackUrl = provider === "cakto" ? buildCaktoWebhookUrl(publicOrigin) : provider === "veopag" ? buildVeoPagWebhookUrl(publicOrigin) : buildWebhookUrl(publicOrigin);
      const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const buyer = { ...input.buyer, document: formatBrazilCpf(input.buyer.document), phone: formatBrazilPhone(input.buyer.phone) };

      await createAmploPayPixPayment({
        orderCode,
        identifier,
        status: "PENDING",
        amountCents,
        buyerName: buyer.name,
        buyerEmail: buyer.email,
        buyerDocument: buyer.document,
        cinema: input.cinema,
        session: input.session,
        seats: input.seats,
      });

      try {
        const metadata = { orderCode, cinema: input.cinema.name, sessionId: input.session.id };
        const charge = provider === "cakto"
          ? await (async () => {
              if (!process.env.CAKTO_PIX_ENABLED || process.env.CAKTO_PIX_ENABLED !== "true") {
                throw new Error("O PIX Cakto está configurado, mas aguarda a ativação após o cadastro do webhook.");
              }
              if (!process.env.CAKTO_PRODUCT_ID?.trim()) throw new Error("O produto Cakto não está configurado no servidor.");
              if (!input.fingerprint) {
                throw new Error("O identificador da sessão do comprador é necessário para gerar o PIX.");
              }
              let offer = await getCaktoOfferByAmount(amountCents);
              if (!offer) {
                const createdOffer = await createCaktoOffer({ productId: process.env.CAKTO_PRODUCT_ID, amountCents });
                offer = await createCaktoOfferRecord({
                  amountCents,
                  offerId: createdOffer.id,
                  status: "ACTIVE",
                  providerPayload: createdOffer.providerPayload,
                });
              }
              if (!offer) throw new Error("Não foi possível registrar a oferta dinâmica Cakto.");
              return createCaktoPixCharge({
                orderCode,
                idempotencyKey: identifier,
                offerId: offer.offerId,
                amountCents,
                buyer: input.buyer,
                fingerprint: input.fingerprint,
                metadata,
                pixExpiresIn: 3600,
              });
            })()
          : provider === "veopag"
            ? await createVeoPagPixCharge({
                amount,
                externalId: orderCode,
                callbackUrl,
                buyer: input.buyer,
                metadata,
              })
            : await createAmploPayPixCharge({
              identifier,
              amount,
              buyer,
              products: input.seats.map(seat => ({
                id: `${input.session.id}-${seat.id}`,
                name: `Avengers: Doomsday — ${seat.ticketType === "meia" ? "Meia-entrada" : "Inteira"} — Assento ${seat.row}${seat.number}`,
                quantity: 1,
                price: seat.ticketType === "meia" ? HALF_TICKET_PRICE : WHOLE_TICKET_PRICE,
              })),
              dueDate,
              callbackUrl,
              metadata,
            });
        await updateAmploPayPixPayment(orderCode, {
          transactionId: charge.transactionId,
          status: charge.status,
          pixCode: charge.pixCode,
          pixImageUrl: charge.pixImageUrl,
          ...(provider === "amplopay" && "webhookToken" in charge && typeof charge.webhookToken === "string" ? { webhookToken: charge.webhookToken } : {}),
          providerPayload: charge.providerPayload,
        });
        return { orderCode, status: charge.status, amount, pixCode: charge.pixCode, pixImageUrl: charge.pixImageUrl };
      } catch (error) {
        await updateAmploPayPixPayment(orderCode, { status: "FAILED" });
        throw error;
      }
    }),
    getPixPaymentStatus: publicProcedure.input(z.object({ orderCode: z.string().min(1) })).query(async ({ input }) => {
      const payment = await getAmploPayPixPaymentByOrderCode(input.orderCode);
      if (!payment) throw new Error("Cobrança PIX não encontrada.");
      return { orderCode: payment.orderCode, status: payment.status, paidAt: payment.paidAt, updatedAt: payment.updatedAt };
    }),
  }),
});

export type AppRouter = typeof publicApiRouter;
