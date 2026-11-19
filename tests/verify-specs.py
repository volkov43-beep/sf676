"""Verify 14 unchanged technical rows and content outside the authorized specs redesign.

Usage: python3 tests/verify-specs.py [BASELINE_HTML]
Default baseline is the merged modal redesign (PR #33).
"""
from copy import deepcopy
from pathlib import Path
import subprocess
import sys
from lxml import etree, html

ROOT = Path(__file__).resolve().parents[1]
base = Path(sys.argv[1]).read_bytes() if len(sys.argv) > 1 else subprocess.check_output(
    ['git', 'show', '577f251c3565d8c2d22b332cf863ca414945b5b0:index.html'], cwd=ROOT)
old, new = (html.fromstring(source) for source in (base, (ROOT / 'index.html').read_bytes()))

def one(page, selector):
    node, = page.xpath(selector)
    return node

def canonical(node):
    node = deepcopy(node)
    for child in node.iter():
        if child.text and not child.text.strip(): child.text = None
        if child.tail and not child.tail.strip(): child.tail = None
    return etree.tostring(node, method='html', with_tail=False)

before = old.xpath('//*[@id="specs"]//table[@class="spec-table"]')
groups = new.xpath('//*[@id="specs"]//details[@class="spec-group"]')
assert len(groups) == 3
assert [g.get('open') is not None for g in groups] == [True, False, False]
assert all(g.get('name') is None for g in groups), 'Groups must open independently'
for original, group, count in zip(before, groups, [6, 5, 3]):
    table = one(group, './/table')
    assert canonical(one(original, './tbody')) == canonical(one(table, './tbody')), 'Technical values changed'
    assert canonical(one(original, './thead')) == canonical(one(table, './thead')), 'Column semantics changed'
    assert len(table.xpath('./tbody/tr')) == count
    summary = one(group, './summary/span')
    assert summary.text == one(original, './caption/span').text
    assert table.get('aria-labelledby') == summary.get('id')
    assert not table.xpath('./caption'), 'No repeated visible heading'
ops = one(new, '//*[@class="spec-operations"]')
assert ops.getparent().getparent() is groups[1]
assert canonical(ops) == canonical(one(old, '//*[@class="spec-operations"]'))
for selector in ['//a[@data-request-form]', '//section/@id']:
    a, b = old.xpath(selector), new.xpath(selector)
    assert [canonical(x) if not isinstance(x, str) else x for x in a] == [canonical(x) if not isinstance(x, str) else x for x in b]
links = new.xpath('//a[@data-request-form]')
assert len(links) == len({a.get('data-source-cta') for a in links}) == 19
for selector in ['//*[@data-sf676-gallery]', '//*[@id="technical-documents"]', '//*[@class="travel-axes"]', '//*[@class="travel-values"]']:
    assert [canonical(e) for e in old.xpath(selector)] == [canonical(e) for e in new.xpath(selector)], selector
photo_old = one(old, '//*[@id="specs"]//figure')
photo_new = deepcopy(one(new, '//*[@id="specs"]//figure'))
one(photo_new, './/img').set('sizes', one(photo_old, './/img').get('sizes'))
assert canonical(photo_old) == canonical(photo_new), 'Only responsive sizes may change on photo'
band = one(new, '//*[@id="specs"]/div[@class="specs-gallery-band"]')
assert band.getprevious().xpath('./div[@class="section-cta specs-price-cta"]')
assert one(band, './div[@class="wrap"]/*[@data-sf676-gallery]') is one(new, '//*[@id="specs"]//*[@data-sf676-gallery]')
closing = band.getnext()
assert closing.get('class') == 'wrap specs-closing'
assert one(closing, './div[@id="technical-documents"]') is closing[0]
assert one(closing, './div/a[@data-source-cta="specs-fit"]') is closing[-1][0]
assert not closing.xpath('.//*[@data-sf676-gallery]')
# Apart from the scoped stylesheet and #specs, the complete document stays identical.
for tree in (old, new):
    for selector in ('//style', '//*[@id="specs"]'):
        node = one(tree, selector)
        node.getparent().remove(node)
assert canonical(old) == canonical(new), 'Unexpected change outside specs'
print('PASS: 14/14 exact rows (6/5/3), semantics, independent accordions, operations, photo, galleries, all 19 CTA and all HTML outside specs preserved.')
