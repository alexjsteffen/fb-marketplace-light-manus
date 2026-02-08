import puppeteer from "puppeteer";
import * as cheerio from "cheerio";

export interface ScrapedInventoryItem {
  title: string;
  stockNumber: string;
  brand?: string;
  model?: string;
  year?: number;
  price?: string;
  category?: string;
  location?: string;
  imageUrl?: string;
  status?: string;
}

/**
 * Scrape inventory from a dealer website URL
 * Uses Puppeteer to handle JavaScript-rendered content
 */
export async function scrapeInventoryFromUrl(
  url: string
): Promise<ScrapedInventoryItem[]> {
  let browser;
  
  try {
    // Launch headless browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );

    console.log(`[Scraper] Navigating to ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get page HTML
    const html = await page.content();
    
    // Parse with Cheerio
    const $ = cheerio.load(html);
    const items: ScrapedInventoryItem[] = [];

    console.log('[Scraper] Parsing HTML with Cheerio');

    // Strategy 1: Look for h2 elements with vehicle titles (works for Novlan Bros)
    $('h2').each((_, element) => {
      const $h2 = $(element);
      const title = $h2.text().trim();
      
      // Check if this looks like a vehicle title (year + brand pattern)
      if (title.match(/\d{4}\s+\w+/i)) {
        // Find the container (go up to row or similar container)
        const $container = $h2.closest('.row, .vehicle-card, .inventory-item, [class*="vehicle"], article').length > 0
          ? $h2.closest('.row, .vehicle-card, .inventory-item, [class*="vehicle"], article')
          : $h2.parent().parent().parent(); // Fallback: go up 3 levels
        
        const containerText = $container.text();
        
        // Extract stock number
        const stockMatch = containerText.match(/Stock\s*(?:Number)?:?\s*([A-Z0-9]+)/i);
        const stockNumber = stockMatch?.[1] || `STOCK-${items.length + 1}`;
        
        // Extract price - look for SALE PRICE or just price
        const priceMatch = containerText.match(/(?:SALE\s*PRICE|Retail\s*Price|Price)[\s:]*(\$[\d,]+(?:\.\d{2})?)/i) ||
                          containerText.match(/(\$[\d,]+(?:\.\d{2})?)/);
        const price = priceMatch?.[1];
        
        // Extract status
        const statusMatch = containerText.match(/Status:?\s*([^\n\r]+?)(?:\s*Odometer|$)/i);
        const status = statusMatch?.[1]?.trim();
        
        // Extract image
        const imageUrl = $container.find('img').first().attr('src') || 
                        $container.find('img').first().attr('data-src');
        
        // Parse title for year, brand, model
        const titleMatch = title.match(/(\d{4})\s+(\w+)\s+(.+)/i);
        const year = titleMatch?.[1] ? parseInt(titleMatch[1]) : undefined;
        const brand = titleMatch?.[2]?.trim();
        const model = titleMatch?.[3]?.trim();
        
        if (title.length > 5) {
          items.push({
            title,
            stockNumber,
            brand,
            model,
            year,
            price,
            status,
            imageUrl: imageUrl?.startsWith('http') ? imageUrl : imageUrl ? new URL(imageUrl, url).href : undefined,
          });
        }
      }
    });

    // Strategy 2: If no items found with h2, try looking for links with vehicle titles
    if (items.length === 0) {
      console.log('[Scraper] No items found with h2 strategy, trying link-based approach');
      
      $('a').each((_, element) => {
        const $link = $(element);
        const text = $link.text().trim();
        const href = $link.attr('href') || '';
        
        // Look for vehicle detail links
        if (text.match(/\d{4}\s+\w+/i) && (href.includes('/inventory/') || href.includes('/vehicle/'))) {
          const title = text;
          
          // Find parent container
          const $container = $link.closest('.vehicle-card, .inventory-item, .row, article, [class*="vehicle"]').length > 0
            ? $link.closest('.vehicle-card, .inventory-item, .row, article, [class*="vehicle"]')
            : $link.parent().parent();
          
          const containerText = $container.text();
          
          // Extract data
          const stockMatch = containerText.match(/Stock\s*(?:Number|#)?:?\s*([A-Z0-9]+)/i);
          const priceMatch = containerText.match(/(\$[\d,]+(?:\.\d{2})?)/);
          const imageUrl = $container.find('img').attr('src') || $link.find('img').attr('src');
          
          // Parse title
          const titleMatch = title.match(/(\d{4})\s+(\w+)\s+(.+)/i);
          
          if (title.length > 5 && items.length < 100) {
            items.push({
              title,
              stockNumber: stockMatch?.[1] || `STOCK-${items.length + 1}`,
              year: titleMatch?.[1] ? parseInt(titleMatch[1]) : undefined,
              brand: titleMatch?.[2],
              model: titleMatch?.[3],
              price: priceMatch?.[1],
              imageUrl: imageUrl?.startsWith('http') ? imageUrl : imageUrl ? new URL(imageUrl, url).href : undefined,
            });
          }
        }
      });
    }

    // Strategy 3: Generic fallback - look for any element with vehicle-like text
    if (items.length === 0) {
      console.log('[Scraper] Using generic fallback strategy');
      
      $('.vehicle-card, .inventory-item, [class*="vehicle-"], article').each((_, element) => {
        const $el = $(element);
        const text = $el.text().trim();
        
        // Look for title
        const title = $el.find('h2, h3, h4, .title, [class*="title"]').first().text().trim() || 
                     $el.find('a').first().text().trim();
        
        if (title.match(/\d{4}\s+\w+/i)) {
          const priceMatch = text.match(/(\$[\d,]+(?:\.\d{2})?)/);
          const stockMatch = text.match(/Stock\s*(?:Number|#)?:?\s*([A-Z0-9]+)/i);
          const imageUrl = $el.find('img').first().attr('src');
          
          const titleMatch = title.match(/(\d{4})\s+(\w+)\s+(.+)/i);
          
          items.push({
            title,
            stockNumber: stockMatch?.[1] || `STOCK-${items.length + 1}`,
            year: titleMatch?.[1] ? parseInt(titleMatch[1]) : undefined,
            brand: titleMatch?.[2],
            model: titleMatch?.[3],
            price: priceMatch?.[1],
            imageUrl: imageUrl?.startsWith('http') ? imageUrl : imageUrl ? new URL(imageUrl, url).href : undefined,
          });
        }
      });
    }

    console.log(`[Scraper] Extracted ${items.length} inventory items`);
    return items;

  } catch (error) {
    console.error('[Scraper] Error scraping inventory:', error);
    throw new Error(`Failed to scrape inventory: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Parse title string to extract year, brand, model
 */
export function parseVehicleTitle(title: string): {
  year?: number;
  brand?: string;
  model?: string;
} {
  const match = title.match(/(\d{4})\s+(\w+)\s+(.+)/i);
  
  return {
    year: match?.[1] ? parseInt(match[1]) : undefined,
    brand: match?.[2]?.trim(),
    model: match?.[3]?.trim(),
  };
}
