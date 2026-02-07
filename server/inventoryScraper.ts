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

    // Wait for inventory items to load (adjust selector based on site)
    await page.waitForSelector('.vehicle-card, .inventory-item, [class*="vehicle"], [class*="item"]', {
      timeout: 15000,
    }).catch(() => {
      console.log('[Scraper] No standard selectors found, will try generic parsing');
    });

    // Get page HTML
    const html = await page.content();
    
    // Parse with Cheerio
    const $ = cheerio.load(html);
    const items: ScrapedInventoryItem[] = [];

    // Try multiple common patterns for inventory items
    const selectors = [
      '.vehicle-card',
      '.inventory-item',
      '[class*="vehicle-"]',
      'article',
      '.product-card',
      '[data-vehicle]',
    ];

    let foundItems = false;
    
    for (const selector of selectors) {
      const elements = $(selector);
      
      if (elements.length > 0) {
        console.log(`[Scraper] Found ${elements.length} items with selector: ${selector}`);
        foundItems = true;
        
        elements.each((_, element) => {
          const $el = $(element);
          
          // Extract text content
          const text = $el.text().trim();
          
          // Try to extract structured data
          const title = $el.find('h2, h3, h4, .title, [class*="title"]').first().text().trim() || 
                       $el.find('a').first().text().trim();
          
          const priceText = $el.find('[class*="price"], .price, [data-price]').text().trim();
          const price = priceText.match(/\$[\d,]+(?:\.\d{2})?/)?.[0];
          
          const stockText = text.match(/(?:Stock|Stock Number|#)\s*:?\s*([A-Z0-9]+)/i)?.[1] ||
                           $el.find('[class*="stock"]').text().trim();
          
          const imageUrl = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src');
          
          // Parse title for year, brand, model
          const titleMatch = title.match(/(\d{4})?\s*([A-Z\s]+?)\s+([A-Z0-9.\-\s]+)/i);
          const year = titleMatch?.[1] ? parseInt(titleMatch[1]) : undefined;
          const brand = titleMatch?.[2]?.trim();
          const model = titleMatch?.[3]?.trim();
          
          // Extract category
          const category = $el.find('[class*="category"], .category').text().trim() ||
                          text.match(/Category:\s*([^\n]+)/i)?.[1]?.trim();
          
          // Extract location
          const location = $el.find('[class*="location"], .location').text().trim() ||
                          text.match(/Location:\s*([^\n]+)/i)?.[1]?.trim();
          
          // Extract status
          const status = $el.find('[class*="status"], .status, .badge').text().trim() ||
                        (text.includes('In Stock') ? 'In Stock' : undefined);
          
          if (title && title.length > 3) {
            items.push({
              title,
              stockNumber: stockText || `ITEM-${items.length + 1}`,
              brand,
              model,
              year,
              price,
              category,
              location,
              imageUrl: imageUrl?.startsWith('http') ? imageUrl : imageUrl ? new URL(imageUrl, url).href : undefined,
              status,
            });
          }
        });
        
        break; // Stop after finding items with first successful selector
      }
    }

    if (!foundItems) {
      console.log('[Scraper] No inventory items found with standard selectors, trying fallback');
      
      // Fallback: Look for any links with vehicle-like text
      $('a').each((_, element) => {
        const $el = $(element);
        const text = $el.text().trim();
        const href = $el.attr('href');
        
        // Look for year + brand pattern
        if (text.match(/\d{4}\s+[A-Z]/i) && href) {
          items.push({
            title: text,
            stockNumber: `AUTO-${items.length + 1}`,
            imageUrl: $el.find('img').attr('src'),
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
  const match = title.match(/(\d{4})?\s*([A-Z][A-Z\s]+?)\s+([A-Z0-9.\-\s]+)/i);
  
  return {
    year: match?.[1] ? parseInt(match[1]) : undefined,
    brand: match?.[2]?.trim(),
    model: match?.[3]?.trim(),
  };
}
