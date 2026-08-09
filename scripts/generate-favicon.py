"""One-off asset generator: crops the source logo to a square mark and
produces favicon.ico + PNG variants. Re-run manually if the source logo
changes; not part of the app build.

Usage: python scripts/generate-favicon.py
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT.parent / "logo (2).png"
PUBLIC = ROOT / "public"
ASSETS = ROOT / "src" / "assets"

# Source is 1536x1024 with the icon glow roughly centered around x=760;
# crop a 1024x1024 square around it so nothing is clipped vertically.
CROP_LEFT = 248
CROP_SIZE = 1024


def main() -> None:
    im = Image.open(SOURCE).convert("RGBA")
    square = im.crop((CROP_LEFT, 0, CROP_LEFT + CROP_SIZE, CROP_SIZE))

    PUBLIC.mkdir(parents=True, exist_ok=True)
    ASSETS.mkdir(parents=True, exist_ok=True)

    # favicon.ico with the standard multi-resolution set
    sizes = [16, 32, 48, 64, 128, 256]
    square.save(
        PUBLIC / "favicon.ico",
        format="ICO",
        sizes=[(s, s) for s in sizes],
    )

    square.resize((32, 32), Image.LANCZOS).save(PUBLIC / "favicon-32x32.png")
    square.resize((16, 16), Image.LANCZOS).save(PUBLIC / "favicon-16x16.png")
    square.resize((180, 180), Image.LANCZOS).save(PUBLIC / "apple-touch-icon.png")

    # Higher-res mark used inline in the header / login page
    square.resize((256, 256), Image.LANCZOS).save(ASSETS / "logo-mark.png")

    print("Generated favicon.ico, favicon-32x32.png, favicon-16x16.png, "
          "apple-touch-icon.png, src/assets/logo-mark.png")


if __name__ == "__main__":
    main()
