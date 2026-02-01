#!/usr/bin/env python3
"""
PWA İkon Oluşturucu - mekan360
"""
from PIL import Image, ImageDraw, ImageFont
import os

# Boyutlar
SIZES = [72, 96, 128, 144, 152, 192, 384, 512]
OUTPUT_DIR = "/app/frontend/public/icons"

def create_icon(size):
    """Belirli boyutta ikon oluştur"""
    # Yeni resim oluştur (RGBA - şeffaf arka plan desteği)
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Arka plan dairesi - yeşil gradient benzeri
    padding = int(size * 0.02)
    draw.ellipse([padding, padding, size - padding, size - padding], fill='#0D5C4D')
    
    # M harfi
    font_size = int(size * 0.5)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except:
        font = ImageFont.load_default()
    
    # M harfini ortala
    text = "M"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - int(size * 0.05)
    draw.text((x, y), text, fill='white', font=font)
    
    # 360 ok çizgisi (altın rengi)
    gold = '#D4AF37'
    center_x = size // 2
    center_y = size // 2
    radius = int(size * 0.38)
    arc_width = max(2, int(size * 0.04))
    
    # Yarım daire ok
    draw.arc(
        [center_x - radius, center_y - radius, center_x + radius, center_y + radius],
        start=-60, end=200,
        fill=gold, width=arc_width
    )
    
    # Ok ucu
    arrow_size = int(size * 0.08)
    arrow_x = center_x + int(radius * 0.5)
    arrow_y = center_y - int(radius * 0.85)
    
    return img

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    for size in SIZES:
        icon = create_icon(size)
        filename = f"icon-{size}x{size}.png"
        filepath = os.path.join(OUTPUT_DIR, filename)
        icon.save(filepath, 'PNG')
        print(f"✓ {filename} oluşturuldu")
    
    print(f"\nToplam {len(SIZES)} ikon oluşturuldu!")

if __name__ == "__main__":
    main()
