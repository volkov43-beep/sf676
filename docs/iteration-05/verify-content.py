"""Usage: python verify-content.py /path/to/base-index.html /path/to/index.html
Requires lxml. Checks preservation against the reviewed base, not visual quality.
"""
from pathlib import Path
from lxml import html, etree
import re, sys
base, current = map(Path, sys.argv[1:3])
a, b = html.parse(str(base)), html.parse(str(current))
text = lambda e: re.sub(r'\s+', ' ', ''.join(e.itertext())).strip()
assert a.xpath('//section/@id') == b.xpath('//section/@id')
assert len(b.xpath('//section[@id!="qlist"]')) == 13
assert [text(e) for e in a.xpath('//table')] == [text(e) for e in b.xpath('//table')]
assert [dict(e.attrib) for e in a.xpath('//img|//picture/source')] == [dict(e.attrib) for e in b.xpath('//img|//picture/source')]
assert a.xpath('//script')[0].text == b.xpath('//script')[0].text
assert a.xpath('//*[@data-q]/@data-q') == b.xpath('//*[@data-q]/@data-q')
assert text(a.xpath('//*[@id="faq"]')[0]) == text(b.xpath('//*[@id="faq"]')[0])
assert len(b.xpath('//*[@id="faq"]//details')) == 9
assert len(b.xpath('//*[contains(@class,"compare-table")]//tbody/tr')) == 8
assert len(b.xpath('//li[contains(@class,"config-option")]')) == 5
assert len(b.xpath('//ol[@class="delivery-steps"]/li')) == 10
for id in ['top','price','design','compare','config','delivery','gov','plant','order']:
    old, new = a.xpath('//*[@id=$id]', id=id)[0], b.xpath('//*[@id=$id]', id=id)[0]
    for e in old.xpath('.//p|.//li|.//dd|.//h3|.//h4'):
        value = text(e)
        if 'пока не' not in value:
            assert value in text(new), (id, value)
old_intro = a.xpath('//*[@class="acceptance-intro"]/p')[0]
assert text(old_intro) in text(b.xpath('//*[@id="acceptance"]')[0])
assert b.xpath('//meta[@name="robots"]/@content') == ['noindex, nofollow']
assert 'Багин Николай' in text(b.xpath('//*[@id="order"]')[0])
assert 'Киров, ул. Техническая, 22.' in text(b.xpath('//*[@id="order"]')[0])
assert b.xpath('//*[@id="order"]//button[@disabled]')
assert not b.xpath('//a[@href="#"]')
svg = etree.parse(str(current.parent / 'assets/graphics/engineering.svg'))
ids = svg.xpath('//@id')
assert len(ids) == len(set(ids))
for use in b.xpath('//use'):
    assert use.get('href').split('#')[1] in ids
    assert use.getparent().get('aria-hidden') == 'true'
for img in b.xpath('//img'):
    assert img.get('alt') and img.get('width') and img.get('height')
    assert (current.parent / img.get('src')).is_file()
print('PASS: structure, tables, content, images, JS, questions, SVG references, prototype form')
