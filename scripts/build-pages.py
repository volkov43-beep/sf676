"""Stage only the public landing page and assets in a new output directory."""
import os
import shutil
import sys
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
out = Path(sys.argv[1]).resolve()
out.mkdir(parents=True, exist_ok=False)
html = (ROOT / "index.html").read_text()
slot = '<meta name="yandex-maps-key" content="">'
if html.count(slot) != 1:
    raise SystemExit("Missing or ambiguous map configuration slot")
# Only the staged HTML receives the browser key. Never log it or construct executable JS.
key = escape(os.environ.get("YANDEX_MAPS_API_KEY", "").strip(), quote=True)
(out / "index.html").write_text(html.replace(slot, f'<meta name="yandex-maps-key" content="{key}">'))
shutil.copytree(ROOT / "assets", out / "assets")
if (ROOT / "CNAME").is_file():
    shutil.copy2(ROOT / "CNAME", out / "CNAME")
