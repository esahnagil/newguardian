import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../shared/schema";

// Create a mock database client if DATABASE_URL is not set
let client: postgres.Sql<{}>;
let db: PostgresJsDatabase<typeof schema>;

try {
  if (process.env.DATABASE_URL) {
    // Create a Postgres client if DATABASE_URL exists
    client = postgres(process.env.DATABASE_URL);
    // Create a Drizzle instance
    db = drizzle(client, { schema });
  } else {
    console.log("DATABASE_URL not set, using in-memory storage instead");
    // Create a mock db object that will not be used when MemStorage is active
    client = {} as postgres.Sql<{}>;
    db = {} as PostgresJsDatabase<typeof schema>;
  }
} catch (error) {
  console.error("Error initializing database:", error);
  // Create a mock db object that will not be used when MemStorage is active
  client = {} as postgres.Sql<{}>;
  db = {} as PostgresJsDatabase<typeof schema>;
}

export { db };