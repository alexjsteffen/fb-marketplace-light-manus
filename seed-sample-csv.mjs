#!/usr/bin/env node
/**
 * seed-sample-csv.mjs
 * -------------------
 * Imports the bundled novlanbros-ford-march10-26.csv into the database as a
 * sample dealer + inventory so the app has real data to explore right after install.
 *
 * Usage:
 *   node seed-sample-csv.mjs
 *
 * The script is idempotent: if the sample dealer already exists it will only
 * add inventory items that are not already present.
 */

import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { parse } from "csv-parse/sync";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { eq, and } from "drizzle-orm";
import { dealers, inventoryItems, users } from "./drizzle/schema.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Database ──────────────────────────────────────────────────────────────────
const dbUrl = process.env.DATABASE_URL || "";
const cleaned = dbUrl.replace(/^file:/, "");
const dbPath = cleaned || path.join(__dirname, "data", "app.db");

if (!existsSync(dbPath)) {
  console.error(
    `❌  Database not found at ${dbPath}.\n   Run install.sh first to create the database.`
  );
  process.exit(1);
}

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite);

// ── CSV path ──────────────────────────────────────────────────────────────────
const CSV_FILE = path.join(__dirname, "novlanbros-ford-march10-26.csv");
if (!existsSync(CSV_FILE)) {
  console.error(`❌  CSV file not found: ${CSV_FILE}`);
  process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function firstOf(...vals) {
  for (const v of vals) {
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return undefined;
}

function mapRecord(record) {
  const stockNumber = firstOf(record.StockNumber, record.stockNumber, record.stock, record.Stock);
  if (!stockNumber) return null;

  const brand = firstOf(record.Make, record.brand, record.make);
  const model = firstOf(record.Model, record.model);
  const rawYear = firstOf(record.Year, record.year);
  const year = rawYear ? parseInt(rawYear) : undefined;
  const trim = firstOf(record.Trim, record.trim);
  const price = firstOf(record.SalePrice, record.RetailPrice, record.price, record.Price);
  const mileage = firstOf(record.Mileage, record.mileage);
  const vin = firstOf(record.VIN, record.vin, record.Vin);
  const city = firstOf(record.City, record.city) || "";
  const province = firstOf(record.Province, record.province) || "";
  const location = [city, province].filter(Boolean).join(", ") || undefined;
  const rawImages = firstOf(record.Images, record.imageUrl, record.image, record.Image) || "";
  const imageUrl = rawImages ? rawImages.split("|")[0].trim() || undefined : undefined;
  const description = firstOf(record.Description, record.description);
  const exteriorColor = firstOf(record.ColorExterior, record.exteriorColor);
  const interiorColor = firstOf(record.ColorInterior, record.interiorColor);
  const engine = firstOf(record.Engine, record.engine);
  const transmission = firstOf(record.TransmissionDesc, record.Transmission, record.transmission);
  const drivetrain = firstOf(record.Drivetrain, record.drivetrain);
  const fuel = firstOf(record.Fuel, record.fuel);
  const cylinders = record.Cylinders ? String(record.Cylinders) : undefined;
  const doors = record.Doors ? String(record.Doors) : undefined;
  const typeRaw = (firstOf(record.Type, record.type) || "").toLowerCase();
  const condRaw = (firstOf(record.Condition, record.condition) || "").toLowerCase();
  const condition = typeRaw === "new" || condRaw === "new" ? "new" : "used";

  return {
    stockNumber,
    brand,
    model,
    year,
    trim,
    price,
    mileage,
    vin,
    location,
    imageUrl,
    description,
    exteriorColor,
    interiorColor,
    engine,
    transmission,
    drivetrain,
    fuel,
    cylinders,
    doors,
    condition,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  console.log("📂  Reading CSV…");
  const csvContent = readFileSync(CSV_FILE, "utf8");
  const records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true });
  console.log(`   Found ${records.length} rows`);

  // Resolve dealer name from CSV (first non-empty DealerName)
  const dealerNameFromCsv = records.find((r) => r.DealerName)?.DealerName || "Novlan Bros Ford";
  const dealerSlug = "novlan-bros-ford";

  // ── Ensure admin user exists (owner) ─────────────────────────────────────
  const adminRow = db.select().from(users).where(eq(users.openId, "local-admin")).get();
  if (!adminRow) {
    console.error("❌  Admin user not found. Run seed-admin.mjs first.");
    process.exit(1);
  }
  const ownerId = adminRow.id;

  // ── Ensure dealer exists ─────────────────────────────────────────────────
  let dealerRow = db.select().from(dealers).where(eq(dealers.slug, dealerSlug)).get();
  if (dealerRow) {
    console.log(`✓  Dealer "${dealerRow.name}" already exists (id=${dealerRow.id})`);
  } else {
    const inserted = db
      .insert(dealers)
      .values({
        name: dealerNameFromCsv,
        slug: dealerSlug,
        contactPhone: records.find((r) => r.Phone)?.Phone || undefined,
        ownerId,
        isActive: true,
      })
      .returning()
      .get();
    dealerRow = inserted;
    console.log(`✓  Created dealer "${dealerRow.name}" (id=${dealerRow.id})`);
  }

  const dealerId = dealerRow.id;

  // ── Import inventory ─────────────────────────────────────────────────────
  let inserted = 0;
  let skipped = 0;

  for (const record of records) {
    const item = mapRecord(record);
    if (!item) { skipped++; continue; }

    // Check if already exists
    const existing = db
      .select({ id: inventoryItems.id })
      .from(inventoryItems)
      .where(and(eq(inventoryItems.dealerId, dealerId), eq(inventoryItems.stockNumber, item.stockNumber)))
      .get();

    if (existing) { skipped++; continue; }

    db.insert(inventoryItems).values({ ...item, dealerId }).run();
    inserted++;
  }

  console.log(`✓  Imported ${inserted} new items (${skipped} skipped / already exist)`);
  console.log("");
  console.log(`   You can now view this inventory at: /inventory/${dealerId}`);
}

seed().catch((err) => {
  console.error("Failed to seed sample CSV:", err);
  process.exit(1);
});
