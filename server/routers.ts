import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { createDemoOrder, sendDemoConfirmationEmail } from "./presale";

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
  }),
});

export type AppRouter = typeof appRouter;
