import { describe, expect, it } from "vitest";
import { PIX_PAYMENTS_CREATE_SQL } from "./db";

describe("schema de persistência PIX", () => {
  it("cria a tabela de modo idempotente com as chaves necessárias", () => {
    expect(PIX_PAYMENTS_CREATE_SQL).toContain("CREATE TABLE IF NOT EXISTS");
    expect(PIX_PAYMENTS_CREATE_SQL).toContain("`amplopayPixPayments`");
    expect(PIX_PAYMENTS_CREATE_SQL).toContain("`orderCode`");
    expect(PIX_PAYMENTS_CREATE_SQL).toContain("`transactionId`");
    expect(PIX_PAYMENTS_CREATE_SQL).toContain("`webhookToken`");
    expect(PIX_PAYMENTS_CREATE_SQL).not.toMatch(/INSERT\s+INTO/i);
  });
});
