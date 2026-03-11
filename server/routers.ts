import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { enhanceAdText, generateAdImage, TEMPLATE_CONFIGS } from "./adEnhancement";
import { scrapeInventoryFromUrl } from "./inventoryScraper";
import { parse } from "csv-parse/sync";
import { sdk } from "./_core/sdk";
import bcrypt from "bcryptjs";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => {
      if (!opts.ctx.user) return null;
      const { passwordHash, ...safeUser } = opts.ctx.user;
      return safeUser;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    login: publicProcedure
      .input(z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await db.getUserByUsername(input.username);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid username or password" });
        }

        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid username or password" });
        }

        // Create session
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || user.username || "",
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: 1000 * 60 * 60 * 24 * 365,
        });

        // Update last signed in
        await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });

        return {
          success: true,
          mustChangePassword: user.mustChangePassword ?? false,
        };
      }),
    changePassword: protectedProcedure
      .input(z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ input, ctx }) => {
        const user = await db.getUserById(ctx.user.id);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot change password for this account" });
        }

        const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect" });
        }

        const newHash = await bcrypt.hash(input.newPassword, 10);
        await db.updateUserPassword(user.id, newHash, false);

        return { success: true };
      }),
  }),

  // Dealer management
  dealers: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      let dealersList;
      
      // Super admin (dealerId = null) sees all dealers
      // Dealer-specific users only see their assigned dealer
      if (ctx.user.dealerId === null || ctx.user.dealerId === undefined) {
        dealersList = await db.getAllDealers();
      } else {
        const dealer = await db.getDealerById(ctx.user.dealerId);
        dealersList = dealer ? [dealer] : [];
      }
      
      // Add inventory count for each dealer
      const dealersWithCount = await Promise.all(
        dealersList.map(async (dealer) => {
          const count = await db.getInventoryCountByDealer(dealer.id);
          return { ...dealer, inventoryCount: count };
        })
      );
      
      return dealersWithCount;
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        // Check access: super admin can access any dealer, others only their own
        if (ctx.user.dealerId !== null && ctx.user.dealerId !== undefined && ctx.user.dealerId !== input.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied to this dealer' });
        }
        return await db.getDealerById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
        contactEmail: z.string().email().or(z.literal('')).optional(),
        contactPhone: z.string().optional(),
        websiteUrl: z.string().url().or(z.literal('')).optional(),
        logoUrl: z.string().url().or(z.literal('')).optional(),
        brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dealer = await db.createDealer({
          ...input,
          ownerId: ctx.user.id,
        });
        return { success: true, dealer };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        contactEmail: z.string().email().or(z.literal('')).optional(),
        contactPhone: z.string().optional(),
        websiteUrl: z.string().url().or(z.literal('')).optional(),
        logoUrl: z.string().url().or(z.literal('')).optional(),
        brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.updateDealer(id, updates);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.deleteDealer(input.id);
        return { success: true };
      }),
  }),

  // Inventory management
  inventory: router({
    list: protectedProcedure
      .input(z.object({ dealerId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Check access: dealer-specific users can only access their own dealer's inventory
        if (ctx.user.dealerId !== null && ctx.user.dealerId !== undefined && ctx.user.dealerId !== input.dealerId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied to this dealer\'s inventory' });
        }
        return await db.getInventoryItemsByDealerId(input.dealerId);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getInventoryItemById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        dealerId: z.number(),
        stockNumber: z.string().min(1),
        brand: z.string().optional(),
        category: z.string().optional(),
        year: z.number().optional(),
        model: z.string().optional(),
        description: z.string().optional(),
        price: z.string().optional(), // decimal as string
        location: z.string().optional(),
        imageUrl: z.string().optional(), // can be a relative /uploads/ path or full URL
        condition: z.enum(['new', 'used']).default('used'),
      }))
      .mutation(async ({ input }) => {
        const item = await db.createInventoryItem(input);
        return { success: true, item };
      }),

    bulkImport: protectedProcedure
      .input(z.object({
        dealerId: z.number(),
        items: z.array(z.object({
          stockNumber: z.string().min(1),
          brand: z.string().optional(),
          category: z.string().optional(),
          year: z.number().optional(),
          model: z.string().optional(),
          description: z.string().optional(),
          price: z.string().optional(),
          location: z.string().optional(),
          imageUrl: z.string().optional(), // can be a relative /uploads/ path or full URL
          condition: z.enum(['new', 'used']).default('used'),
        }))
      }))
      .mutation(async ({ input }) => {
        const { dealerId, items } = input;
        
        // Get current active stock numbers
        const activeStockNumbers = items.map(item => item.stockNumber);
        
        // Mark items not in the import as sold
        if (activeStockNumbers.length > 0) {
          await db.markItemsAsSold(dealerId, activeStockNumbers);
        }
        
        // Update lastSeenAt for existing items
        await db.updateLastSeenAt(dealerId, activeStockNumbers);
        
        // Insert new items
        for (const item of items) {
          try {
            await db.createInventoryItem({
              ...item,
              dealerId,
              // Map category to condition (scraper uses 'category', DB uses 'condition')
              condition: (item.category === 'new' || item.category === 'used') ? item.category as 'new' | 'used' : item.condition,
            });
          } catch (error) {
            // Item might already exist, just update lastSeenAt
            console.log(`Item ${item.stockNumber} might already exist`);
          }
        }
        
        return { success: true, imported: items.length };
      }),

    importCsv: protectedProcedure
      .input(z.object({
        dealerId: z.number(),
        csvContent: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { dealerId, csvContent } = input;
        
        try {
          // Parse CSV
          const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true,
          });
          
          if (records.length === 0) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'CSV file is empty' });
          }
          
          // Map CSV columns to inventory items
          const items = records.map((record: any) => ({
            stockNumber: record.stockNumber || record.stock || record.Stock || '',
            brand: record.brand || record.make || record.Make || undefined,
            model: record.model || record.Model || undefined,
            year: record.year || record.Year ? parseInt(record.year || record.Year) : undefined,
            trim: record.trim || record.Trim || undefined,
            price: record.price || record.Price || undefined,
            mileage: record.mileage || record.Mileage || undefined,
            vin: record.vin || record.VIN || record.Vin || undefined,
            category: record.category || record.Category || undefined,
            location: record.location || record.Location || undefined,
            imageUrl: record.imageUrl || record.image || record.Image || undefined,
            description: record.description || record.Description || undefined,
            condition: (record.condition === 'new' || record.category === 'new') ? 'new' as const : 'used' as const,
          })).filter((item: any) => item.stockNumber); // Filter out items without stock numbers
          
          if (items.length === 0) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'No valid items found in CSV. Ensure stockNumber column exists.' });
          }
          
          // Get current active stock numbers
          const activeStockNumbers = items.map((item: any) => item.stockNumber);
          
          // Mark items not in the import as sold
          if (activeStockNumbers.length > 0) {
            await db.markItemsAsSold(dealerId, activeStockNumbers);
          }
          
          // Update lastSeenAt for existing items
          await db.updateLastSeenAt(dealerId, activeStockNumbers);
          
          // Insert or update items
          let imported = 0;
          let updated = 0;
          for (const item of items) {
            try {
              await db.createInventoryItem({
                ...item,
                dealerId,
              });
              imported++;
            } catch (error) {
              // Item might already exist, just update lastSeenAt (already done above)
              updated++;
            }
          }
          
          return { 
            success: true, 
            imported, 
            updated,
            total: items.length 
          };
        } catch (error: any) {
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: `Failed to parse CSV: ${error.message}` 
          });
        }
      }),

    importFromExtension: protectedProcedure
      .input(z.object({
        dealerId: z.number(),
        vehicles: z.array(z.object({
          stockNumber: z.string(),
          brand: z.string().optional(),
          model: z.string().optional(),
          year: z.number().optional(),
          trim: z.string().optional(),
          price: z.string().optional(),
          mileage: z.string().optional(),
          vin: z.string().optional(),
          category: z.string().optional(),
          location: z.string().optional(),
          imageUrl: z.string().optional(),
          description: z.string().optional(),
          condition: z.enum(['new', 'used']).optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        const { dealerId, vehicles } = input;
        
        let imported = 0;
        let updated = 0;
        const errors: string[] = [];
        
        for (const vehicle of vehicles) {
          try {
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
        
        return { success: true, imported, updated, errors };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        brand: z.string().optional(),
        category: z.string().optional(),
        year: z.number().optional(),
        model: z.string().optional(),
        description: z.string().optional(),
        price: z.string().optional(),
        location: z.string().optional(),
        imageUrl: z.string().optional(), // can be a single URL or JSON array of URLs
        status: z.enum(['active', 'sold', 'archived']).optional(),
        condition: z.enum(['new', 'used']).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.updateInventoryItem(id, updates);
        return { success: true };
      }),

    scrapeUrl: protectedProcedure
      .input(z.object({
        url: z.string().url(),
      }))
      .mutation(async ({ input }) => {
        try {
          const items = await scrapeInventoryFromUrl(input.url);
          return { success: true, items };
        } catch (error) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: error instanceof Error ? error.message : 'Failed to scrape URL',
          });
        }
      }),

    deleteAll: protectedProcedure
      .input(z.object({
        dealerId: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.deleteAllInventoryByDealer(input.dealerId);
        return { success: true };
      }),

    deleteSingle: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.deleteInventoryItem(input.id);
        return { success: true };
      }),

    fetchFullDescription: protectedProcedure
      .input(z.object({
        inventoryItemId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const item = await db.getInventoryItemById(input.inventoryItemId);
        if (!item) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Vehicle not found' });
        }
        
        if (!item.detailUrl) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'No detail URL available for this vehicle' });
        }
        
        // Fetch the detail page HTML
        const response = await fetch(item.detailUrl);
        if (!response.ok) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to fetch detail page' });
        }
        
        const html = await response.text();
        
        // Parse HTML to extract description
        // D2C Media sites use specific selectors for vehicle descriptions
        const descriptionMatch = html.match(/<div class="vehicleDescription"[^>]*>(.*?)<\/div>/s) ||
                                html.match(/<div class="description"[^>]*>(.*?)<\/div>/s) ||
                                html.match(/<div class="comments"[^>]*>(.*?)<\/div>/s);
        
        let fullDescription = item.description || '';
        
        if (descriptionMatch && descriptionMatch[1]) {
          // Strip HTML tags and clean up
          fullDescription = descriptionMatch[1]
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/\s+/g, ' ')
            .trim();
        }
        
        // Update the vehicle with the full description
        if (fullDescription && fullDescription !== item.description) {
          await db.updateInventoryItem(item.id, { description: fullDescription });
          return { success: true, description: fullDescription };
        }
        
        return { success: false, message: 'No description found on detail page' };
      }),

    batchEnhance: protectedProcedure
      .input(z.object({
        dealerId: z.number(),
        template: z.enum(['flash_sale', 'premium', 'value', 'event', 'creator', 'trending']),
      }))
      .mutation(async ({ input }) => {
        // Get all new vehicles for this dealer
        const items = await db.getInventoryItemsByDealerId(input.dealerId);
        const newVehicles = items.filter(item => item.condition === 'new' && item.imageUrl);

        if (newVehicles.length === 0) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'No new vehicles with images to enhance' });
        }

        // Get dealer info for branding
        const dealer = await db.getDealerById(input.dealerId);
        if (!dealer) throw new TRPCError({ code: 'NOT_FOUND', message: 'Dealer not found' });

        // Template-specific prompts
        const getPrompt = (template: string, vehicle: any) => {
          const templatePrompts: Record<string, string> = {
            flash_sale: `Create a vibrant, eye-catching promotional image with a bold red and orange gradient background. The vehicle should be prominently featured in the center with dramatic lighting. Add a large "FLASH SALE" or "LIMITED TIME" text overlay in bold yellow/white text. Include the price $${vehicle.price} in large numbers. Add urgency elements like "ACT NOW" or countdown styling. Include dealer branding: ${dealer.name}${dealer.tagline ? ` - ${dealer.tagline}` : ''}${dealer.logoUrl ? '. Incorporate the dealer logo from ${dealer.logoUrl}' : ''}. Professional automotive advertising style with high energy and urgency.`,
            premium: `Create an elegant, luxury promotional image with a sophisticated gold and black gradient background. The vehicle should be showcased with premium studio lighting, emphasizing its luxury features. Add subtle gold accent lines or borders. Include the price $${vehicle.price} in elegant serif font. Add "PREMIUM SELECTION" or "LUXURY COLLECTION" text in refined typography. Dealer: ${dealer.name}. High-end automotive advertising with sophisticated, upscale aesthetic.`,
            value: `Create a friendly, appealing promotional image with a fresh green and white gradient background. The vehicle should be well-lit and inviting. Add "GREAT VALUE" or "BEST DEAL" text in bold, friendly font. Prominently display the price $${vehicle.price} with "SAVE" or "SPECIAL PRICE" messaging. Include value indicators like "LOW MILEAGE" or "CERTIFIED". Dealer: ${dealer.name}. Professional yet approachable automotive advertising emphasizing affordability and value.`,
            event: `Create a festive, celebratory promotional image with a dynamic blue and purple gradient background with confetti or celebration elements. The vehicle should be featured with bright, energetic lighting. Add "SPECIAL EVENT" or "CLEARANCE SALE" text in bold, exciting font. Display the price $${vehicle.price} prominently. Include event messaging like "LIMITED TIME EVENT" or "CELEBRATION PRICING". Dealer: ${dealer.name}. Energetic automotive advertising with festive, promotional atmosphere.`,
            creator: `Create a modern, artistic promotional image with a creative teal and pink gradient background with geometric patterns or abstract design elements. The vehicle should be showcased with contemporary, stylish lighting. Add modern typography for "FEATURED VEHICLE" or "EXCLUSIVE OFFER". Display the price $${vehicle.price} in trendy font. Include design-forward elements that appeal to creative, style-conscious buyers. Dealer: ${dealer.name}. Contemporary automotive advertising with artistic, Instagram-worthy aesthetic.`,
            trending: `Create a bold, attention-grabbing promotional image with a striking orange and red gradient background with dynamic motion lines or energy effects. The vehicle should be dramatically lit to create maximum visual impact. Add "TRENDING NOW" or "HOT DEAL" text in bold, modern font. Prominently feature the price $${vehicle.price} with "DON'T MISS OUT" messaging. Include trending indicators like fire emojis or popularity badges. Dealer: ${dealer.name}. High-impact automotive advertising with viral, social media-ready styling.`,
          };
          return templatePrompts[template];
        };

        // Dynamic import to avoid circular dependency
        const { generateImage } = await import('./_core/imageGeneration');

        // Enhance each vehicle (sequentially to avoid rate limits)
        const results = [];
        for (const vehicle of newVehicles) {
          try {
            const result = await generateImage({
              prompt: getPrompt(input.template, vehicle),
              originalImages: [{
                url: vehicle.imageUrl!,
                mimeType: 'image/jpeg',
              }],
            });
            results.push({ vehicleId: vehicle.id, imageUrl: result.url });
          } catch (error) {
            console.error(`Failed to enhance vehicle ${vehicle.id}:`, error);
          }
        }

        return { success: true, enhanced: results.length, total: newVehicles.length, results };
      }),
  }),

  // Facebook ads management
  ads: router({
    list: protectedProcedure
      .input(z.object({ dealerId: z.number() }))
      .query(async ({ input }) => {
        return await db.getFacebookAdsByDealerId(input.dealerId);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getFacebookAdById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        dealerId: z.number(),
        inventoryItemId: z.number(),
        templateId: z.number().optional(),
        originalText: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createFacebookAd(input);
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        templateId: z.number().optional(),
        enhancedText: z.string().optional(),
        finalText: z.string().optional(),
        imageUrl: z.string().optional(),
        imageFileKey: z.string().optional(),
        status: z.enum(['draft', 'staged', 'published']).optional(),
        facebookMarketplaceUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        
        // If publishing, set publishedAt timestamp
        if (updates.status === 'published') {
          await db.updateFacebookAd(id, {
            ...updates,
            publishedAt: new Date(),
          });
        } else {
          await db.updateFacebookAd(id, updates);
        }
        
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteFacebookAd(input.id);
        return { success: true };
      }),

    published: protectedProcedure
      .input(z.object({ dealerId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPublishedAdsByDealerId(input.dealerId);
      }),

    regenerateDescription: protectedProcedure
      .input(z.object({
        inventoryItemId: z.number(),
        tone: z.enum(['professional', 'casual', 'enthusiast']),
      }))
      .mutation(async ({ input }) => {
        const item = await db.getInventoryItemById(input.inventoryItemId);
        if (!item) throw new TRPCError({ code: 'NOT_FOUND', message: 'Inventory item not found' });

        const tonePrompts = {
          professional: 'Write a professional, detailed description highlighting key features and specifications.',
          casual: 'Write a friendly, conversational description that makes the vehicle sound appealing.',
          enthusiast: 'Write an exciting, passionate description that captures the thrill of owning this vehicle.',
        };

        const { invokeLLM } = await import('./_core/llm');
        const response = await invokeLLM({
          messages: [
            {
              role: 'system',
              content: `You are a professional automotive copywriter. ${tonePrompts[input.tone]}`,
            },
            {
              role: 'user',
              content: `Write a compelling Facebook Marketplace description for this vehicle:\n\nYear: ${item.year}\nBrand: ${item.brand}\nModel: ${item.model}\nCategory: ${item.category || 'N/A'}\nPrice: $${item.price}\nCondition: ${item.condition}\n\nOriginal description: ${item.description || 'No description provided'}`,
            },
          ],
        });

        const description = response.choices[0]?.message?.content || item.description;
        return { description };
      }),

    enhanceImage: protectedProcedure
      .input(z.object({
        inventoryItemId: z.number(),
        template: z.enum(['flash_sale', 'premium', 'value', 'event', 'creator', 'trending']),
      }))
      .mutation(async ({ input }) => {
        const item = await db.getInventoryItemById(input.inventoryItemId);
        if (!item) throw new TRPCError({ code: 'NOT_FOUND', message: 'Inventory item not found' });
        if (!item.imageUrl) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No image to enhance' });

        // Get dealer info for branding
        const dealer = await db.getDealerById(item.dealerId);
        if (!dealer) throw new TRPCError({ code: 'NOT_FOUND', message: 'Dealer not found' });

        // Template-specific prompts for AI image generation
        const templatePrompts: Record<string, string> = {
          flash_sale: `Create a vibrant, eye-catching promotional image with a bold red and orange gradient background. The vehicle should be prominently featured in the center with dramatic lighting. Add a large "FLASH SALE" or "LIMITED TIME" text overlay in bold yellow/white text. Include the price $${item.price} in large numbers. Add urgency elements like "ACT NOW" or countdown styling. Include dealer branding: ${dealer.name}${dealer.tagline ? ` - ${dealer.tagline}` : ''}${dealer.logoUrl ? '. Incorporate the dealer logo from ${dealer.logoUrl}' : ''}. Professional automotive advertising style with high energy and urgency.`,
          premium: `Create an elegant, luxury promotional image with a sophisticated gold and black gradient background. The vehicle should be showcased with premium studio lighting, emphasizing its luxury features. Add subtle gold accent lines or borders. Include the price $${item.price} in elegant serif font. Add "PREMIUM SELECTION" or "LUXURY COLLECTION" text in refined typography. Dealer: ${dealer.name}. High-end automotive advertising with sophisticated, upscale aesthetic.`,
          value: `Create a friendly, appealing promotional image with a fresh green and white gradient background. The vehicle should be well-lit and inviting. Add "GREAT VALUE" or "BEST DEAL" text in bold, friendly font. Prominently display the price $${item.price} with "SAVE" or "SPECIAL PRICE" messaging. Include value indicators like "LOW MILEAGE" or "CERTIFIED". Dealer: ${dealer.name}. Professional yet approachable automotive advertising emphasizing affordability and value.`,
          event: `Create a festive, celebratory promotional image with a dynamic blue and purple gradient background with confetti or celebration elements. The vehicle should be featured with bright, energetic lighting. Add "SPECIAL EVENT" or "CLEARANCE SALE" text in bold, exciting font. Display the price $${item.price} prominently. Include event messaging like "LIMITED TIME EVENT" or "CELEBRATION PRICING". Dealer: ${dealer.name}. Energetic automotive advertising with festive, promotional atmosphere.`,
          creator: `Create a modern, artistic promotional image with a creative teal and pink gradient background with geometric patterns or abstract design elements. The vehicle should be showcased with contemporary, stylish lighting. Add modern typography for "FEATURED VEHICLE" or "EXCLUSIVE OFFER". Display the price $${item.price} in trendy font. Include design-forward elements that appeal to creative, style-conscious buyers. Dealer: ${dealer.name}. Contemporary automotive advertising with artistic, Instagram-worthy aesthetic.`,
          trending: `Create a bold, attention-grabbing promotional image with a striking orange and red gradient background with dynamic motion lines or energy effects. The vehicle should be dramatically lit to create maximum visual impact. Add "TRENDING NOW" or "HOT DEAL" text in bold, modern font. Prominently feature the price $${item.price} with "DON'T MISS OUT" messaging. Include trending indicators like fire emojis or popularity badges. Dealer: ${dealer.name}. High-impact automotive advertising with viral, social media-ready styling.`,
        };

        const prompt = templatePrompts[input.template];
        
        // Use AI image generation with the original vehicle image as reference
        const { generateImage } = await import('./_core/imageGeneration');
        const result = await generateImage({
          prompt,
          originalImages: [{
            url: item.imageUrl,
            mimeType: 'image/jpeg',
          }],
        });

        return { imageUrl: result.url };
      }),

    sendToStaging: protectedProcedure
      .input(z.object({
        inventoryItemId: z.number(),
        description: z.string(),
        imageUrl: z.string(),
        template: z.string(),
        price: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const item = await db.getInventoryItemById(input.inventoryItemId);
        if (!item) throw new TRPCError({ code: 'NOT_FOUND', message: 'Inventory item not found' });

        // Create a new Facebook ad in draft/staged status
        await db.createFacebookAd({
          dealerId: item.dealerId,
          inventoryItemId: item.id,
          originalText: item.description || '',
          enhancedText: input.description,
          imageUrl: input.imageUrl,
          status: 'staged',
        });

        return { success: true };
      }),
  }),

  // Background templates
  templates: router({
    list: publicProcedure.query(async () => {
      return await db.getAllBackgroundTemplates();
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getBackgroundTemplateById(input.id);
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        previewUrl: z.string().optional(),
        templateType: z.enum([
          "gradient_modern",
          "gradient_sunset",
          "solid_professional",
          "textured_premium",
          "branded_dealer",
          "seasonal_special"
        ]),
        config: z.string(), // JSON string
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createBackgroundTemplate(input);
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        previewUrl: z.string().optional(),
        config: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.updateBackgroundTemplate(id, updates);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteBackgroundTemplate(input.id);
        return { success: true };
      }),
  }),

  // AI enhancement
  enhance: router({
    text: protectedProcedure
      .input(z.object({
        brand: z.string().optional(),
        model: z.string().optional(),
        year: z.number().optional(),
        category: z.string().optional(),
        price: z.string().optional(),
        description: z.string().optional(),
        condition: z.string().optional(),
        tone: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const enhancedText = await enhanceAdText(input);
        return { enhancedText };
      }),

    generateImage: protectedProcedure
      .input(z.object({
        itemImageUrl: z.string().url(),
        templateType: z.enum([
          "gradient_modern",
          "gradient_sunset",
          "solid_professional",
          "textured_premium",
          "branded_dealer",
          "seasonal_special"
        ]),
        brandColor: z.string().optional(),
        overlayText: z.object({
          title: z.string(),
          price: z.string().optional(),
          subtitle: z.string().optional(),
        }),
        stockNumber: z.string().optional(),
        brand: z.string().optional(),
        model: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // AI image generation (Forge API) is not available in this environment.
        // Return the original item image URL directly so the Ad Creator workflow continues.
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const nameParts = [];
        if (input.brand) nameParts.push(input.brand.replace(/\s+/g, '-'));
        if (input.model) nameParts.push(input.model.replace(/\s+/g, '-'));
        const descriptiveName = nameParts.length > 0 ? nameParts.join('-') : 'ad';
        const filename = `${descriptiveName}-${input.templateType}.jpg`;
        const fileKey = `ads/${timestamp}-${random}-${filename}`;
        return {
          url: input.itemImageUrl,
          fileKey,
          filename,
        };
      }),
  }),

  // Generated content
  content: router({
    list: protectedProcedure
      .input(z.object({ dealerId: z.number() }))
      .query(async ({ input }) => {
        return await db.getGeneratedContentByDealerId(input.dealerId);
      }),

    getByAdId: protectedProcedure
      .input(z.object({ facebookAdId: z.number() }))
      .query(async ({ input }) => {
        return await db.getGeneratedContentByAdId(input.facebookAdId);
      }),

    create: protectedProcedure
      .input(z.object({
        dealerId: z.number(),
        facebookAdId: z.number(),
        contentType: z.enum(['pillar_page', 'blog_post', 'badge_image']),
        title: z.string().optional(),
        content: z.string().optional(),
        badgeImageUrl: z.string().optional(),
        badgeImageFileKey: z.string().optional(),
        exportFormat: z.enum(['markdown', 'html', 'json']).default('markdown'),
        metadata: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createGeneratedContent(input);
        return { success: true };
      }),

    generateContent: protectedProcedure
      .input(z.object({
        facebookAdId: z.number(),
      }))
      .mutation(async ({ input }) => {
        // Get the Facebook ad and related data
        const ad = await db.getFacebookAdById(input.facebookAdId);
        if (!ad) throw new TRPCError({ code: 'NOT_FOUND', message: 'Facebook ad not found' });

        const vehicle = await db.getInventoryItemById(ad.inventoryItemId);
        if (!vehicle) throw new TRPCError({ code: 'NOT_FOUND', message: 'Vehicle not found' });

        const dealer = await db.getDealerById(ad.dealerId);
        if (!dealer) throw new TRPCError({ code: 'NOT_FOUND', message: 'Dealer not found' });

        // Build item title for general use
        const itemParts = [vehicle.year, vehicle.brand, vehicle.model].filter(Boolean);
        const itemTitle = itemParts.length > 0 ? itemParts.join(' ') : vehicle.category || 'Item';
        // Use the original ad image as the badge image (AI image editing not available in this environment)
        const badgeImageUrl = ad.imageUrl || null;
        if (badgeImageUrl) {
          await db.createGeneratedContent({
            dealerId: ad.dealerId,
            facebookAdId: input.facebookAdId,
            contentType: 'badge_image',
            badgeImageUrl: badgeImageUrl,
            exportFormat: 'json',
          });
        }

        // Generate pillar page content using LLM
        const { invokeLLM } = await import('./_core/llm');
        const pillarResponse = await invokeLLM({
          messages: [
            {
              role: 'system',
              content: 'You are an expert content writer specializing in SEO-optimized pillar pages for Facebook Marketplace sellers. Write comprehensive, engaging content that highlights item features, quality, and value. Adapt your writing style to the type of item — artwork, furniture, electronics, vehicles, etc.',
            },
            {
              role: 'user',
              content: `Write a comprehensive pillar page article (800-1200 words) about this item currently featured on Facebook Marketplace:\n\nItem: ${itemTitle}\nCategory: ${vehicle.category || 'General'}\nPrice: ${vehicle.price ? '$' + vehicle.price : 'Contact for price'}\nCondition: ${vehicle.condition}\nDescription: ${vehicle.description || 'N/A'}\nSeller: ${dealer.name}${dealer.tagline ? ` - ${dealer.tagline}` : ''}\n\nInclude:\n1. Engaging headline\n2. Item overview and key features\n3. Quality and craftsmanship highlights (adapt to item type — e.g. for artwork: medium, style, dimensions; for furniture: materials, dimensions; for electronics: specs)\n4. Why this item is special or unique\n5. Value proposition\n6. Call-to-action mentioning it's featured on Facebook Marketplace\n\nFormat in Markdown with proper headings (##, ###). Make it SEO-friendly and engaging.`,
            },
          ],
        });

        const pillarContent = typeof pillarResponse.choices[0].message.content === 'string' 
          ? pillarResponse.choices[0].message.content 
          : JSON.stringify(pillarResponse.choices[0].message.content);
        const pillarTitle = `${itemTitle} - Featured on Facebook Marketplace | ${dealer.name}`;
        await db.createGeneratedContent({
          dealerId: ad.dealerId,
          facebookAdId: input.facebookAdId,
          contentType: 'pillar_page',
          title: pillarTitle,
          content: pillarContent,
          exportFormat: 'markdown',
          metadata: JSON.stringify({
            seoTitle: pillarTitle,
            seoDescription: `Discover this ${itemTitle} now featured on Facebook Marketplace. ${vehicle.description?.substring(0, 100) || 'Great item at a great price'}.`,
            keywords: `${vehicle.brand || ''} ${vehicle.model || ''}, ${itemTitle}, ${dealer.name}, Facebook Marketplace`.trim(),
          }),
        });;

        // Generate blog post using LLM
        const blogResponse = await invokeLLM({
          messages: [
            {
              role: 'system',
              content: 'You are an expert blogger writing engaging, conversational blog posts for Facebook Marketplace sellers. Adapt your style to the item type — artwork, furniture, electronics, vehicles, etc.',
            },
            {
              role: 'user',
              content: `Write a short blog post (300-500 words) about this item now featured on Facebook Marketplace:\n\nItem: ${itemTitle}\nCategory: ${vehicle.category || 'General'}\nPrice: ${vehicle.price ? '$' + vehicle.price : 'Contact for price'}\nCondition: ${vehicle.condition}\nDescription: ${vehicle.description || 'N/A'}\nSeller: ${dealer.name}\n\nMake it conversational and engaging. Highlight what makes this item special. Mention it's now available on Facebook Marketplace. Include a call-to-action. Format in Markdown.`,
            },
          ],
        });
        const blogContent = typeof blogResponse.choices[0].message.content === 'string' 
          ? blogResponse.choices[0].message.content 
          : JSON.stringify(blogResponse.choices[0].message.content);
        const blogTitle = `Check Out This ${itemTitle} on Facebook Marketplace!`;;

        await db.createGeneratedContent({
          dealerId: ad.dealerId,
          facebookAdId: input.facebookAdId,
          contentType: 'blog_post',
          title: blogTitle,
          content: blogContent,
          exportFormat: 'markdown',
        });

        return {
          success: true,
          badgeImageUrl: badgeImageUrl,
          pillarTitle,
          blogTitle,
        };
      }),
   }),

  // Image upload endpoint - saves to local uploads directory and serves as static files
  uploadImage: protectedProcedure
    .input(z.object({
      base64Data: z.string(),
      mimeType: z.string().default('image/jpeg'),
      filename: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const fs = await import('fs');
      const path = await import('path');
      // Decode base64 to buffer
      const base64 = input.base64Data.replace(/^data:[^;]+;base64,/, '');
      const buffer = Buffer.from(base64, 'base64');
      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      const ext = (input.mimeType.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
      const safeName = (input.filename || `upload-${timestamp}`).replace(/[^a-z0-9.-]/gi, '-').replace(/\.[^.]+$/, '');
      const filename = `${timestamp}-${random}-${safeName}.${ext}`;
      // Save to local uploads directory
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, buffer);
      // Return the public URL (served as static files at /uploads)
      const url = `/uploads/${filename}`;
      return { url, key: `uploads/${filename}` };
    }),
});
export type AppRouter = typeof appRouter;
