"""Check the two galleries. Optionally pass index.html from pre-gallery main (cc5b80e) to verify preservation."""
from argparse import ArgumentParser
from collections import Counter
from hashlib import sha256
from pathlib import Path

from lxml import etree, html

ROOT = Path(__file__).resolve().parents[1]
PR26_ORDER = 'top advantages specs config work-gallery price acceptance design compare delivery gov plant faq order qlist'.split()
ORDER = 'top advantages specs config work-gallery plant price acceptance design compare delivery gov faq order qlist'.split()
PHOTOS = {'specs': [4204, 4209, 4212, 4257, 4335], 'work-gallery': [4135, 4168, 4274, 4276, 4325]}


def read_page(path):
    return html.fromstring(path.read_text(encoding='utf-8'))


def canonical(page):
    for node in page.iter():
        if node.text and not node.text.strip():
            node.text = None
        if node.tail and not node.tail.strip():
            node.tail = None
    return etree.tostring(page, method='html')


parser = ArgumentParser(description=__doc__)
parser.add_argument('--baseline', type=Path)
parser.add_argument('--page', type=Path, default=ROOT / 'index.html')
history = parser.add_mutually_exclusive_group()
history.add_argument('--pr27', action='store_true', help='verify the two historical horizontal galleries after the plant move')
history.add_argument('--pr26', action='store_true', help='verify the historical order after the galleries were added')
args = parser.parse_args()
page = read_page(args.page)
assert page.xpath('//section/@id') == (PR26_ORDER if args.pr26 else ORDER), 'section order'
ids = Counter(page.xpath('//*[@id]/@id'))
assert all(count == 1 for count in ids.values()), 'duplicate IDs'
assert all(link[1:] in ids for link in page.xpath('//a[starts-with(@href, "#")]/@href')), 'missing anchor'
assert len(page.xpath('//*[@data-sf676-gallery]')) == 2
assert len(page.xpath('//template[@id="gallery-viewer-template"]/dialog')) == 1
fingerprints = set()
for section, numbers in PHOTOS.items():
    group, = page.xpath(f'//section[@id="{section}"]//*[@data-sf676-gallery]')
    showcase = section == 'specs' and not (args.pr26 or args.pr27)
    track_class = 'tech-thumbs' if showcase else 'gallery-track'
    track, = group.xpath(f'.//ul[@class="{track_class}"]')
    controlled = 'specs-gallery-photo' if showcase else track.get('id')
    assert group.xpath('.//button/@aria-controls') == [controlled] * 2
    if showcase:
        assert group.xpath('.//*[@class="tech-main"][@hidden]//a[@id=$id]', id=controlled)
        assert len({name.strip() for name in track.xpath('./li/a/span/text()')}) == 5
    links = track.xpath('./li/a')
    assert len(links) == len(numbers)
    for number, link in zip(numbers, links):
        img, = link.xpath('./img')
        base = f'assets/images/galleries/sf676-proz{number}'
        thumb, full = base + '-640.webp', base + '-1600.webp'
        assert (img.get('src'), link.get('href')) == (thumb, full)
        assert img.get('srcset') == thumb + ' 640w' and img.get('sizes')
        assert (img.get('width'), img.get('height'), img.get('loading'), img.get('decoding')) == ('640', '427', 'lazy', 'async')
        assert img.get('alt', '').strip()
        for path in (thumb, full):
            data = (ROOT / path).read_bytes()
            assert data[:4] == b'RIFF' and data[8:12] == b'WEBP', path
            digest = sha256(data).digest()
            assert digest not in fingerprints, path
            fingerprints.add(digest)

for n, section in enumerate(page.xpath('//section[@id!="qlist"]'), 1):
    comment = section.getprevious()
    assert isinstance(comment, etree._Comment) and comment.text.strip() == str(n), section.get('id')

if args.baseline:
    if not args.pr26:
        # Restore the pre-4A position before comparing against pre-gallery main.
        plant = page.get_element_by_id('plant')
        comment = plant.getprevious()
        page.get_element_by_id('gov').addnext(comment)
        comment.addnext(plant)
    # Remove only the approved additions, then compare all earlier HTML including forms, terms and assets.
    for xpath in ('//section[@id="work-gallery"]/preceding-sibling::comment()[1]', '//section[@id="work-gallery"]',
                  '//section[@id="specs"]//*[@data-sf676-gallery]', '//template[@id="gallery-viewer-template"]',
                  '//link[@href="assets/css/photo-gallery.css"]', '//script[@src="assets/js/photo-gallery.js"]'):
        node, = page.xpath(xpath)
        node.getparent().remove(node)
    for n, section in enumerate(page.xpath('//section[@id!="qlist"]'), 1):
        section.getprevious().text = f' {n} '
    assert canonical(page) == canonical(read_page(args.baseline)), 'earlier HTML changed'
    print('PASS: pre-gallery HTML preserved')
print('PASS: 14 sections + qlist, IDs, anchors, gallery groups and 20 distinct local WebP files')
