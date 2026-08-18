import type { User } from "../../drizzle/schema";

export type TrpcContext = {
  req: { headers: { origin?: string | string[]; host?: string } };
  res: unknown;
  user: User | null;
};

type AnyRequest = { headers: Record<string, unknown> };
type AnyResponse = unknown;

export async function createContext(opts: {
  req: AnyRequest;
  res: AnyResponse;
}): Promise<TrpcContext> {
  return {
    req: opts.req,
    res: opts.res,
    user: null,
  };
}
