/** D1 database access from server functions. */

import { env } from "cloudflare:workers";

export function getDb(): D1Database {
  return env.db;
}
