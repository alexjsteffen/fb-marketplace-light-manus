#!/usr/bin/env python3
"""
Image Compositor for Facebook Ad Accelerator
Composites vehicle images onto professional templates with branding and pricing
"""

import sys
import json
from PIL import Image, ImageDraw, ImageFont
import requests
from io import BytesIO

# Template configurations with gradient colors and text
TEMPLATES = {
    "flash_sale": {
        "gradient_start": (220, 20, 60),  # Crimson red
        "gradient_end": (139, 0, 0),  # Dark red
        "template_title": "⚡ FLASH SALE",
        "title_color": (255, 255, 255),
        "accent_color": (255, 215, 0),  # Gold
    },
    "premium": {
        "gradient_start": (25, 25, 112),  # Midnight blue
        "gradient_end": (0, 0, 0),  # Black
        "template_title": "✨ PREMIUM SELECTION",
        "title_color": (255, 255, 255),
        "accent_color": (212, 175, 55),  # Metallic gold
    },
    "value": {
        "gradient_start": (34, 139, 34),  # Forest green
        "gradient_end": (0, 100, 0),  # Dark green
        "template_title": "💰 BEST VALUE",
        "title_color": (255, 255, 255),
        "accent_color": (255, 255, 0),  # Yellow
    },
    "event": {
        "gradient_start": (255, 140, 0),  # Dark orange
        "gradient_end": (255, 69, 0),  # Red-orange
        "template_title": "📅 SPECIAL EVENT",
        "title_color": (255, 255, 255),
        "accent_color": (255, 255, 255),
    },
    "creator": {
        "gradient_start": (138, 43, 226),  # Blue violet
        "gradient_end": (75, 0, 130),  # Indigo
        "template_title": "🎬 FEATURED",
        "title_color": (255, 255, 255),
        "accent_color": (255, 192, 203),  # Pink
    },
    "trending": {
        "gradient_start": (255, 20, 147),  # Deep pink
        "gradient_end": (199, 21, 133),  # Medium violet red
        "template_title": "🚀 TRENDING NOW",
        "title_color": (255, 255, 255),
        "accent_color": (255, 255, 0),  # Yellow
    },
}


def create_gradient(width, height, start_color, end_color):
    """Create a vertical gradient image"""
    base = Image.new("RGB", (width, height), start_color)
    top = Image.new("RGB", (width, height), end_color)
    mask = Image.new("L", (width, height))
    mask_data = []
    for y in range(height):
        mask_data.extend([int(255 * (y / height))] * width)
    mask.putdata(mask_data)
    base.paste(top, (0, 0), mask)
    return base


def download_image(url):
    """Download image from URL"""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return Image.open(BytesIO(response.content))
    except Exception:
        # Return a placeholder image if download fails (don't print to stderr)
        return Image.new("RGB", (800, 600), (200, 200, 200))


def composite_ad_image(
    vehicle_image_url, template_name, price, dealer_name, stock_number, year, make, model
):
    """
    Composite vehicle image onto template with branding and pricing
    
    Args:
        vehicle_image_url: URL of the vehicle image
        template_name: Template style (flash_sale, premium, value, event, creator, trending)
        price: Vehicle price
        dealer_name: Dealer name for branding
        stock_number: Vehicle stock number
        year: Vehicle year
        make: Vehicle make
        model: Vehicle model
    
    Returns:
        PIL Image object
    """
    # Get template config
    template = TEMPLATES.get(template_name, TEMPLATES["premium"])
    
    # Canvas dimensions (Facebook Marketplace optimal: 1200x1200)
    canvas_width = 1200
    canvas_height = 1200
    
    # Create gradient background
    background = create_gradient(
        canvas_width,
        canvas_height,
        template["gradient_start"],
        template["gradient_end"],
    )
    
    # Download and resize vehicle image
    vehicle_img = download_image(vehicle_image_url)
    
    # Resize vehicle image to fit in center (leaving space for text)
    vehicle_width = int(canvas_width * 0.75)
    vehicle_height = int(canvas_height * 0.55)
    vehicle_img.thumbnail((vehicle_width, vehicle_height), Image.Resampling.LANCZOS)
    
    # Center the vehicle image
    vehicle_x = (canvas_width - vehicle_img.width) // 2
    vehicle_y = int(canvas_height * 0.25)  # Leave space at top for template title
    
    # Paste vehicle image onto background
    background.paste(vehicle_img, (vehicle_x, vehicle_y))
    
    # Add text overlays
    draw = ImageDraw.Draw(background)
    
    # Try to load a nice font, fall back to default if not available
    try:
        title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 60)
        price_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 80)
        info_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 40)
        dealer_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 35)
    except:
        title_font = ImageFont.load_default()
        price_font = ImageFont.load_default()
        info_font = ImageFont.load_default()
        dealer_font = ImageFont.load_default()
    
    # Template title at top
    title_text = template["template_title"]
    title_bbox = draw.textbbox((0, 0), title_text, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    title_x = (canvas_width - title_width) // 2
    title_y = 50
    
    # Draw title with shadow for better visibility
    draw.text((title_x + 3, title_y + 3), title_text, fill=(0, 0, 0), font=title_font)
    draw.text((title_x, title_y), title_text, fill=template["title_color"], font=title_font)
    
    # Price banner at bottom
    # Convert price to number if it's a string
    try:
        price_num = float(price) if isinstance(price, str) else price
        price_text = f"${price_num:,.0f}"
    except (ValueError, TypeError):
        price_text = str(price)
    price_bbox = draw.textbbox((0, 0), price_text, font=price_font)
    price_width = price_bbox[2] - price_bbox[0]
    price_height = price_bbox[3] - price_bbox[1]
    
    # Draw price background rectangle
    price_bg_y = canvas_height - 220
    draw.rectangle(
        [(0, price_bg_y), (canvas_width, price_bg_y + 150)],
        fill=(0, 0, 0, 180),
    )
    
    # Draw price text
    price_x = (canvas_width - price_width) // 2
    price_y = price_bg_y + 35
    draw.text((price_x + 3, price_y + 3), price_text, fill=(0, 0, 0), font=price_font)
    draw.text((price_x, price_y), price_text, fill=template["accent_color"], font=price_font)
    
    # Vehicle info below price
    info_text = f"{year} {make} {model}"
    info_bbox = draw.textbbox((0, 0), info_text, font=info_font)
    info_width = info_bbox[2] - info_bbox[0]
    info_x = (canvas_width - info_width) // 2
    info_y = price_y + 90
    draw.text((info_x + 2, info_y + 2), info_text, fill=(0, 0, 0), font=info_font)
    draw.text((info_x, info_y), info_text, fill=(255, 255, 255), font=info_font)
    
    # Dealer name at very bottom
    dealer_text = dealer_name
    dealer_bbox = draw.textbbox((0, 0), dealer_text, font=dealer_font)
    dealer_width = dealer_bbox[2] - dealer_bbox[0]
    dealer_x = (canvas_width - dealer_width) // 2
    dealer_y = canvas_height - 50
    draw.text((dealer_x + 2, dealer_y + 2), dealer_text, fill=(0, 0, 0), font=dealer_font)
    draw.text((dealer_x, dealer_y), dealer_text, fill=(200, 200, 200), font=dealer_font)
    
    # Stock number in top right corner
    stock_text = f"Stock #{stock_number}"
    stock_bbox = draw.textbbox((0, 0), stock_text, font=info_font)
    stock_width = stock_bbox[2] - stock_bbox[0]
    stock_x = canvas_width - stock_width - 30
    stock_y = 30
    draw.text((stock_x + 2, stock_y + 2), stock_text, fill=(0, 0, 0), font=info_font)
    draw.text((stock_x, stock_y), stock_text, fill=(200, 200, 200), font=info_font)
    
    return background


def main():
    """Main entry point for command-line usage"""
    if len(sys.argv) < 2:
        print("Usage: python image-compositor.py <json_input>", file=sys.stderr)
        print("JSON input should contain: vehicle_image_url, template_name, price, dealer_name, stock_number, year, make, model, output_path", file=sys.stderr)
        sys.exit(1)
    
    try:
        # Parse JSON input
        input_data = json.loads(sys.argv[1])
        
        # Extract parameters
        vehicle_image_url = input_data["vehicle_image_url"]
        template_name = input_data["template_name"]
        price = input_data["price"]
        dealer_name = input_data["dealer_name"]
        stock_number = input_data["stock_number"]
        year = input_data["year"]
        make = input_data["make"]
        model = input_data["model"]
        output_path = input_data["output_path"]
        
        # Generate composite image
        result_image = composite_ad_image(
            vehicle_image_url,
            template_name,
            price,
            dealer_name,
            stock_number,
            year,
            make,
            model,
        )
        
        # Save to output path
        result_image.save(output_path, "PNG", quality=95)
        
        print(json.dumps({"success": True, "output_path": output_path}))
        
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
