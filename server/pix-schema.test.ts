import { describe, expect, it } from "vitest";
import { formatPostgresInitializationError, getSupabaseDatabaseUrl, getSupabasePoolConnectionString, PIX_PAYMENTS_CREATE_SQL, PIX_PAYMENTS_TRANSACTION_ID_UNIQUE_SQL } from "./db";

describe("schema de persistência PIX no Supabase", () => {
  it("cria a tabela Postgres de modo idempotente com as chaves necessárias", () => {
    expect(PIX_PAYMENTS_CREATE_SQL).toContain('CREATE TABLE IF NOT EXISTS "amplopayPixPayments"');
    expect(PIX_PAYMENTS_CREATE_SQL).toContain('"orderCode"');
    expect(PIX_PAYMENTS_CREATE_SQL).toContain('"transactionId"');
    expect(PIX_PAYMENTS_CREATE_SQL).toContain('"webhookToken"');
    expect(PIX_PAYMENTS_CREATE_SQL).toContain("JSON NOT NULL");
    expect(PIX_PAYMENTS_TRANSACTION_ID_UNIQUE_SQL).toContain("CREATE UNIQUE INDEX IF NOT EXISTS");
    expect(PIX_PAYMENTS_TRANSACTION_ID_UNIQUE_SQL).toContain("amplopayPixPayments_transactionId_unique");
    expect(PIX_PAYMENTS_CREATE_SQL).not.toMatch(/INSERT\s+INTO/i);
  });

  it("prioriza a URL Postgres provisionada pelo Supabase", () => {
    expect(getSupabaseDatabaseUrl({
      POSTGRES_URL: "postgresql://postgres:secret@pooler.supabase.com:6543/postgres",
      DATABASE_URL: "mysql://ignored",
    })).toBe("postgresql://postgres:secret@pooler.supabase.com:6543/postgres");
  });

  it("recusa uma URL MySQL quando não há conexão Postgres do Supabase", () => {
    expect(() => getSupabaseDatabaseUrl({ DATABASE_URL: "mysql://old.example.com/sys" })).toThrow("PostgreSQL");
  });

  it("preserva o TLS do pool removendo parâmetros conflitantes da URL", () => {
    const connectionString = getSupabasePoolConnectionString(
      "postgresql://postgres:secret@pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true",
    );

    expect(connectionString).not.toContain("sslmode");
    expect(connectionString).toContain("pgbouncer=true");
  });

  it("sanitiza URL e senha em falhas do Postgres", () => {
    const message = formatPostgresInitializationError({
      cause: { code: "28P01", message: "password failed at postgresql://postgres:secret@db.example/postgres" },
    });

    expect(message).toContain("28P01");
    expect(message).toContain("postgresql://[oculto]");
    expect(message).not.toContain("postgres:secret@db.example");
  });
});
