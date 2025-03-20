import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Create a mock database client if DATABASE_URL is not set
let client;
let db;

try {
  if (process.env.DATABASE_URL) {
    // Create a Postgres client if DATABASE_URL exists
    client = postgres(process.env.DATABASE_URL);
    // Create a Drizzle instance
    db = drizzle(client);
  } else {
    console.log("DATABASE_URL not set, using in-memory storage instead");
    // Create a mock db object that will not be used when MemStorage is active
    db = {} as any;
  }
} catch (error) {
  console.error("Error initializing database:", error);
  // Create a mock db object that will not be used when MemStorage is active
  db = {} as any;
}

export { db };