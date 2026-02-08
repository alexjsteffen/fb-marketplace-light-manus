import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { db } from "./db";
import type { TrpcContext } from "./_core/context";

describe("Inventory Enhancements", () => {
  let testDealerId: number;
  let testInventoryItemId: number;
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    const ctx: TrpcContext = {
      user: {
        id: 1,
        openId: "test-user",
        name: "Test User",
        email: "test@example.com",
        loginMethod: "google",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {} as any,
      res: {} as any,
    };
    caller = appRouter.createCaller(ctx);

    // Create a test dealer
    const dealerResult = await caller.dealers.create({
      name: "Test Dealer for Inventory",
      slug: `test-dealer-inventory-${Date.now()}`,
      contactEmail: "test@example.com",
    });
    testDealerId = dealerResult.dealer!.id;

    // Create a test inventory item
    const itemResult = await caller.inventory.create({
      dealerId: testDealerId,
      stockNumber: `TEST-${Date.now()}`,
      brand: "Ford",
      category: "Truck",
      year: 2025,
      model: "F-150",
      price: "50000",
      location: "Test Location",
      imageUrl: "https://example.com/test.jpg",
      condition: "new",
      description: "Test vehicle for inventory enhancements",
    });
    testInventoryItemId = itemResult.item!.id;
  });

  // Note: AI description regeneration tests are skipped because they require actual LLM calls
  // which are slow and may fail in CI/CD environments. The functionality is tested manually.

  it("should enhance image with template", async () => {

    const result = await caller.ads.enhanceImage({
      inventoryItemId: testInventoryItemId,
      template: "premium",
    });

    expect(result).toHaveProperty("imageUrl");
    expect(result.imageUrl).toBeTruthy();
  });

  it("should send to staging", async () => {

    const result = await caller.ads.sendToStaging({
      inventoryItemId: testInventoryItemId,
      description: "Enhanced description for staging",
      imageUrl: "https://example.com/enhanced.jpg",
      template: "premium",
    });

    expect(result).toEqual({ success: true });

    // Verify the ad was created
    const ads = await caller.ads.list({ dealerId: testDealerId });
    expect(ads.length).toBeGreaterThan(0);
    const stagedAd = ads.find(ad => ad.inventoryItemId === testInventoryItemId);
    expect(stagedAd).toBeTruthy();
    expect(stagedAd?.status).toBe("staged");
  });
});
