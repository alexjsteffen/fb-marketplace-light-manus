import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "path";
import { backgroundTemplates } from "./drizzle/schema.ts";

const dbUrl = process.env.DATABASE_URL || "";
const cleaned = dbUrl.replace(/^file:/, "");
const dbPath = cleaned || path.join(".", "data", "app.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
const db = drizzle(sqlite);

const templates = [
  {
    name: "Modern Gradient",
    description: "Professional blue-purple gradient background",
    templateType: "gradient_modern",
    config: "{}",
    previewUrl: null,
  },
  {
    name: "Sunset Gradient",
    description: "Warm pink-red gradient for eye-catching ads",
    templateType: "gradient_sunset",
    config: "{}",
    previewUrl: null,
  },
  {
    name: "Professional Solid",
    description: "Clean navy blue solid background",
    templateType: "solid_professional",
    config: "{}",
    previewUrl: null,
  },
  {
    name: "Premium Textured",
    description: "Sophisticated dark background with subtle texture",
    templateType: "textured_premium",
    config: "{}",
    previewUrl: null,
  },
  {
    name: "Branded Dealer",
    description: "Customizable with your dealer brand color",
    templateType: "branded_dealer",
    config: "{}",
    previewUrl: null,
  },
  {
    name: "Seasonal Special",
    description: "Bright gold gradient for special promotions",
    templateType: "seasonal_special",
    config: "{}",
    previewUrl: null,
  },
];

async function seed() {
  console.log("Seeding background templates...");
  
  for (const template of templates) {
    await db.insert(backgroundTemplates).values(template).onConflictDoNothing();
  }
  
  console.log("✓ Seeded 6 background templates");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Failed to seed templates:", error);
  process.exit(1);
});
