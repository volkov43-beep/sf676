"""Refresh the no-JavaScript list after editing delivery-points.json, or verify it with --check."""
import argparse
import json
from collections import defaultdict
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
START = "<!-- delivery-directory:start -->"
END = "<!-- delivery-directory:end -->"


def directory(points):
    countries = defaultdict(list)
    regions = []
    for point in points:
        city = escape(point["city"])
        if point["type"] == "russia":
            region = escape(point["region"])
            regions.append(region if region == city else f"{region} — {city}")
        else:
            countries[escape(point["country"])].append(city)
    lines = ['<h4>Россия · регион и условная точка</h4>', '<ul class="delivery-regions">']
    lines.extend(f'  <li>{item}</li>' for item in regions)
    lines.extend(['</ul>', '<h4>Экспорт · города поставок</h4>', '<dl class="delivery-countries">'])
    for country, cities in countries.items():
        lines.append(f'  <div><dt>{country}</dt><dd>{", ".join(cities)}</dd></div>')
    lines.append('</dl>')
    return "\n".join("        " + line for line in lines)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    points = json.loads((ROOT / "assets/data/delivery-points.json").read_text())
    file = ROOT / "index.html"
    before, rest = file.read_text().split(START)
    old, after = rest.split(END)
    new = "\n" + directory(points) + "\n        "
    if args.check:
        if old != new:
            raise SystemExit("Refresh the list with python scripts/delivery-directory.py")
    else:
        file.write_text(before + START + new + END + after)
