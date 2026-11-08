import os
import sys
import re
from PIL import Image

MAX_WIDTH = 1920
WEBP_QUALITY = 85
SUPPORTED_EXTS = ('.png', '.jpg', '.jpeg', '.bmp', '.tiff')

def clean_filename(filename):
    """Normalizes filenames: removes parentheses, replaces spaces with underscores."""
    base, _ = os.path.splitext(filename)
    # Turn 'ramp_jungle (1)' into 'ramp_jungle_1'
    cleaned = re.sub(r'\s*\(([0-9]+)\)', r'_\1', base)
    # Replace any remaining spaces with underscores
    cleaned = re.sub(r'\s+', '_', cleaned)
    return cleaned + '.webp'

def optimize_image(src_path, dest_dir=None, delete_original=True):
    """Converts and optimizes an image to .webp."""
    try:
        dir_name, file_name = os.path.split(src_path)
        if not dest_dir:
            dest_dir = dir_name

        dest_name = clean_filename(file_name)
        dest_path = os.path.join(dest_dir, dest_name) if dest_dir else dest_name

        orig_size = os.path.getsize(src_path)

        with Image.open(src_path) as img:
            # Handle alpha channel cleanly for WebP
            if img.mode in ('RGBA', 'LA'):
                bg = Image.new('RGB', img.size, (20, 31, 89))
                bg.paste(img, mask=img.split()[-1])
                img = bg
            elif img.mode != 'RGB':
                img = img.convert('RGB')

            # Downsample ultra-high-res screenshots (e.g. 4K -> 1080p)
            if img.width > MAX_WIDTH:
                target_height = int(img.height * (MAX_WIDTH / img.width))
                img = img.resize((MAX_WIDTH, target_height), Image.Resampling.LANCZOS)

            if dest_dir:
                os.makedirs(dest_dir, exist_ok=True)

            img.save(dest_path, 'WEBP', quality=WEBP_QUALITY)

        new_size = os.path.getsize(dest_path)
        saved_pct = (1.0 - (new_size / orig_size)) * 100 if orig_size > 0 else 0

        print(f"[OK] {file_name}")
        print(f"     -> {dest_name} ({orig_size / 1024:.1f} KB -> {new_size / 1024:.1f} KB | -{saved_pct:.1f}%)")

        if delete_original and os.path.abspath(src_path) != os.path.abspath(dest_path):
            os.remove(src_path)

        return True
    except Exception as e:
        print(f"[ERROR] Failed to convert {src_path}: {e}")
        return False

def scan_and_optimize():
    print("=" * 60)
    print("      CS2Lineups - Automatyczny Optymalizator Obrazow (.webp)")
    print("=" * 60)
    print(f"Ustawienia: Maksymalna szerokosc: {MAX_WIDTH}px | Jakosc WebP: {WEBP_QUALITY}%\n")

    # If user dragged & dropped files directly onto .exe
    args = sys.argv[1:]
    files_to_process = []

    if args:
        print("Przetwarzanie plikow przekazanych przez argumenty / przeciagniecie:")
        for arg in args:
            if os.path.isfile(arg) and arg.lower().endswith(SUPPORTED_EXTS):
                files_to_process.append(arg)
            elif os.path.isdir(arg):
                for root, _, files in os.walk(arg):
                    for f in files:
                        if f.lower().endswith(SUPPORTED_EXTS) and not f.lower().endswith('.webp'):
                            files_to_process.append(os.path.join(root, f))
    else:
        # Default: scan assets/images and any raw drop folders
        search_dirs = [
            os.path.join('assets', 'images'),
            'raw_images',
            'images'
        ]
        print("Skanowanie katalogow w poszukiwaniu nowych plikow (.png, .jpg)...")
        for d in search_dirs:
            if os.path.exists(d):
                for root, _, files in os.walk(d):
                    for f in files:
                        if f.lower().endswith(SUPPORTED_EXTS) and not f.lower().endswith('.webp'):
                            files_to_process.append(os.path.join(root, f))

    if not files_to_process:
        print("\nNie znaleziono zadnych nowych plikow do konwersji!")
        print("Wskazowka: Mozesz przeciagnac pliki .png/.jpg bezposrednio na ten program,")
        print("lub umiescic je w 'assets/images/lineups/<nazwa_mapy>' i uruchomic go ponownie.")
    else:
        print(f"\nZnaleziono {len(files_to_process)} plikow do zoptymalizowania.\n")
        converted_count = 0
        for f in files_to_process:
            if optimize_image(f):
                converted_count += 1

        print(f"\nUkonczono! Pomyslnie zoptymalizowano: {converted_count}/{len(files_to_process)} plikow.")

    print("\n" + "=" * 60)
    # Only pause if run interactively in terminal or double-clicked via Explorer
    if sys.stdin and sys.stdin.isatty():
        try:
            input("Nacisnij ENTER, aby zakonczyc...")
        except (EOFError, KeyboardInterrupt):
            pass

if __name__ == '__main__':
    scan_and_optimize()
