import { randomUUID } from "node:crypto";

export type DemoTicketType = "inteira" | "meia";

export type DemoSeat = {
  id: string;
  row: string;
  number: number;
  ticketType: DemoTicketType;
};

export type DemoOrderInput = {
  buyer: { name: string; email: string; document: string };
  payment: "pix" | "card";
  cinema: { name: string; city: string; state: string; uf: string };
  session: { id: string; date: string; dateLabel: string; time: string; language: string; format: "2D" | "3D" | "IMAX"; room: string; price: number };
  seats: DemoSeat[];
};

export const halfPrice = 19.95;

export function calculateDemoOrderTotal(sessionPrice: number, seats: DemoSeat[]) {
  return Number(seats.reduce((total, seat) => total + (seat.ticketType === "meia" ? halfPrice : sessionPrice), 0).toFixed(2));
}

export function validateDemoSeats(seats: DemoSeat[]) {
  if (seats.length === 0) throw new Error("Selecione ao menos um assento.");
  if (seats.length > 8) throw new Error("É permitido selecionar no máximo 8 assentos por pedido.");
  const ids = seats.map((seat) => seat.id);
  if (new Set(ids).size !== ids.length) throw new Error("O pedido contém assentos duplicados.");
  return true;
}

export function createDemoOrder(input: DemoOrderInput) {
  validateDemoSeats(input.seats);
  const suffix = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return {
    code: `DD-DEMO-${suffix}`,
    createdAt: new Date().toISOString(),
    buyer: input.buyer,
    payment: input.payment,
    cinema: input.cinema,
    session: input.session,
    seats: input.seats,
    total: calculateDemoOrderTotal(input.session.price, input.seats),
    qrPayload: `https://presale.doomsday.example/ticket/DD-DEMO-${suffix}`,
    mode: "demo" as const,
  };
}


export function sendDemoConfirmationEmail(input: { orderCode: string; email: string }) {
  return {
    accepted: true as const,
    messageId: `DEMO-MAIL-${randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase()}`,
    to: input.email,
    orderCode: input.orderCode,
    sentAt: new Date().toISOString(),
    mode: "demo" as const,
  };
}
