"""Check iteration 4 against the pre-move index.html (main at 6c598f6)."""
from argparse import ArgumentParser
from pathlib import Path
import re
from urllib.parse import urlsplit

from lxml import etree, html

parser = ArgumentParser(description=__doc__)
parser.add_argument('baseline', type=Path)
parser.add_argument('current', type=Path)
args = parser.parse_args()
old_order = 'top advantages specs config work-gallery price acceptance design compare delivery gov plant faq order'.split()
new_order = 'top advantages specs config work-gallery plant price acceptance design compare delivery gov faq order'.split()
before = args.baseline.read_bytes()
current = args.current.read_bytes()
for source, order in ((before, old_order), (current, new_order)):
    doc = html.fromstring(source.decode('utf-8'))
    assert doc.xpath('//section/@id') == [*order, 'qlist'], 'section order'
    ids = doc.xpath('//*[@id]/@id')
    assert len(ids) == len(set(ids)), 'duplicate IDs'
    assert all(target[1:] in ids for target in doc.xpath('//a[starts-with(@href,"#")]/@href')), 'missing anchor'
    for number, section in enumerate(doc.xpath('//section[@id!="qlist"]'), 1):
        assert section.getprevious().text.strip() == str(number), section.get('id')

# Check local link, image, responsive-image and SVG symbol targets in the current checkout.
root = Path(__file__).resolve().parents[1]
urls = set(doc.xpath('//@href | //@src'))
for srcset in doc.xpath('//@srcset'):
    urls.update(candidate.split()[0] for candidate in srcset.split(','))
for url in sorted(urls):
    target = urlsplit(url)
    if target.scheme:
        assert target.scheme in {'https', 'tel', 'mailto'} and (target.netloc or target.path), url
    elif target.path:
        path = root / target.path
        assert path.is_file(), url
        if target.fragment:
            assert etree.parse(path).xpath('//*[@id=$id]', id=target.fragment), url

assert set(doc.xpath('//meta[@name="robots"]/@content')[0].replace(' ', '').split(',')) == {'noindex', 'nofollow'}
forms = doc.xpath('//a[@data-request-form]/@data-request-form')
assert len(forms) == 13 and len(set(forms)) == 5, 'request entries'
assert doc.xpath('//section[@id="plant"]//a[@data-source-cta="plant-region"][@data-source-section="plant"][@data-request-form="price_quote"]')
assert doc.get_element_by_id('sf676-selector') is not None
assert doc.get_element_by_id('delivery-geography') is not None

# Reassemble the original bytes, moving only the approved section and renumbering its neighbours.
pattern = rb'^<!-- (\d+) -->\n(<section\b[^>]*>.*?^</section>)'
matches = list(re.finditer(pattern, before, re.M | re.S))
assert len(matches) == len(old_order)
sections = {name: match[2] for name, match in zip(old_order, matches)}
replacement = iter(sections[name] for name in new_order)
expected = re.sub(pattern, lambda m: b'<!-- ' + m[1] + b' -->\n' + next(replacement), before, flags=re.M | re.S)
assert current == expected, 'page differs outside the approved move and numbering'
print('PASS: 14 numbered sections, qlist, unique IDs, anchors and byte-for-byte HTML preservation')
