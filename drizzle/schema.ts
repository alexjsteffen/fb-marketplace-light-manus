import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 */
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  username: text("username").unique(),
  passwordHash: text("passwordHash"),
  mustChangePassword: integer("mustChangePassword", { mode: "boolean" }).default(true),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  dealerId: integer("dealerId"), // null = super admin, otherwise restricted to specific dealer
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Dealers table - multi-tenant support
 * Each dealer represents a separate business entity with their own inventory and branding
 */
export const dealers = sqliteTable("dealers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  contactEmail: text("contactEmail"),
  contactPhone: text("contactPhone"),
  websiteUrl: text("websiteUrl"),
  logoUrl: text("logoUrl"),
  brandColor: text("brandColor").default("#3b82f6"), // hex color
  tagline: text("tagline"), // dealer tagline/slogan
  ownerId: integer("ownerId").notNull(), // references users.id
  isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type Dealer = typeof dealers.$inferSelect;
export type InsertDealer = typeof dealers.$inferInsert;

/**
 * Inventory items - vehicles, equipment, or other items for sale
 * Tracks sold status based on presence in subsequent imports
 */
export const inventoryItems = sqliteTable("inventoryItems", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dealerId: integer("dealerId").notNull(), // references dealers.id
  stockNumber: text("stockNumber").notNull(),
  brand: text("brand"),
  category: text("category"),
  year: integer("year"),
  model: text("model"),
  trim: text("trim"),
  description: text("description"),
  price: text("price"), // stored as text to preserve decimal precision
  mileage: text("mileage"),
  vin: text("vin"),
  exteriorColor: text("exteriorColor"),
  interiorColor: text("interiorColor"),
  engine: text("engine"),
  transmission: text("transmission"),
  drivetrain: text("drivetrain"),
  fuel: text("fuel"),
  cylinders: text("cylinders"),
  doors: text("doors"),
  detailUrl: text("detailUrl"),
  location: text("location"),
  imageUrl: text("imageUrl"),
  status: text("status", { enum: ["active", "sold", "archived"] }).default("active").notNull(),
  condition: text("condition", { enum: ["new", "used"] }).default("used").notNull(),
  soldAt: integer("soldAt", { mode: "timestamp" }),
  lastSeenAt: integer("lastSeenAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(), // updated on each import
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = typeof inventoryItems.$inferInsert;

/**
 * Background templates for ad image generation
 * Stores template configuration and preview images
 */
export const backgroundTemplates = sqliteTable("backgroundTemplates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  previewUrl: text("previewUrl"),
  templateType: text("templateType", {
    enum: [
      "gradient_modern",
      "gradient_sunset",
      "solid_professional",
      "textured_premium",
      "branded_dealer",
      "seasonal_special"
    ]
  }).notNull(),
  config: text("config").notNull(), // JSON string with template settings
  isActive: integer("isActive", { mode: "boolean" }).default(true).notNull(),
  sortOrder: integer("sortOrder").default(0).notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type BackgroundTemplate = typeof backgroundTemplates.$inferSelect;
export type InsertBackgroundTemplate = typeof backgroundTemplates.$inferInsert;

/**
 * Facebook ads - both staged and published
 * Tracks the complete lifecycle of an ad from creation to publishing
 */
export const facebookAds = sqliteTable("facebookAds", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dealerId: integer("dealerId").notNull(), // references dealers.id
  inventoryItemId: integer("inventoryItemId").notNull(), // references inventoryItems.id
  templateId: integer("templateId"), // references backgroundTemplates.id
  originalText: text("originalText"),
  enhancedText: text("enhancedText"),
  finalText: text("finalText"), // user-edited version
  imageUrl: text("imageUrl"), // final generated image in S3
  imageFileKey: text("imageFileKey"), // S3 file key for management
  status: text("status", { enum: ["draft", "staged", "published"] }).default("draft").notNull(),
  facebookMarketplaceUrl: text("facebookMarketplaceUrl"),
  publishedAt: integer("publishedAt", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type FacebookAd = typeof facebookAds.$inferSelect;
export type InsertFacebookAd = typeof facebookAds.$inferInsert;

/**
 * Generated content for "As Seen On Facebook" feature
 * SEO-optimized content for dealer websites
 */
export const generatedContent = sqliteTable("generatedContent", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dealerId: integer("dealerId").notNull(), // references dealers.id
  facebookAdId: integer("facebookAdId").notNull(), // references facebookAds.id
  contentType: text("contentType", { enum: ["pillar_page", "blog_post", "badge_image"] }).notNull(),
  title: text("title"),
  content: text("content"), // markdown or HTML
  badgeImageUrl: text("badgeImageUrl"), // for badge_image type
  badgeImageFileKey: text("badgeImageFileKey"),
  exportFormat: text("exportFormat", { enum: ["markdown", "html", "json"] }).default("markdown").notNull(),
  metadata: text("metadata"), // JSON string with SEO metadata
  createdAt: integer("createdAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
});

export type GeneratedContent = typeof generatedContent.$inferSelect;
export type InsertGeneratedContent = typeof generatedContent.$inferInsert;
