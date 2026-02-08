import { describe, it, expect } from 'vitest';
import { scrapeInventoryFromUrl } from './inventoryScraper';

describe('Inventory Scraper - Description Extraction', () => {
  it('should extract vehicle descriptions from Novlan Bros inventory', async () => {
    // This test verifies that the scraper:
    // 1. Finds detail page URLs (h2 inside anchor tags)
    // 2. Visits detail pages and extracts "ABOUT THIS VEHICLE" descriptions
    // 3. Cleans up HTML entities and removes boilerplate
    
    const url = 'https://novlanbros.com/ford/inventory/?newUsed=Used';
    
    console.log('[Test] Starting scrape of Novlan Bros used inventory...');
    const items = await scrapeInventoryFromUrl(url);
    
    console.log(`[Test] Scraped ${items.length} items`);
    
    // Should have scraped some items
    expect(items.length).toBeGreaterThan(0);
    
    // Check first few items for descriptions
    const itemsWithDescriptions = items.filter(item => item.description && item.description.length > 100);
    console.log(`[Test] Items with descriptions (>100 chars): ${itemsWithDescriptions.length}/${items.length}`);
    
    // At least 50% of items should have descriptions
    expect(itemsWithDescriptions.length).toBeGreaterThan(items.length * 0.5);
    
    // Check a sample description
    if (itemsWithDescriptions.length > 0) {
      const sample = itemsWithDescriptions[0];
      console.log(`[Test] Sample vehicle: ${sample.title}`);
      console.log(`[Test] Description length: ${sample.description?.length} chars`);
      console.log(`[Test] Description preview: ${sample.description?.substring(0, 200)}...`);
      
      // Description should not contain boilerplate
      expect(sample.description).not.toMatch(/The Novlan family is owned/i);
      expect(sample.description).not.toMatch(/Come by and check out our fleet/i);
      
      // Description should have meaningful content
      expect(sample.description!.length).toBeGreaterThan(200);
    }
  }, 180000); // 3 minute timeout for scraping
});
