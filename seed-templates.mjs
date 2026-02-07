import { drizzle } from "drizzle-orm/mysql2";
import { backgroundTemplates } from "./drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

const templates = [
  {
    name: "Modern Gradient",
    description: "Professional blue-purple gradient background",
    templateType: "gradient_modern",
    previewImageUrl: null,
  },
  {
    name: "Sunset Gradient",
    description: "Warm pink-red gradient for eye-catching ads",
    templateType: "gradient_sunset",
    previewImageUrl: null,
  },
  {
    name: "Professional Solid",
    description: "Clean navy blue solid background",
    templateType: "solid_professional",
    previewImageUrl: null,
  },
  {
    name: "Premium Textured",
    description: "Sophisticated dark background with subtle texture",
    templateType: "textured_premium",
    previewImageUrl: null,
  },
  {
    name: "Branded Dealer",
    description: "Customizable with your dealer brand color",
    templateType: "branded_dealer",
    previewImageUrl: null,
  },
  {
    name: "Seasonal Special",
    description: "Bright gold gradient for special promotions",
    templateType: "seasonal_special",
    previewImageUrl: null,
  },
];

async function seed() {
  console.log("Seeding background templates...");
  
  for (const template of templates) {
    await db.insert(backgroundTemplates).values(template).onDuplicateKeyUpdate({
      set: { name: template.name },
    });
  }
  
  console.log("✓ Seeded 6 background templates");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Failed to seed templates:", error);
  process.exit(1);
});
