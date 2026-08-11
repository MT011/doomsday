export type SessionFormat = "2D" | "3D" | "IMAX";
export type PaymentMethod = "pix" | "card";

export type SessionQuery = {
  cinemaId: string;
  date: string;
};

export type OfficialSession = {
  id: string;
  cinemaId: string;
  date: string;
  time: string;
  language: string;
  format: SessionFormat;
  room: string;
  price: number;
};

export type SeatHoldRequest = {
  sessionId: string;
  seatIds: string[];
  customerReference: string;
  ttlSeconds: number;
};

export type SeatHold = {
  holdId: string;
  expiresAt: string;
  seatIds: string[];
};

export type PaymentRequest = {
  orderReference: string;
  amount: number;
  method: PaymentMethod;
  buyerEmail: string;
};

export type PaymentAuthorization = {
  paymentId: string;
  status: "authorized" | "pending" | "declined";
};

export type TicketIssueRequest = {
  orderReference: string;
  sessionId: string;
  seatIds: string[];
  buyerEmail: string;
};

export type IssuedTicket = {
  ticketId: string;
  qrPayload: string;
  issuedAt: string;
};

/**
 * Contract the official cinema/session inventory must implement.
 * Replace the demo adapter with the operator's authenticated API client.
 */
export interface SessionProvider {
  listSessions(query: SessionQuery): Promise<OfficialSession[]>;
}

/**
 * Contract for atomic temporary seat reservation and release.
 * The production implementation must be the source of truth for availability.
 */
export interface SeatInventoryProvider {
  holdSeats(request: SeatHoldRequest): Promise<SeatHold>;
  releaseHold(holdId: string): Promise<void>;
}

/** Payment gateway boundary. Never collect card data in the app server directly. */
export interface PaymentProvider {
  authorize(request: PaymentRequest): Promise<PaymentAuthorization>;
}

/** Ticketing/box-office boundary for the official ticket and QR credential. */
export interface TicketIssuer {
  issue(request: TicketIssueRequest): Promise<IssuedTicket>;
}

export type PresaleIntegrationBundle = {
  sessions: SessionProvider;
  seats: SeatInventoryProvider;
  payments: PaymentProvider;
  tickets: TicketIssuer;
};

export const demoIntegrations: PresaleIntegrationBundle = {
  sessions: {
    async listSessions() {
      return [];
    },
  },
  seats: {
    async holdSeats(request) {
      const holdId = `DEMO-HOLD-${Date.now().toString(36).toUpperCase()}`;
      return {
        holdId,
        expiresAt: new Date(Date.now() + request.ttlSeconds * 1000).toISOString(),
        seatIds: request.seatIds,
      };
    },
    async releaseHold() {
      return undefined;
    },
  },
  payments: {
    async authorize() {
      return { paymentId: `DEMO-PAYMENT-${Date.now().toString(36).toUpperCase()}`, status: "authorized" };
    },
  },
  tickets: {
    async issue(request) {
      const issuedAt = new Date().toISOString();
      return {
        ticketId: `DEMO-TICKET-${Date.now().toString(36).toUpperCase()}`,
        qrPayload: `https://presale.doomsday.example/ticket/${request.orderReference}`,
        issuedAt,
      };
    },
  },
};
