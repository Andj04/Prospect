"""One-off asset generator: produces the app logo, favicon.ico and PNG
variants from the official Amal Biladi pictogram (`logo amal biladi.png`).
Re-run manually if the source logo changes; not part of the app build.

The source is only 78x78 px, so the in-app logo is a Lanczos upscale; replace
the source with a larger/SVG version for crisper results.

Usage: python scripts/generate-favicon.py
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "logo amal biladi.png"
PUBLIC = ROOT / "public"
ASSETS = ROOT / "src" / "assets"


def main() -> None:
    im = Image.open(SOURCE).convert("RGBA")

    PUBLIC.mkdir(parents=True, exist_ok=True)
    ASSETS.mkdir(parents=True, exist_ok=True)

    im.resize((624, 624), Image.LANCZOS).save(ASSETS / "logo-amal-biladi.png")

    im.resize((48, 48), Image.LANCZOS).save(
        PUBLIC / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)]
    )
    im.resize((32, 32), Image.LANCZOS).save(PUBLIC / "favicon-32x32.png")
    im.resize((16, 16), Image.LANCZOS).save(PUBLIC / "favicon-16x16.png")

    # Apple touch icons are not transparent: place the logo on white.
    touch = Image.new("RGBA", (180, 180), (255, 255, 255, 255))
    logo = im.resize((150, 150), Image.LANCZOS)
    touch.paste(logo, (15, 15), logo)
    touch.save(PUBLIC / "apple-touch-icon.png")


if __name__ == "__main__":
    main()
