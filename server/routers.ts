import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { enhanceAdText, generateAdImage, TEMPLATE_CONFIGS } from "./adEnhancement";
import { scrapeInventoryFromUrl } from "./inventoryScraper";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Dealer management
  dealers: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      let dealersList;
      if (ctx.user.role === 'admin') {
        dealersList = await db.getAllDealers();
      } else {
        dealersList = await db.getDealersByOwnerId(ctx.user.id);
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
      .query(async ({ input }) => {
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
  }),

  // Inventory management
  inventory: router({
    list: protectedProcedure
      .input(z.object({ dealerId: z.number() }))
      .query(async ({ input }) => {
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
        imageUrl: z.string().url().optional(),
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
          imageUrl: z.string().url().optional(),
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
            });
          } catch (error) {
            // Item might already exist, just update lastSeenAt
            console.log(`Item ${item.stockNumber} might already exist`);
          }
        }
        
        return { success: true, imported: items.length };
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
        imageUrl: z.string().url().optional(),
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
        facebookMarketplaceUrl: z.string().url().optional(),
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

        // For now, return the original image URL
        // TODO: Implement actual image enhancement with background templates
        return { imageUrl: item.imageUrl };
      }),

    sendToStaging: protectedProcedure
      .input(z.object({
        inventoryItemId: z.number(),
        description: z.string(),
        imageUrl: z.string(),
        template: z.string(),
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
      }))
      .mutation(async ({ input }) => {
        const enhancedText = await enhanceAdText(input);
        return { enhancedText };
      }),

    generateImage: protectedProcedure
      .input(z.object({
        vehicleImageUrl: z.string().url(),
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
        const result = await generateAdImage(input);
        return result;
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
  }),
});

export type AppRouter = typeof appRouter;
