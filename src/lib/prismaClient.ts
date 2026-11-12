import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

// Talk to Neon over WebSockets (port 443) instead of the Postgres port (5432). Works on
// networks that block 5432 and is Neon's recommended setup for serverless hosts like Vercel.
// Node 22+ has a built-in WebSocket; `ws` covers older runtimes.
neonConfig.webSocketConstructor = globalThis.WebSocket ?? ws;

/** A Prisma client using Neon's serverless driver. Shared by the app and prisma/seed.ts. */
export function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set. Run `neon env pull --branch dev`.");
  return new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
}
