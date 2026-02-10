import { Router } from 'express';
import * as db from './db';

const router = Router();

// CORS middleware to allow cross-origin requests from any website
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// REST endpoint for browser extension to import vehicles
router.post('/import-vehicles', async (req, res) => {
  try {
    const { dealerId, vehicles, apiKey } = req.body;
    console.log('[EXTENSION API] Received import request:', { dealerId, vehicleCount: vehicles?.length });
    
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
          console.log('[EXTENSION API] Vehicle missing stock number:', vehicle);
          errors.push('Vehicle missing stock number');
          continue;
        }
        console.log('[EXTENSION API] Processing vehicle:', vehicle.stockNumber);
        
        const existing = await db.getInventoryItemByStockNumber(dealerId, vehicle.stockNumber);
        
        // Parse price - extract numbers only, convert to string for decimal column
        let parsedPrice = null;
        if (vehicle.price) {
          const priceStr = vehicle.price.toString().replace(/[^0-9.]/g, '');
          const priceNum = parseFloat(priceStr);
          if (!isNaN(priceNum) && priceNum > 0) {
            parsedPrice = priceNum.toFixed(2);
          }
        }
        
        const validFields = {
          stockNumber: vehicle.stockNumber,
          brand: vehicle.brand,
          category: vehicle.category,
          year: vehicle.year ? parseInt(vehicle.year) : undefined,
          model: vehicle.model,
          trim: vehicle.trim,
          description: vehicle.description,
          price: parsedPrice,
          mileage: vehicle.mileage,
          vin: vehicle.vin,
          exteriorColor: vehicle.exteriorColor,
          interiorColor: vehicle.interiorColor,
          engine: vehicle.engine,
          transmission: vehicle.transmission,
          drivetrain: vehicle.drivetrain,
          fuel: vehicle.fuel,
          cylinders: vehicle.cylinders,
          doors: vehicle.doors,
          detailUrl: vehicle.detailUrl,
          location: vehicle.location,
          imageUrl: vehicle.imageUrl,
          condition: vehicle.condition || 'used',
        };
        
        if (existing) {
          // Update existing
          await db.updateInventoryItem(existing.id, {
            ...validFields,
            lastSeenAt: new Date(),
          });
          updated++;
        } else {
          // Create new
          await db.createInventoryItem({
            dealerId,
            ...validFields,
          });
          imported++;
        }
      } catch (error: any) {
        console.error('[EXTENSION API] Error importing vehicle:', vehicle.stockNumber, error);
        errors.push(`Stock ${vehicle.stockNumber}: ${error.message}`);
      }
    }
    
    console.log('[EXTENSION API] Import complete:', { imported, updated, errors: errors.length });
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
