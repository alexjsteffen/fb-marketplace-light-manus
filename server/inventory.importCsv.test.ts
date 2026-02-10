import { describe, it, expect, beforeAll } from 'vitest';
import { appRouter } from './routers';
import * as db from './db';

describe('inventory.importCsv', () => {
  let testDealerId: number;
  
  beforeAll(async () => {
    // Create a test dealer
    const dealer = await db.createDealer({
      name: 'CSV Test Dealer',
      slug: 'csv-test-dealer',
      contactEmail: 'test@example.com',
      ownerId: 1, // Test owner ID
    });
    testDealerId = dealer.id;
  });

  it('should import vehicles from valid CSV', async () => {
    const csvContent = `stockNumber,make,model,year,price,mileage
CSV001,Ford,F-150,2023,45000,12500
CSV002,Jeep,Wrangler,2024,52000,8200`;

    const caller = appRouter.createCaller({
      user: { id: 1, dealerId: null, role: 'admin' },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.inventory.importCsv({
      dealerId: testDealerId,
      csvContent,
    });

    expect(result.success).toBe(true);
    expect(result.total).toBe(2);
    expect(result.imported).toBeGreaterThan(0);
  });

  it('should handle CSV with different column names', async () => {
    const csvContent = `Stock,Make,Model,Year
CSV003,Ram,1500,2023`;

    const caller = appRouter.createCaller({
      user: { id: 1, dealerId: null, role: 'admin' },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.inventory.importCsv({
      dealerId: testDealerId,
      csvContent,
    });

    expect(result.success).toBe(true);
    expect(result.total).toBe(1);
  });

  it('should reject empty CSV', async () => {
    const csvContent = ``;

    const caller = appRouter.createCaller({
      user: { id: 1, dealerId: null, role: 'admin' },
      req: {} as any,
      res: {} as any,
    });

    await expect(
      caller.inventory.importCsv({
        dealerId: testDealerId,
        csvContent,
      })
    ).rejects.toThrow('CSV file is empty');
  });

  it('should reject CSV without stockNumber column', async () => {
    const csvContent = `make,model,year
Ford,F-150,2023`;

    const caller = appRouter.createCaller({
      user: { id: 1, dealerId: null, role: 'admin' },
      req: {} as any,
      res: {} as any,
    });

    await expect(
      caller.inventory.importCsv({
        dealerId: testDealerId,
        csvContent,
      })
    ).rejects.toThrow('No valid items found');
  });
});
