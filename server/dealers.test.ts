import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("dealers router", () => {
  it("creates a new dealer", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dealers.create({
      name: "Test Dealer",
      slug: `test-dealer-${Date.now()}`,
      contactEmail: "contact@testdealer.com",
      contactPhone: "555-1234",
      websiteUrl: "https://testdealer.com",
      brandColor: "#FF5733",
    });

    expect(result.success).toBe(true);
    expect(result.dealer).toBeDefined();
    expect(result.dealer?.name).toBe("Test Dealer");
  });

  it("lists dealers for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.dealers.list();

    expect(Array.isArray(result)).toBe(true);
  });
});

describe("inventory router", () => {
  it("creates inventory item", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First create a dealer
    const dealerResult = await caller.dealers.create({
      name: "Inventory Test Dealer",
      slug: `inv-test-${Date.now()}`,
    });

    expect(dealerResult.success).toBe(true);
    expect(dealerResult.dealer).toBeDefined();
    if (!dealerResult.dealer) {
      throw new Error("Dealer not created");
    }
    const dealerId = dealerResult.dealer.id;

    // Then create inventory
    const result = await caller.inventory.create({
      dealerId,
      stockNumber: `STOCK-${Date.now()}`,
      brand: "Test Brand",
      category: "Test Category",
      year: 2024,
      model: "Test Model",
      description: "Test Description",
      price: "25000.00",
      condition: "used",
    });

    expect(result.success).toBe(true);
    expect(result.item).toBeDefined();
    expect(result.item?.stockNumber).toContain("STOCK-");
  });

  it("lists inventory for a dealer", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a dealer first
    const dealerResult = await caller.dealers.create({
      name: "List Test Dealer",
      slug: `list-test-${Date.now()}`,
    });

    expect(dealerResult.success).toBe(true);
    expect(dealerResult.dealer).toBeDefined();
    if (!dealerResult.dealer) {
      throw new Error("Dealer not created");
    }
    const dealerId = dealerResult.dealer.id;

    const result = await caller.inventory.list({ dealerId });

    expect(Array.isArray(result)).toBe(true);
  });
});
