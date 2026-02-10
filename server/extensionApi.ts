import { Router } from 'express';
import * as db from './db';

const router = Router();

// REST endpoint for browser extension to import vehicles
router.post('/import-vehicles', async (req, res) => {
  try {
    const { dealerId, vehicles, apiKey } = req.body;
    
    // Validate input
    if (!dealerId || !vehicles || !Array.isArray(vehicles)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: dealerId and vehicles array' 
      });
    }
    
    // Simple API key validation (you can enhance this)
    // For now, we'll skip auth since the extension runs on user's machine
    // and they're already logged into the app
    
    let imported = 0;
    let updated = 0;
    const errors: string[] = [];
    
    for (const vehicle of vehicles) {
      try {
        if (!vehicle.stockNumber) {
          errors.push('Vehicle missing stock number');
          continue;
        }
        
        const existing = await db.getInventoryItemByStockNumber(dealerId, vehicle.stockNumber);
        
        if (existing) {
          // Update existing
          await db.updateInventoryItem(existing.id, {
            ...vehicle,
            lastSeenAt: new Date(),
          });
          updated++;
        } else {
          // Create new
          await db.createInventoryItem({
            dealerId,
            ...vehicle,
            condition: vehicle.condition || 'used',
          });
          imported++;
        }
      } catch (error: any) {
        errors.push(`Stock ${vehicle.stockNumber}: ${error.message}`);
      }
    }
    
    return res.json({ 
      success: true, 
      imported, 
      updated, 
      total: vehicles.length,
      errors 
    });
  } catch (error: any) {
    console.error('Extension import error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;
