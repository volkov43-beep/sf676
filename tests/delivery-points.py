"""Check the delivery register. Optionally verify every coordinate against GeoNames cities1000.zip."""
import json
import re
import sys
from collections import Counter
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
points = json.loads((ROOT / "assets/data/delivery-points.json").read_text())
russia = {p["region"]: p for p in points if p["type"] == "russia"}
exports = [p for p in points if p["type"] == "export"]
countries = {"Россия": "RU", "Беларусь": "BY", "Узбекистан": "UZ", "Казахстан": "KZ",
             "Армения": "AM", "Кыргызстан": "KG", "Латвия": "LV"}
assert len(russia) == 73 and len(exports) == 17 and len(points) == 90
assert Counter(p["country"] for p in exports) == {
    "Беларусь": 4, "Узбекистан": 1, "Казахстан": 9, "Армения": 1, "Кыргызстан": 1, "Латвия": 1
}
assert len(set(p["id"] for p in points)) == len(set(tuple(p["coordinates"]) for p in points)) == 90
for p in points:
    assert re.fullmatch(r"gn-\d+", p["id"]) and p["city"]
    lon, lat = p["coordinates"]
    assert 19 < lon < 160 and 39 < lat < 70, p["id"]
    if p["type"] == "russia":
        assert p["country"] == "Россия" and p["coordinateRole"] == "regional_center"
    else:
        assert p["coordinateRole"] == "delivery_city"
for region, city, gid in [
    ("Москва", "Москва", "gn-524901"), ("Московская область", "Красногорск", "gn-542374"),
    ("Санкт-Петербург", "Санкт-Петербург", "gn-498817"), ("Ленинградская область", "Гатчина", "gn-561887")
]:
    assert (russia[region]["city"], russia[region]["id"]) == (city, gid)
if len(sys.argv) > 1:
    pending = {p["id"][3:]: p for p in points}
    with ZipFile(sys.argv[1]) as archive, archive.open("cities1000.txt") as rows:
        for line in rows:
            row = line.decode().rstrip().split("\t")
            p = pending.pop(row[0], None)
            if p is None:
                continue
            assert row[6] == "P" and row[8] == countries[p["country"]], p["id"]
            assert p["coordinates"] == [float(row[5]), float(row[4])], p["id"]
            names = {s.casefold().replace("ё", "е") for s in [row[1], row[2], *row[3].split(",")]}
            assert p["city"].casefold().replace("ё", "е") in names, p["id"]
    assert not pending
print("PASS: 73 Russian regions and 17 cities in six export countries, 90 unique locations")
