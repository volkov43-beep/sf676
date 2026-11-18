"""Usage: python tests/verify-reorder.py BEFORE_HTML CURRENT_HTML (requires lxml).

BEFORE_HTML is index.html from c5a1d87, the main revision before the 2A move.
The three verify-*-preservation scripts keep their earlier baselines and CTA modes.
"""
from argparse import ArgumentParser
from pathlib import Path

from lxml import etree, html

parser = ArgumentParser(description=__doc__)
parser.add_argument("baseline", type=Path)
parser.add_argument("current", type=Path)
args = parser.parse_args()
before, current = (html.parse(path) for path in (args.baseline, args.current))

original = "top advantages specs price acceptance design compare config delivery gov plant faq order qlist".split()
expected = "top advantages specs config price acceptance design compare delivery gov plant faq order qlist".split()
assert before.xpath("//section/@id") == original, "expected the pre-reorder baseline"
assert current.xpath("//section/@id") == expected, "incorrect section order"
ids = current.xpath("//*[@id]/@id")
assert len(set(ids)) == len(ids), "duplicate ID"

# Reproduce only the approved move in the baseline, then compare the entire document.
config, = before.xpath('//section[@id="config"]')
specs, = before.xpath('//section[@id="specs"]')
comment = config.getprevious()
assert isinstance(comment, etree._Comment) and comment.text.strip() == "8"
specs.addnext(comment)
comment.addnext(config)
for number, section in enumerate(before.xpath('//section[@id!="qlist"]'), 1):
    comment = section.getprevious()
    assert isinstance(comment, etree._Comment)
    comment.text = f" {number} "

assert etree.tostring(before) == etree.tostring(current), (
    "content outside the approved move changed (sections, CTAs, assets, terms or surrounding HTML)"
)
print("PASS: exact order of 13 sections + qlist, unique IDs, and full HTML preservation.")
