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

    // Wait a bit for JavaScript to render
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get page HTML
    const html = await page.content();
    
    // Parse with Cheerio
    const $ = cheerio.load(html);
    const items: ScrapedInventoryItem[] = [];

    // Novlan Bros specific selectors
    // Look for vehicle listing containers
    const vehicleSelectors = [
      '.vehicle-list-item',
      '.inventory-list-item',
      '[class*="vehicle-item"]',
      '[class*="inventory-item"]',
    ];

    let foundItems = false;
    
    // Try Novlan Bros specific structure first
    $('a').each((_, element) => {
      const $el = $(element);
      const href = $el.attr('href') || '';
      const text = $el.text().trim();
      
      // Look for vehicle detail links (e.g., contains year and Ford model)
      if (href.includes('/inventory/') && text.match(/\d{4}\s+Ford/i)) {
        const title = text.trim();
        
        // Find the parent container that has all the vehicle info
        const $parent = $el.closest('div').parent();
        
        // Extract price
        const priceText = $parent.find('[class*="price"], .price').text() ||
                         $parent.text().match(/\$[\d,]+(?:\.\d{2})?/)?.[0] || '';
        
        // Extract stock number
        const stockMatch = $parent.text().match(/Stock\s*(?:Number)?:?\s*([A-Z0-9]+)/i) ||
                          $parent.text().match(/Stock\s*#?\s*:?\s*([A-Z0-9]+)/i);
        const stockNumber = stockMatch?.[1] || `STOCK-${items.length + 1}`;
        
        // Extract status
        const status = $parent.text().match(/Status:?\s*([^\n]+)/i)?.[1]?.trim() || 'Available';
        
        // Extract image
        const imageUrl = $parent.find('img').first().attr('src') || 
                        $parent.find('img').first().attr('data-src') ||
                        $el.find('img').attr('src');
        
        // Parse title for year, brand, model
        const titleMatch = title.match(/(\d{4})\s+(Ford)\s+(.+)/i);
        const year = titleMatch?.[1] ? parseInt(titleMatch[1]) : undefined;
        const brand = titleMatch?.[2]?.trim() || 'Ford';
        const model = titleMatch?.[3]?.trim();
        
        if (title && title.length > 5) {
          items.push({
            title,
            stockNumber,
            brand,
            model,
            year,
            price: priceText,
            status,
            imageUrl: imageUrl?.startsWith('http') ? imageUrl : imageUrl ? new URL(imageUrl, url).href : undefined,
          });
          foundItems = true;
        }
      }
    });

    // If no items found with Novlan-specific approach, try generic selectors
    if (!foundItems) {
      console.log('[Scraper] Trying generic selectors...');
      
      for (const selector of vehicleSelectors) {
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
    }

    // Final fallback: Look for any links with vehicle-like text
    if (!foundItems) {
      console.log('[Scraper] Using fallback: looking for vehicle links');
      
      $('a').each((_, element) => {
        const $el = $(element);
        const text = $el.text().trim();
        const href = $el.attr('href');
        
        // Look for year + brand pattern
        if (text.match(/\d{4}\s+[A-Z]/i) && href && items.length < 50) {
          const titleMatch = text.match(/(\d{4})\s+([A-Z][A-Za-z]+)\s+(.+)/i);
          
          items.push({
            title: text,
            stockNumber: `AUTO-${items.length + 1}`,
            year: titleMatch?.[1] ? parseInt(titleMatch[1]) : undefined,
            brand: titleMatch?.[2],
            model: titleMatch?.[3],
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
