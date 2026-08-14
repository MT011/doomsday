import { z } from "zod";
import { randomUUID } from "node:crypto";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { createDemoOrder, sendDemoConfirmationEmail } from "./presale";
import { buildWebhookUrl, createAmploPayIdentifier, createAmploPayPixCharge } from "./amplopay";
import { createAmploPayPixPayment, getAmploPayPixPaymentByOrderCode, updateAmploPayPixPayment } from "./db";

const demoSeatSchema = z.object({
  id: z.string().min(1),
  row: z.string().min(1),
  number: z.number().int().positive(),
  ticketType: z.enum(["inteira", "meia"]),
});

const demoOrderSchema = z.object({
  buyer: z.object({
    name: z.string().trim().min(3),
    email: z.string().email(),
    document: z.string().trim().min(5),
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
  seats: z.array(demoSeatSchema).min(1).max(8),
});

const pixOrderSchema = demoOrderSchema.omit({ payment: true });
const WHOLE_TICKET_PRICE = 51.28;
const HALF_TICKET_PRICE = 25.64;

function getPublicOrigin(req: { protocol: string; get(name: string): string | undefined; headers: { origin?: string | string[]; "x-forwarded-proto"?: string | string[] } }) {
  const host = req.get("host");
  if (!host || /[\s/\\]/.test(host)) throw new Error("Não foi possível determinar a URL pública do site para receber a confirmação PIX.");
  const forwardedProtocol = req.headers["x-forwarded-proto"];
  const protocol = typeof forwardedProtocol === "string" ? forwardedProtocol.split(",")[0] : req.protocol;
  const normalizedProtocol = protocol === "https" ? "https" : "http";
  const calculatedOrigin = `${normalizedProtocol}://${host}`;
  if (typeof req.headers.origin === "string" && req.headers.origin !== calculatedOrigin) throw new Error("A origem do checkout não corresponde ao domínio público configurado.");
  return calculatedOrigin;
}

function calculateOrderAmount(seats: Array<{ ticketType: "inteira" | "meia" }>) {
  return Number(seats.reduce((total, seat) => total + (seat.ticketType === "meia" ? HALF_TICKET_PRICE : WHOLE_TICKET_PRICE), 0).toFixed(2));
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  presale: router({
    createDemoOrder: publicProcedure.input(demoOrderSchema).mutation(({ input }) => createDemoOrder(input)),
    sendDemoConfirmationEmail: publicProcedure
      .input(z.object({ orderCode: z.string().min(1), email: z.string().email() }))
      .mutation(({ input }) => sendDemoConfirmationEmail(input)),
    createPixPayment: publicProcedure.input(pixOrderSchema).mutation(async ({ input, ctx }) => {
      const amount = calculateOrderAmount(input.seats);
      const orderCode = `DD-PIX-${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`;
      const identifier = createAmploPayIdentifier(orderCode);
      const callbackUrl = buildWebhookUrl(getPublicOrigin(ctx.req));
      const dueDate = new Date().toISOString().slice(0, 10);

      await createAmploPayPixPayment({
        orderCode,
        identifier,
        status: "PENDING",
        amountCents: Math.round(amount * 100),
        buyerName: input.buyer.name,
        buyerEmail: input.buyer.email,
        buyerDocument: input.buyer.document,
        cinema: input.cinema,
        session: input.session,
        seats: input.seats,
      });

      try {
        const charge = await createAmploPayPixCharge({
          identifier,
          amount,
          buyer: input.buyer,
          products: input.seats.map((seat) => ({
            id: `${input.session.id}-${seat.id}`,
            name: `Avengers: Doomsday — ${seat.ticketType === "meia" ? "Meia-entrada" : "Inteira"} — Assento ${seat.row}${seat.number}`,
            quantity: 1,
            price: seat.ticketType === "meia" ? HALF_TICKET_PRICE : WHOLE_TICKET_PRICE,
          })),
          dueDate,
          callbackUrl,
          metadata: { orderCode, cinema: input.cinema.name, sessionId: input.session.id },
        });
        await updateAmploPayPixPayment(orderCode, {
          transactionId: charge.transactionId,
          status: charge.status,
          pixCode: charge.pixCode,
          pixImageUrl: charge.pixImageUrl,
          webhookToken: charge.webhookToken,
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

export type AppRouter = typeof appRouter;
