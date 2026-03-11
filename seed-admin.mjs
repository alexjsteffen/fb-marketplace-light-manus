import { drizzle } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import Database from "better-sqlite3";
import path from "path";
import bcrypt from "bcryptjs";
import { users } from "./drizzle/schema.ts";

const dbUrl = process.env.DATABASE_URL || "";
const cleaned = dbUrl.replace(/^file:/, "");
const dbPath = cleaned || path.join(".", "data", "app.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite);

const DEFAULT_USERNAME = "admin";
const DEFAULT_PASSWORD = "admin";

async function seed() {
  console.log("Creating default admin user...");

  // Check if admin user already exists
  const existing = db.select().from(users).where(sql`${users.openId} = 'local-admin'`).get();
  if (existing) {
    console.log("✓ Admin user already exists (skipping)");
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  await db.insert(users).values({
    openId: "local-admin",
    username: DEFAULT_USERNAME,
    passwordHash,
    mustChangePassword: true,
    name: "Administrator",
    role: "admin",
    loginMethod: "local",
  }).onConflictDoNothing();

  console.log("✓ Default admin user created");
  console.log("  Username: admin");
  console.log("  Password: admin");
  console.log("  ⚠️  Password must be changed on first login");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Failed to create admin user:", error);
  process.exit(1);
});
