import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";

/**
 * Enhance ad text using AI
 */
export async function enhanceAdText(params: {
  brand?: string;
  model?: string;
  year?: number;
  category?: string;
  price?: string;
  description?: string;
  condition?: string;
  tone?: string;
}): Promise<string> {
  const { brand, model, year, category, price, description, condition, tone } = params;

  // Build a human-readable item title
  const itemParts: (string | number)[] = [];
  if (year) itemParts.push(year);
  if (brand) itemParts.push(brand);
  if (model) itemParts.push(model);
  const itemTitle = itemParts.length > 0 ? itemParts.join(" ") : category || "item";

  const toneInstruction =
    tone === "casual"
      ? "Write in a friendly, conversational tone."
      : tone === "luxury"
      ? "Write in an upscale, premium tone that emphasizes quality and exclusivity."
      : tone === "exciting"
      ? "Write in an exciting, energetic tone with urgency."
      : tone === "value"
      ? "Write in a value-focused tone emphasizing the great deal."
      : "Write in a professional, clear tone.";

  const prompt = `Create compelling Facebook Marketplace ad copy for this ${condition || "used"} ${category || "item"} listing:
${itemTitle ? `Item: ${itemTitle}` : ""}
${category ? `Category: ${category}` : ""}
${price ? `Price: $${price}` : ""}
${description ? `Description: ${description}` : ""}

Requirements:
- ${toneInstruction}
- Write an engaging, concise ad description (150-200 words)
- Highlight key features and benefits
- Use persuasive language that appeals to buyers
- Include a call-to-action
- Format for Facebook Marketplace (professional tone, no excessive punctuation)
- Do not include price in the text (it's shown separately)
- If this is artwork or a painting, emphasize the aesthetic qualities, dimensions if known, medium, and uniqueness
Return only the ad copy, no additional commentary.`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content:
          "You are an expert copywriter specializing in Facebook Marketplace ads for all types of items — artwork, furniture, electronics, clothing, vehicles, equipment, and more. Write compelling, professional ad copy that converts browsers into buyers.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  return typeof content === "string" ? content : "";
}

/**
 * Background template configurations
 */
export const TEMPLATE_CONFIGS = {
  gradient_modern: {
    type: "gradient",
    colors: ["#667eea", "#764ba2"],
    angle: 135,
  },
  gradient_sunset: {
    type: "gradient",
    colors: ["#f093fb", "#f5576c"],
    angle: 45,
  },
  solid_professional: {
    type: "solid",
    color: "#1e3a8a",
  },
  textured_premium: {
    type: "texture",
    baseColor: "#0f172a",
    pattern: "diagonal-lines",
  },
  branded_dealer: {
    type: "solid",
    color: "#3b82f6",
  },
  seasonal_special: {
    type: "gradient",
    colors: ["#fbbf24", "#f59e0b"],
    angle: 90,
  },
};

/**
 * Generate ad image with background template and text overlays using AI
 */
export async function generateAdImage(params: {
  itemImageUrl: string;
  templateType: keyof typeof TEMPLATE_CONFIGS;
  brandColor?: string;
  overlayText: {
    title: string;
    price?: string;
    subtitle?: string;
  };
  stockNumber?: string;
  brand?: string;
  model?: string;
}): Promise<{ url: string; fileKey: string; filename: string }> {
  const { itemImageUrl, templateType, brandColor, overlayText } = params;

  // Get template config
  const template = TEMPLATE_CONFIGS[templateType];

  // Build AI prompt based on template type
  let backgroundDescription = "";
  if (template.type === "gradient" && "colors" in template) {
    backgroundDescription = `gradient background transitioning from ${template.colors[0]} to ${template.colors[1]}`;
  } else if (template.type === "solid" && "color" in template) {
    backgroundDescription = `solid ${brandColor || template.color} background`;
  } else if (template.type === "texture") {
    backgroundDescription = `textured dark background with subtle diagonal line pattern`;
  }

  // Build text overlay description
  const textOverlays = [];
  textOverlays.push(`large bold white text "${overlayText.title}" at the bottom`);
  if (overlayText.price) {
    textOverlays.push(`prominent gold/yellow price text "${overlayText.price}" below the title`);
  }
  if (overlayText.subtitle) {
    textOverlays.push(`smaller white subtitle "${overlayText.subtitle}"`);
  }

  const prompt = `Create a professional Facebook Marketplace ad image (1200x630px) with the following specifications:

- ${backgroundDescription}
- The item from the provided image should be prominently displayed in the center with a clean white card/frame background to make it stand out
- ${textOverlays.join(", ")}
- Professional marketing style suitable for Facebook Marketplace
- Clean, modern design optimized for social media
- Ensure all text is clearly readable
- Maintain the item as the focal point
- If the item is artwork or a painting, preserve its colors and composition faithfully`;

  // Generate image using AI
  const { url: generatedUrl } = await generateImage({
    prompt,
    originalImages: [{
      url: itemImageUrl,
      mimeType: "image/jpeg"
    }]
  });

  if (!generatedUrl) {
    throw new Error("Failed to generate ad image - no URL returned");
  }

  // Generate descriptive filename
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  
  // Create human-readable filename
  const nameParts = [];
  if (params.stockNumber) nameParts.push(params.stockNumber);
  if (params.brand) nameParts.push(params.brand.replace(/\s+/g, '-'));
  if (params.model) nameParts.push(params.model.replace(/\s+/g, '-'));
  const descriptiveName = nameParts.length > 0 ? nameParts.join('-') : 'ad';
  const filename = `${descriptiveName}-${templateType}.png`;
  
  const fileKey = `ads/${timestamp}-${random}-${filename}`;

  return {
    url: generatedUrl,
    fileKey,
    filename,
  };
}
