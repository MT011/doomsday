import { describe, expect, it } from "vitest";
import { calculateDemoOrderTotal, createDemoOrder, sendDemoConfirmationEmail, validateDemoSeats } from "./presale";

const session = {
  id: "session-1",
  date: "2026-12-18",
  dateLabel: "18 DEZ",
  time: "21:25",
  language: "Legendado",
  format: "IMAX" as const,
  room: "Sala 4",
  price: 44.9,
};

const seats = [
  { id: "A-1", row: "A", number: 1, ticketType: "inteira" as const },
  { id: "A-2", row: "A", number: 2, ticketType: "meia" as const },
];

describe("presale rules", () => {
  it("calculates whole and half-price tickets", () => {
    expect(calculateDemoOrderTotal(session.price, seats)).toBe(64.85);
  });

  it("rejects duplicate seats", () => {
    expect(() => validateDemoSeats([seats[0], seats[0]])).toThrow("assentos duplicados");
  });

  it("rejects orders with more than eight tickets", () => {
    const nineSeats = Array.from({ length: 9 }, (_, index) => ({ id: `B-${index + 1}`, row: "B", number: index + 1, ticketType: "inteira" as const }));
    expect(() => validateDemoSeats(nineSeats)).toThrow("máximo 8 assentos");
  });

  it("returns a traceable demo email confirmation", () => {
    const result = sendDemoConfirmationEmail({ orderCode: "DD-DEMO-12345678", email: "maria@example.com" });
    expect(result.accepted).toBe(true);
    expect(result.to).toBe("maria@example.com");
    expect(result.orderCode).toBe("DD-DEMO-12345678");
    expect(result.messageId).toMatch(/^DEMO-MAIL-[A-Z0-9]{10}$/);
  });

  it("creates a demo order with a unique code and QR payload", () => {
    const order = createDemoOrder({
      buyer: { name: "Maria da Silva", email: "maria@example.com", document: "12345678900" },
      payment: "pix",
      cinema: { name: "Cine Araújo Rio Branco", city: "Rio Branco", state: "Acre", uf: "AC" },
      session,
      seats,
    });

    expect(order.code).toMatch(/^DD-DEMO-[A-Z0-9]{8}$/);
    expect(order.qrPayload).toContain(order.code);
    expect(order.total).toBe(64.85);
    expect(order.mode).toBe("demo");
  });
});
