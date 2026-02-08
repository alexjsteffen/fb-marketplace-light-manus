import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  dealerId: int("dealerId"), // null = super admin, otherwise restricted to specific dealer
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Dealers table - multi-tenant support
 * Each dealer represents a separate business entity with their own inventory and branding
 */
export const dealers = mysqlTable("dealers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  contactEmail: varchar("contactEmail", { length: 320 }),
  contactPhone: varchar("contactPhone", { length: 50 }),
  websiteUrl: text("websiteUrl"),
  logoUrl: text("logoUrl"),
  brandColor: varchar("brandColor", { length: 7 }).default("#3b82f6"), // hex color
  ownerId: int("ownerId").notNull(), // references users.id
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Dealer = typeof dealers.$inferSelect;
export type InsertDealer = typeof dealers.$inferInsert;

/**
 * Inventory items - vehicles, equipment, or other items for sale
 * Tracks sold status based on presence in subsequent imports
 */
export const inventoryItems = mysqlTable("inventoryItems", {
  id: int("id").autoincrement().primaryKey(),
  dealerId: int("dealerId").notNull(), // references dealers.id
  stockNumber: varchar("stockNumber", { length: 100 }).notNull(),
  brand: varchar("brand", { length: 100 }),
  category: varchar("category", { length: 100 }),
  year: int("year"),
  model: varchar("model", { length: 255 }),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }),
  location: text("location"),
  imageUrl: text("imageUrl"),
  status: mysqlEnum("status", ["active", "sold", "archived"]).default("active").notNull(),
  condition: mysqlEnum("condition", ["new", "used"]).default("used").notNull(),
  soldAt: timestamp("soldAt"),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(), // updated on each import
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = typeof inventoryItems.$inferInsert;

/**
 * Background templates for ad image generation
 * Stores template configuration and preview images
 */
export const backgroundTemplates = mysqlTable("backgroundTemplates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  previewUrl: text("previewUrl"),
  templateType: mysqlEnum("templateType", [
    "gradient_modern",
    "gradient_sunset",
    "solid_professional",
    "textured_premium",
    "branded_dealer",
    "seasonal_special"
  ]).notNull(),
  config: text("config").notNull(), // JSON string with template settings
  isActive: boolean("isActive").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BackgroundTemplate = typeof backgroundTemplates.$inferSelect;
export type InsertBackgroundTemplate = typeof backgroundTemplates.$inferInsert;

/**
 * Facebook ads - both staged and published
 * Tracks the complete lifecycle of an ad from creation to publishing
 */
export const facebookAds = mysqlTable("facebookAds", {
  id: int("id").autoincrement().primaryKey(),
  dealerId: int("dealerId").notNull(), // references dealers.id
  inventoryItemId: int("inventoryItemId").notNull(), // references inventoryItems.id
  templateId: int("templateId"), // references backgroundTemplates.id
  originalText: text("originalText"),
  enhancedText: text("enhancedText"),
  finalText: text("finalText"), // user-edited version
  imageUrl: text("imageUrl"), // final generated image in S3
  imageFileKey: text("imageFileKey"), // S3 file key for management
  status: mysqlEnum("status", ["draft", "staged", "published"]).default("draft").notNull(),
  facebookMarketplaceUrl: text("facebookMarketplaceUrl"),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FacebookAd = typeof facebookAds.$inferSelect;
export type InsertFacebookAd = typeof facebookAds.$inferInsert;

/**
 * Generated content for "As Seen On Facebook" feature
 * SEO-optimized content for dealer websites
 */
export const generatedContent = mysqlTable("generatedContent", {
  id: int("id").autoincrement().primaryKey(),
  dealerId: int("dealerId").notNull(), // references dealers.id
  facebookAdId: int("facebookAdId").notNull(), // references facebookAds.id
  contentType: mysqlEnum("contentType", ["pillar_page", "blog_post", "badge_image"]).notNull(),
  title: varchar("title", { length: 255 }),
  content: text("content"), // markdown or HTML
  badgeImageUrl: text("badgeImageUrl"), // for badge_image type
  badgeImageFileKey: text("badgeImageFileKey"),
  exportFormat: mysqlEnum("exportFormat", ["markdown", "html", "json"]).default("markdown").notNull(),
  metadata: text("metadata"), // JSON string with SEO metadata
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GeneratedContent = typeof generatedContent.$inferSelect;
export type InsertGeneratedContent = typeof generatedContent.$inferInsert;
