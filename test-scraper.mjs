import { scrapeInventoryFromUrl } from './server/inventoryScraper.ts';

const url = 'https://novlanbros.com/ford/inventory/?newUsed=New';
console.log('Testing scraper with:', url);

try {
  const items = await scrapeInventoryFromUrl(url);
  console.log(`\nFound ${items.length} items`);
  
  if (items.length > 0) {
    console.log('\nFirst 3 items:');
    items.slice(0, 3).forEach((item, i) => {
      console.log(`\n${i + 1}. ${item.title}`);
      console.log(`   Stock: ${item.stockNumber}`);
      console.log(`   Price: ${item.price || 'N/A'}`);
      console.log(`   Brand: ${item.brand || 'N/A'}`);
      console.log(`   Model: ${item.model || 'N/A'}`);
      console.log(`   Year: ${item.year || 'N/A'}`);
    });
  }
} catch (error) {
  console.error('Error:', error.message);
}
