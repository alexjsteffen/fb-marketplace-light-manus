import { scrapeInventoryFromUrl } from './server/inventoryScraper.ts';
import * as db from './server/db.ts';
import { sql } from 'drizzle-orm';

const DEALER_ID = 60001;
const SCRAPE_URL = 'https://novlanbros.com/ford/inventory/';

async function main() {
  console.log('[Script] Starting scrape of Novlan Bros inventory...');
  console.log('[Script] URL:', SCRAPE_URL);
  console.log('[Script] This will take 3-5 minutes as it visits each vehicle detail page...\n');
  
  try {
    // Scrape the inventory
    const items = await scrapeInventoryFromUrl(SCRAPE_URL);
    console.log(`\n[Script] Scraped ${items.length} vehicles`);
    
    // Count items with descriptions
    const withDesc = items.filter(item => item.description && item.description.length > 100);
    console.log(`[Script] Items with descriptions (>100 chars): ${withDesc.length}/${items.length}`);
    
    // Import to database
    console.log('\n[Script] Importing to database...');
    
    // Get current active stock numbers
    const activeStockNumbers = items.map(item => item.stockNumber);
    
    // Mark items not in the import as sold
    if (activeStockNumbers.length > 0) {
      await db.markItemsAsSold(DEALER_ID, activeStockNumbers);
    }
    
    // Update lastSeenAt for existing items
    await db.updateLastSeenAt(DEALER_ID, activeStockNumbers);
    
    // Insert new items using bulk insert
    console.log('[Script] Preparing bulk insert...');
    const itemsToInsert = items.map(item => ({
      ...item,
      dealerId: DEALER_ID,
      condition: (item.category === 'new' || item.category === 'used') ? item.category : 'used',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSeenAt: new Date(),
    }));
    
    try {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new Error('Database not available');
      
      // Use individual inserts with conflict handling for each item
      const { inventoryItems } = await import('./drizzle/schema.ts');
      for (const item of itemsToInsert) {
        await dbInstance.insert(inventoryItems).values(item).onConflictDoNothing();
      }
      
      console.log(`[Script] ✅ Successfully imported/updated ${items.length} vehicles`);
      console.log(`[Script] ${withDesc.length} vehicles have full descriptions`);
    } catch (error) {
      console.error('[Script] Bulk insert error:', error.message);
      throw error;
    }
    
  } catch (error) {
    console.error('[Script] ❌ Error:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

main();
