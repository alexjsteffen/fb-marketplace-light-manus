import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("Ad Staging Workflow", () => {
  let ctx: TrpcContext;
  let caller: ReturnType<typeof appRouter.createCaller>;
  let testDealerId: number;
  let testInventoryId: number;
  let testAdId: number;

  beforeAll(async () => {
    // Create mock context with authenticated user
    ctx = {
      user: {
        id: 1, // Use existing user ID from database
        openId: "test-user-openid",
        name: "Test User",
        email: "test@example.com",
        avatar: null,
        role: "admin",
      },
      req: {} as any,
      res: {} as any,
    };

    caller = appRouter.createCaller(ctx);

    // Get first dealer from database (should exist from previous setup)
    const dealers = await caller.dealers.list();
    if (dealers.length === 0) {
      throw new Error("No dealers found. Please create a dealer first.");
    }
    testDealerId = dealers[0].id;

    // Create test inventory item
    const inventory = await caller.inventory.create({
      dealerId: testDealerId,
      stockNumber: `TEST${Date.now()}`,
      brand: "Ford",
      model: "F-150",
      year: 2024,
      price: "45000",
      category: "truck",
      imageUrl: "https://example.com/truck.jpg",
    });
    testInventoryId = inventory.id;
  });

  it("should create an ad from inventory", async () => {
    const ad = await caller.ads.create({
      dealerId: testDealerId,
      inventoryItemId: testInventoryId,
      originalText: "2024 Ford F-150 for sale",
    });

    expect(ad).toBeDefined();
    expect(ad.dealerId).toBe(testDealerId);
    expect(ad.inventoryItemId).toBe(testInventoryId);
    expect(ad.status).toBe("draft");
    testAdId = ad.id;
  });

  it("should enhance ad text with AI", async () => {
    const enhanced = await caller.enhance.enhanceText({
      text: "2024 Ford F-150 for sale",
      tone: "professional",
    });

    expect(enhanced.enhancedText).toBeDefined();
    expect(enhanced.enhancedText.length).toBeGreaterThan(0);
  });

  it("should update ad status to staged", async () => {
    const updated = await caller.ads.update({
      id: testAdId,
      status: "staged",
      finalText: "Enhanced 2024 Ford F-150 - Premium Condition",
    });

    expect(updated.status).toBe("staged");
    expect(updated.finalText).toBe("Enhanced 2024 Ford F-150 - Premium Condition");
  });

  it("should list staged ads for dealer", async () => {
    const ads = await caller.ads.list({ dealerId: testDealerId });
    const stagedAds = ads.filter((ad) => ad.status === "staged");

    expect(stagedAds.length).toBeGreaterThan(0);
    expect(stagedAds[0].dealerId).toBe(testDealerId);
  });

  it("should publish ad with Facebook Marketplace URL", async () => {
    const published = await caller.ads.update({
      id: testAdId,
      status: "published",
      facebookMarketplaceUrl: "https://www.facebook.com/marketplace/item/123456789",
    });

    expect(published.status).toBe("published");
    expect(published.facebookMarketplaceUrl).toBe(
      "https://www.facebook.com/marketplace/item/123456789"
    );
  });

  it("should retrieve ad by ID", async () => {
    const ad = await caller.ads.getById({ id: testAdId });

    expect(ad).toBeDefined();
    expect(ad.id).toBe(testAdId);
    expect(ad.status).toBe("published");
  });

  it("should list published ads", async () => {
    const ads = await caller.ads.list({ dealerId: testDealerId });
    const publishedAds = ads.filter((ad) => ad.status === "published");

    expect(publishedAds.length).toBeGreaterThan(0);
    expect(publishedAds[0].facebookMarketplaceUrl).toBeDefined();
  });
});
