import { describe, expect, it } from "vitest";
import { getTiDbConnectionOptions, needsTiDbApplicationDatabase, PIX_PAYMENTS_CREATE_SQL } from "./db";

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

describe("conexão TiDB", () => {
  it("monta uma conexão TLS a partir de campos separados", () => {
    const options = getTiDbConnectionOptions({
      TIDB_HOST: "gateway01.sa-east-1.prod.aws.tidbcloud.com",
      TIDB_PORT: "4000",
      TIDB_USER: "usuario.root",
      TIDB_PASSWORD: "segredo-nao-real",
      TIDB_DATABASE: "sys",
    });

    expect(options).toMatchObject({
      host: "gateway01.sa-east-1.prod.aws.tidbcloud.com",
      port: 4000,
      database: "sys",
      ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    });
  });

  it("não cria conexão parcial sem senha", () => {
    expect(getTiDbConnectionOptions({ TIDB_HOST: "gateway.example", TIDB_USER: "usuario" })).toBeUndefined();
  });

  it("troca um schema de sistema por banco exclusivo da aplicação", () => {
    expect(needsTiDbApplicationDatabase("sys")).toBe(true);
    expect(needsTiDbApplicationDatabase("mysql")).toBe(true);
    expect(needsTiDbApplicationDatabase("doomsday_presale")).toBe(false);
  });
});
