import { z } from "zod";
import { randomUUID } from "node:crypto";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { createDemoOrder, sendDemoConfirmationEmail } from "./presale";
import { buildWebhookUrl, createAmploPayIdentifier, createAmploPayPixCharge, formatBrazilCpf, formatBrazilPhone } from "./amplopay";
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
  seats: z.array(demoSeatSchema).min(1).max(8),
});

const pixOrderSchema = demoOrderSchema.omit({ payment: true });
const WHOLE_TICKET_PRICE = 51.28;
const HALF_TICKET_PRICE = 25.64;

export function getPublicOrigin(req: { headers: { origin?: string | string[] } }) {
  const configuredOrigin = process.env.AMPLOPAY_CALLBACK_ORIGIN;
  if (!configuredOrigin) throw new Error("A origem HTTPS pública do callback PIX não está configurada.");

  let configuredUrl: URL;
  try {
    configuredUrl = new URL(configuredOrigin);
  } catch {
    throw new Error("A origem pública configurada para o callback PIX é inválida.");
  }
  if (configuredUrl.protocol !== "https:" || configuredUrl.pathname !== "/" || configuredUrl.search || configuredUrl.hash) {
    throw new Error("A origem pública configurada para o callback PIX deve ser uma origem HTTPS simples.");
  }

  if (typeof req.headers.origin === "string") {
    try {
      if (new URL(req.headers.origin).origin !== configuredUrl.origin) {
        throw new Error("A origem do checkout não corresponde ao domínio público configurado.");
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("não corresponde")) throw error;
      throw new Error("A origem do checkout é inválida.");
    }
  }
  return configuredUrl.origin;
}

function calculateOrderAmount(seats: Array<{ ticketType: "inteira" | "meia" }>) {
  return Number(seats.reduce((total, seat) => total + (seat.ticketType === "meia" ? HALF_TICKET_PRICE : WHOLE_TICKET_PRICE), 0).toFixed(2));
}

export const appRouter = router({
  system: systemRouter,
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
      const dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const formattedBuyer = {
        ...input.buyer,
        document: formatBrazilCpf(input.buyer.document),
        phone: formatBrazilPhone(input.buyer.phone),
      };

      await createAmploPayPixPayment({
        orderCode,
        identifier,
        status: "PENDING",
        amountCents: Math.round(amount * 100),
        buyerName: formattedBuyer.name,
        buyerEmail: formattedBuyer.email,
        buyerDocument: formattedBuyer.document,
        cinema: input.cinema,
        session: input.session,
        seats: input.seats,
      });

      try {
        const charge = await createAmploPayPixCharge({
          identifier,
          amount,
          buyer: formattedBuyer,
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
