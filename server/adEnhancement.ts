import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { createCanvas, loadImage, Image } from "canvas";

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
}): Promise<string> {
  const { brand, model, year, category, price, description, condition } = params;

  const prompt = `Create compelling Facebook Marketplace ad copy for this ${condition || "used"} ${category || "vehicle/equipment"}:

${year ? `Year: ${year}` : ""}
${brand ? `Brand: ${brand}` : ""}
${model ? `Model: ${model}` : ""}
${price ? `Price: $${price}` : ""}
${description ? `Description: ${description}` : ""}

Requirements:
- Write an engaging, concise ad description (150-200 words)
- Highlight key features and benefits
- Use persuasive language that appeals to buyers
- Include a call-to-action
- Format for Facebook Marketplace (no emojis, professional tone)
- Do not include price in the text (it's shown separately)

Return only the ad copy, no additional commentary.`;

  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: "You are an expert copywriter specializing in vehicle and equipment sales ads. Write compelling, professional ad copy that converts browsers into buyers.",
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
 * Generate ad image with background template and text overlays
 */
export async function generateAdImage(params: {
  vehicleImageUrl: string;
  templateType: keyof typeof TEMPLATE_CONFIGS;
  brandColor?: string;
  overlayText: {
    title: string;
    price?: string;
    subtitle?: string;
  };
}): Promise<{ url: string; fileKey: string }> {
  const { vehicleImageUrl, templateType, brandColor, overlayText } = params;

  // Canvas dimensions (optimized for Facebook)
  const width = 1200;
  const height = 630;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Get template config
  const template = TEMPLATE_CONFIGS[templateType];

  // Draw background
  if (template.type === "gradient" && "colors" in template) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, template.colors[0]);
    gradient.addColorStop(1, template.colors[1]);
    ctx.fillStyle = gradient;
  } else if (template.type === "solid" && "color" in template) {
    ctx.fillStyle = brandColor || template.color;
  } else if (template.type === "texture") {
    ctx.fillStyle = "baseColor" in template ? template.baseColor : "#0f172a";
  }
  ctx.fillRect(0, 0, width, height);

  // Add texture pattern if needed
  if (template.type === "texture" && "pattern" in template && template.pattern === "diagonal-lines") {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 2;
    for (let i = -height; i < width; i += 20) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + height, height);
      ctx.stroke();
    }
  }

  // Load and draw vehicle image
  try {
    const vehicleImage = await loadImage(vehicleImageUrl);
    
    // Calculate dimensions to fit vehicle image (centered, with padding)
    const padding = 100;
    const maxVehicleWidth = width - padding * 2;
    const maxVehicleHeight = height - padding * 2 - 150; // Reserve space for text

    let vehicleWidth = vehicleImage.width;
    let vehicleHeight = vehicleImage.height;

    // Scale to fit
    const scale = Math.min(
      maxVehicleWidth / vehicleWidth,
      maxVehicleHeight / vehicleHeight
    );
    vehicleWidth *= scale;
    vehicleHeight *= scale;

    // Center the vehicle image
    const vehicleX = (width - vehicleWidth) / 2;
    const vehicleY = padding;

    // Draw white background for vehicle (makes it pop)
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.fillRect(
      vehicleX - 20,
      vehicleY - 20,
      vehicleWidth + 40,
      vehicleHeight + 40
    );

    // Draw vehicle image
    ctx.drawImage(vehicleImage, vehicleX, vehicleY, vehicleWidth, vehicleHeight);
  } catch (error) {
    console.error("Failed to load vehicle image:", error);
    // Continue without vehicle image
  }

  // Draw text overlays at bottom
  const textY = height - 120;

  // Title
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 48px Arial";
  ctx.textAlign = "center";
  ctx.fillText(overlayText.title, width / 2, textY);

  // Price (if provided)
  if (overlayText.price) {
    ctx.font = "bold 56px Arial";
    ctx.fillStyle = "#fbbf24"; // Gold color for price
    ctx.fillText(overlayText.price, width / 2, textY + 60);
  }

  // Subtitle (if provided)
  if (overlayText.subtitle) {
    ctx.font = "24px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(overlayText.subtitle, width / 2, textY + (overlayText.price ? 100 : 50));
  }

  // Convert canvas to buffer
  const buffer = canvas.toBuffer("image/png");

  // Generate unique file key
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const fileKey = `ads/${timestamp}-${random}.png`;

  // Upload to S3
  const result = await storagePut(fileKey, buffer, "image/png");

  return {
    url: result.url,
    fileKey,
  };
}
