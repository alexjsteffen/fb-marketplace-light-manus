#!/usr/bin/env python3
"""
Image Compositor for Facebook Ad Accelerator
Composites vehicle images onto pre-designed templates with branding and pricing
"""

import sys
import json
from PIL import Image, ImageDraw, ImageFont
import requests
from io import BytesIO
import os

def download_image(url):
    """Download image from URL"""
    response = requests.get(url, timeout=10)
    response.raise_for_status()
    return Image.open(BytesIO(response.content))

def composite_vehicle_ad(vehicle_image_url, template_name, price, dealer_name, dealer_logo_url=None, output_path=None):
    """
    Composite a vehicle image onto a template with branding and pricing
    
    Args:
        vehicle_image_url: URL to the vehicle image
        template_name: Name of the template (flash_sale, premium, value, event, creator, trending)
        price: Vehicle price string (e.g., "$39,800")
        dealer_name: Name of the dealer
        dealer_logo_url: Optional URL to dealer logo
        output_path: Path to save the output image
    
    Returns:
        Path to the generated image
    """
    
    # Download vehicle image
    vehicle_img = download_image(vehicle_image_url)
    
    # Create canvas (1200x1200 for Instagram/Facebook square format)
    canvas_width = 1200
    canvas_height = 1200
    canvas = Image.new('RGB', (canvas_width, canvas_height))
    
    # Template-specific backgrounds and styling
    templates = {
        'flash_sale': {
            'bg_color': (255, 50, 50),  # Red
            'accent_color': (255, 200, 0),  # Yellow
            'title': 'ON SALE',
            'subtitle': 'LIMITED TIME OFFER'
        },
        'premium': {
            'bg_color': (20, 20, 40),  # Dark blue
            'accent_color': (200, 150, 255),  # Purple
            'title': 'PREMIUM',
            'subtitle': 'LUXURY SELECTION'
        },
        'value': {
            'bg_color': (0, 120, 200),  # Blue
            'accent_color': (255, 200, 0),  # Yellow
            'title': 'BEST VALUE',
            'subtitle': 'GREAT DEAL'
        },
        'event': {
            'bg_color': (50, 150, 50),  # Green
            'accent_color': (255, 255, 255),  # White
            'title': 'SPECIAL EVENT',
            'subtitle': 'DON\'T MISS OUT'
        },
        'creator': {
            'bg_color': (255, 100, 150),  # Pink
            'accent_color': (100, 200, 255),  # Cyan
            'title': 'CREATOR PICK',
            'subtitle': 'HANDPICKED FOR YOU'
        },
        'trending': {
            'bg_color': (100, 50, 200),  # Purple
            'accent_color': (255, 150, 0),  # Orange
            'title': 'TRENDING NOW',
            'subtitle': 'HOT DEAL'
        }
    }
    
    template = templates.get(template_name, templates['value'])
    
    # Fill background with gradient
    draw = ImageDraw.Draw(canvas)
    for y in range(canvas_height):
        # Create gradient effect
        ratio = y / canvas_height
        r = int(template['bg_color'][0] * (1 - ratio * 0.3))
        g = int(template['bg_color'][1] * (1 - ratio * 0.3))
        b = int(template['bg_color'][2] * (1 - ratio * 0.3))
        draw.rectangle([(0, y), (canvas_width, y+1)], fill=(r, g, b))
    
    # Resize and place vehicle image (centered, taking up 60% of canvas)
    vehicle_width = int(canvas_width * 0.85)
    vehicle_height = int(canvas_height * 0.55)
    vehicle_img.thumbnail((vehicle_width, vehicle_height), Image.Resampling.LANCZOS)
    
    # Center vehicle image
    vehicle_x = (canvas_width - vehicle_img.width) // 2
    vehicle_y = int(canvas_height * 0.25)
    canvas.paste(vehicle_img, (vehicle_x, vehicle_y))
    
    # Add text overlays
    draw = ImageDraw.Draw(canvas)
    
    # Try to load a bold font, fallback to default
    try:
        title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 80)
        subtitle_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 40)
        price_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 120)
        dealer_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 35)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        price_font = ImageFont.load_default()
        dealer_font = ImageFont.load_default()
    
    # Draw title at top
    title_text = template['title']
    title_bbox = draw.textbbox((0, 0), title_text, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    title_x = (canvas_width - title_width) // 2
    title_y = 50
    
    # Draw title with outline for visibility
    outline_color = (0, 0, 0)
    for offset_x in [-3, 0, 3]:
        for offset_y in [-3, 0, 3]:
            if offset_x != 0 or offset_y != 0:
                draw.text((title_x + offset_x, title_y + offset_y), title_text, font=title_font, fill=outline_color)
    draw.text((title_x, title_y), title_text, font=title_font, fill=template['accent_color'])
    
    # Draw subtitle
    subtitle_text = template['subtitle']
    subtitle_bbox = draw.textbbox((0, 0), subtitle_text, font=subtitle_font)
    subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
    subtitle_x = (canvas_width - subtitle_width) // 2
    subtitle_y = title_y + 90
    draw.text((subtitle_x, subtitle_y), subtitle_text, font=subtitle_font, fill=(255, 255, 255))
    
    # Draw price in a banner at bottom
    price_banner_height = 200
    price_banner_y = canvas_height - price_banner_height - 100
    
    # Draw semi-transparent banner
    banner_overlay = Image.new('RGBA', (canvas_width, price_banner_height), (0, 0, 0, 180))
    canvas.paste(banner_overlay, (0, price_banner_y), banner_overlay)
    
    # Draw price text
    price_bbox = draw.textbbox((0, 0), price, font=price_font)
    price_width = price_bbox[2] - price_bbox[0]
    price_x = (canvas_width - price_width) // 2
    price_y = price_banner_y + 40
    
    # Draw price with glow effect
    for offset in range(5, 0, -1):
        alpha = int(255 * (1 - offset / 5))
        glow_color = template['accent_color']
        draw.text((price_x, price_y), price, font=price_font, fill=glow_color)
    draw.text((price_x, price_y), price, font=price_font, fill=(255, 255, 255))
    
    # Draw dealer name at bottom
    dealer_y = canvas_height - 60
    dealer_bbox = draw.textbbox((0, 0), dealer_name, font=dealer_font)
    dealer_width = dealer_bbox[2] - dealer_bbox[0]
    dealer_x = (canvas_width - dealer_width) // 2
    draw.text((dealer_x, dealer_y), dealer_name, font=dealer_font, fill=(255, 255, 255))
    
    # Save output
    if not output_path:
        output_path = f"/tmp/ad_{template_name}_{os.getpid()}.png"
    
    canvas.save(output_path, 'PNG', quality=95)
    return output_path

if __name__ == '__main__':
    # Read JSON input from stdin
    input_data = json.loads(sys.stdin.read())
    
    try:
        output_path = composite_vehicle_ad(
            vehicle_image_url=input_data['vehicleImageUrl'],
            template_name=input_data['templateName'],
            price=input_data['price'],
            dealer_name=input_data['dealerName'],
            dealer_logo_url=input_data.get('dealerLogoUrl'),
            output_path=input_data.get('outputPath')
        )
        
        print(json.dumps({'success': True, 'outputPath': output_path}))
    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}))
        sys.exit(1)
