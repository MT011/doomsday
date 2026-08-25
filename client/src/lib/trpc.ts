import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/public-api-router";

export const trpc = createTRPCReact<AppRouter>();
