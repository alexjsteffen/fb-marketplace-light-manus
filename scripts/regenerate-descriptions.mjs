/**
 * Batch regenerate AI descriptions for all vehicles
 * Replaces generic disclaimer text with unique AI-generated descriptions
 */
import { getDb } from "../server/db.ts";
import { inventoryItems } from "../drizzle/schema.ts";
import { invokeLLM } from "../server/_core/llm.ts";
import { eq } from "drizzle-orm";

async function generateDescription(vehicle) {
  const prompt = `Create a compelling, professional description for this vehicle listing (150-200 words):

Vehicle: ${vehicle.year || ""} ${vehicle.brand || ""} ${vehicle.model || ""}
Stock Number: ${vehicle.stockNumber}
Condition: ${vehicle.condition}
Price: $${vehicle.price || "Contact for pricing"}

Requirements:
- Write in a professional, enthusiastic tone
- Highlight key features and benefits
- Mention the vehicle's condition (${vehicle.condition})
- Include a call-to-action
- DO NOT include price (it's shown separately)
- DO NOT include generic dealer disclaimers
- Focus on what makes THIS specific vehicle appealing
- Keep it concise and scannable

Return only the description, no additional commentary.`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are an expert automotive copywriter. Write compelling, accurate vehicle descriptions that help buyers make informed decisions.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  return typeof content === "string" ? content.trim() : null;
}

async function main() {
  console.log("🚀 Starting batch description regeneration...\n");

  const db = await getDb();
  if (!db) {
    throw new Error("Failed to connect to database");
  }

  // Get all vehicles with the generic disclaimer
  const vehicles = await db
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.dealerId, 60001));

  console.log(`Found ${vehicles.length} vehicles to process\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const vehicle of vehicles) {
    try {
      console.log(
        `Processing: ${vehicle.year} ${vehicle.brand} ${vehicle.model} (Stock: ${vehicle.stockNumber})`
      );

      const newDescription = await generateDescription(vehicle);

      if (newDescription) {
        await db
          .update(inventoryItems)
          .set({ description: newDescription })
          .where(eq(inventoryItems.id, vehicle.id));

        console.log(`✅ Updated successfully\n`);
        successCount++;
      } else {
        console.log(`⚠️  Failed to generate description\n`);
        errorCount++;
      }

      // Add small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Error processing vehicle ${vehicle.stockNumber}:`, error.message);
      console.log();
      errorCount++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`✅ Successfully updated: ${successCount} vehicles`);
  console.log(`❌ Errors: ${errorCount} vehicles`);
  console.log("=".repeat(50));
}

main()
  .then(() => {
    console.log("\n🎉 Batch regeneration complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  });
