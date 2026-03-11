import { eq, and, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "path";
import { 
  InsertUser, 
  users, 
  dealers, 
  InsertDealer, 
  inventoryItems, 
  InsertInventoryItem,
  backgroundTemplates,
  InsertBackgroundTemplate,
  facebookAds,
  InsertFacebookAd,
  generatedContent,
  InsertGeneratedContent
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

function getDbPath(): string {
  const dbUrl = process.env.DATABASE_URL || "";
  // Support "file:./data/app.db" or plain path "./data/app.db"
  const cleaned = dbUrl.replace(/^file:/, "");
  if (!cleaned) return path.join(process.cwd(), "data", "app.db");
  return path.resolve(cleaned);
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db) {
    try {
      const dbPath = getDbPath();
      const sqlite = new Database(dbPath);
      sqlite.pragma("journal_mode = WAL");
      sqlite.pragma("foreign_keys = ON");
      _db = drizzle(sqlite);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Dealer management functions
export async function createDealer(dealer: InsertDealer) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(dealers).values(dealer).returning();
  return result[0];
}

export async function getDealerById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(dealers).where(eq(dealers.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getDealersByOwnerId(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(dealers).where(eq(dealers.ownerId, ownerId));
}

export async function getAllDealers() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(dealers).where(eq(dealers.isActive, true));
}

export async function updateDealer(id: number, updates: Partial<InsertDealer>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(dealers).set(updates).where(eq(dealers.id, id));
}

export async function deleteDealer(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete all associated data first (cascade delete)
  await db.delete(generatedContent).where(eq(generatedContent.dealerId, id));
  await db.delete(facebookAds).where(eq(facebookAds.dealerId, id));
  await db.delete(inventoryItems).where(eq(inventoryItems.dealerId, id));
  await db.delete(dealers).where(eq(dealers.id, id));
}

// Inventory management functions
export async function createInventoryItem(item: InsertInventoryItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(inventoryItems).values(item).returning();
  return result[0];
}

export async function getInventoryItemsByDealerId(dealerId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get inventory items with ad count using LEFT JOIN
  const items = await db
    .select({
      id: inventoryItems.id,
      dealerId: inventoryItems.dealerId,
      stockNumber: inventoryItems.stockNumber,
      brand: inventoryItems.brand,
      category: inventoryItems.category,
      year: inventoryItems.year,
      model: inventoryItems.model,
      trim: inventoryItems.trim,
      description: inventoryItems.description,
      price: inventoryItems.price,
      mileage: inventoryItems.mileage,
      vin: inventoryItems.vin,
      exteriorColor: inventoryItems.exteriorColor,
      interiorColor: inventoryItems.interiorColor,
      engine: inventoryItems.engine,
      transmission: inventoryItems.transmission,
      drivetrain: inventoryItems.drivetrain,
      fuel: inventoryItems.fuel,
      cylinders: inventoryItems.cylinders,
      doors: inventoryItems.doors,
      detailUrl: inventoryItems.detailUrl,
      location: inventoryItems.location,
      imageUrl: inventoryItems.imageUrl,
      status: inventoryItems.status,
      condition: inventoryItems.condition,
      soldAt: inventoryItems.soldAt,
      lastSeenAt: inventoryItems.lastSeenAt,
      createdAt: inventoryItems.createdAt,
      updatedAt: inventoryItems.updatedAt,
      adCount: sql<number>`COALESCE(COUNT(${facebookAds.id}), 0)`.as('adCount')
    })
    .from(inventoryItems)
    .leftJoin(facebookAds, eq(facebookAds.inventoryItemId, inventoryItems.id))
    .where(eq(inventoryItems.dealerId, dealerId))
    .groupBy(inventoryItems.id)
    .orderBy(desc(inventoryItems.createdAt));
  
  return items;
}

export async function getInventoryCountByDealer(dealerId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(inventoryItems)
    .where(and(
      eq(inventoryItems.dealerId, dealerId),
      eq(inventoryItems.status, 'active')
    ));
  
  return result[0]?.count || 0;
}

export async function getInventoryItemById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getInventoryItemByStockNumber(dealerId: number, stockNumber: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(inventoryItems)
    .where(and(eq(inventoryItems.dealerId, dealerId), eq(inventoryItems.stockNumber, stockNumber)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateInventoryItem(id: number, updates: Partial<InsertInventoryItem>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(inventoryItems).set(updates).where(eq(inventoryItems.id, id));
}

export async function markItemsAsSold(dealerId: number, activeStockNumbers: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Mark items as sold if they're not in the active list
  await db.update(inventoryItems)
    .set({ 
      status: 'sold',
      soldAt: new Date()
    })
    .where(
      and(
        eq(inventoryItems.dealerId, dealerId),
        eq(inventoryItems.status, 'active'),
        sql`${inventoryItems.stockNumber} NOT IN (${activeStockNumbers.join(',')})`
      )
    );
}

export async function updateLastSeenAt(dealerId: number, stockNumbers: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  for (const stockNumber of stockNumbers) {
    await db.update(inventoryItems)
      .set({ lastSeenAt: new Date() })
      .where(
        and(
          eq(inventoryItems.dealerId, dealerId),
          eq(inventoryItems.stockNumber, stockNumber)
        )
      );
  }
}

export async function deleteAllInventoryByDealer(dealerId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(inventoryItems).where(eq(inventoryItems.dealerId, dealerId));
}

export async function deleteInventoryItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
}

// Background template functions
export async function createBackgroundTemplate(template: InsertBackgroundTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(backgroundTemplates).values(template);
  return result;
}

export async function getAllBackgroundTemplates() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(backgroundTemplates)
    .where(eq(backgroundTemplates.isActive, true))
    .orderBy(backgroundTemplates.sortOrder);
}

export async function getBackgroundTemplateById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(backgroundTemplates).where(eq(backgroundTemplates.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateBackgroundTemplate(id: number, updates: Partial<InsertBackgroundTemplate>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(backgroundTemplates).set(updates).where(eq(backgroundTemplates.id, id));
}

export async function deleteBackgroundTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Soft delete by setting isActive to false
  await db.update(backgroundTemplates).set({ isActive: false }).where(eq(backgroundTemplates.id, id));
}

// Facebook ads functions
export async function createFacebookAd(ad: InsertFacebookAd) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(facebookAds).values(ad);
  return result;
}

export async function getFacebookAdsByDealerId(dealerId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const results = await db
    .select({
      id: facebookAds.id,
      dealerId: facebookAds.dealerId,
      inventoryItemId: facebookAds.inventoryItemId,
      templateId: facebookAds.templateId,
      originalText: facebookAds.originalText,
      enhancedText: facebookAds.enhancedText,
      finalText: facebookAds.finalText,
      imageUrl: facebookAds.imageUrl,
      imageFileKey: facebookAds.imageFileKey,
      status: facebookAds.status,
      facebookMarketplaceUrl: facebookAds.facebookMarketplaceUrl,
      publishedAt: facebookAds.publishedAt,
      createdAt: facebookAds.createdAt,
      updatedAt: facebookAds.updatedAt,
      // Join inventory item data
      inventoryItem: {
        id: inventoryItems.id,
        stockNumber: inventoryItems.stockNumber,
        brand: inventoryItems.brand,
        model: inventoryItems.model,
        year: inventoryItems.year,
        price: inventoryItems.price,
        imageUrl: inventoryItems.imageUrl,
        condition: inventoryItems.condition,
      }
    })
    .from(facebookAds)
    .leftJoin(inventoryItems, eq(facebookAds.inventoryItemId, inventoryItems.id))
    .where(eq(facebookAds.dealerId, dealerId))
    .orderBy(desc(facebookAds.createdAt));
  
  return results;
}

export async function getFacebookAdById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(facebookAds).where(eq(facebookAds.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateFacebookAd(id: number, updates: Partial<InsertFacebookAd>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(facebookAds).set(updates).where(eq(facebookAds.id, id));
}

export async function deleteFacebookAd(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(facebookAds).where(eq(facebookAds.id, id));
}

export async function getPublishedAdsByDealerId(dealerId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(facebookAds)
    .where(
      and(
        eq(facebookAds.dealerId, dealerId),
        eq(facebookAds.status, 'published')
      )
    )
    .orderBy(desc(facebookAds.publishedAt));
}

// Generated content functions
export async function createGeneratedContent(content: InsertGeneratedContent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(generatedContent).values(content);
  return result;
}

export async function getGeneratedContentByAdId(facebookAdId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(generatedContent)
    .where(eq(generatedContent.facebookAdId, facebookAdId))
    .orderBy(desc(generatedContent.createdAt));
}

export async function getGeneratedContentByDealerId(dealerId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(generatedContent)
    .where(eq(generatedContent.dealerId, dealerId))
    .orderBy(desc(generatedContent.createdAt));
}

// Local authentication functions
export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserPassword(id: number, passwordHash: string, mustChange: boolean = false) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({ passwordHash, mustChangePassword: mustChange }).where(eq(users.id, id));
}

export async function createLocalUser(user: {
  username: string;
  passwordHash: string;
  name: string;
  role: "user" | "admin";
  mustChangePassword?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const openId = `local-${user.username}`;
  const result = await db.insert(users).values({
    openId,
    username: user.username,
    passwordHash: user.passwordHash,
    mustChangePassword: user.mustChangePassword ?? true,
    name: user.name,
    role: user.role,
    loginMethod: "local",
  }).onConflictDoUpdate({
    target: users.openId,
    set: {
      username: user.username,
      passwordHash: user.passwordHash,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword ?? true,
    },
  }).returning();

  return result[0];
}
