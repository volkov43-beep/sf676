"""Verify iteration 07 against main, then run the existing preservation test on the shared content."""
from argparse import ArgumentParser
from copy import deepcopy
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory

from lxml import etree, html


def one(root, xpath):
    node, = root.xpath(xpath)
    return node


def content(node):
    return " ".join(node.text_content().split())


def check_hero(before, after):
    assert dict(before.attrib) == dict(after.attrib)
    assert not before.xpath('.//*[@data-q]') and not after.xpath('.//*[@data-q]')
    assert content(one(after, './/h1')) == 'Станок фрезерный СФ676'
    assert content(one(after, './/*[@class="hero-eyebrow"]')) == 'Широкоуниверсальный'
    assert [content(n) for n in after.xpath('.//*[@class="hero-feature"]/strong')] == ['2 шпинделя', '2 рабочих стола']
    assert [content(n) for n in after.xpath('.//*[@class="hero-feature"]/small')] == [
        'горизонтальный и вертикальный', 'вертикальный и угловой горизонтальный']
    assert content(one(after, './/*[@class="hero-offer"]')) == (
        'Оснастка, ремонтные детали, опытные образцы и серийные партии — на одном станке')
    assert [content(n) for n in after.xpath('.//ul/li')] == [
        'инструментальные участки', 'экспериментальные участки', 'серийное производство',
        'ремонтные и вспомогательные службы']
    assert [content(n) for n in after.xpath('.//*[@class="hero-facts"]//b')] == [
        'от 20 рабочих дней', '450 / 300 / 380 мм', '12 месяцев']
    assert [content(n) for n in after.xpath('.//*[@class="hero-facts"]//small')] == [
        'изготовление', 'перемещения X / Y / Z', 'гарантия', 'В реестре Минпромторга РФ']
    assert not after.xpath('.//script|.//figcaption|.//form|.//a[not(@data-source-cta="hero-price")]')
    a, b = (one(root, './/a[@data-source-cta="hero-price"]') for root in (before, after))
    assert dict(a.attrib) == dict(b.attrib) and content(a) == content(b)
    photo, mark = after.xpath('.//img')
    assert photo.get('alt') == ('Оператор работает на фрезерном станке СФ676 в цехе Вятского '
                                'станкостроительного завода, на заднем плане ряд станков')
    assert photo.get('fetchpriority') == 'high' and photo.get('loading') != 'lazy'
    assert (photo.get('width'), photo.get('height')) == ('2048', '1365')
    assert mark.get('alt') == '' and mark.get('src') == 'assets/images/minpromtorg-72.png'
    return photo


def check_relocated_photo(old_top, new_page):
    holder = one(new_page, '//*[@id="advantages"]//article[1]/details[picture[@class="machine-overview"]]')
    summary, moved = holder
    assert content(summary) == content(one(old_top, './/figcaption'))
    assert dict(holder.attrib) == {'class': 'ux-details photo-details'}
    original = one(old_top, './/picture')
    for tag in ('source', 'img'):
        a, b = (one(root, './/' + tag) for root in (original, moved))
        for attr in ('src', 'srcset', 'media', 'width', 'height', 'alt'):
            assert a.get(attr) == b.get(attr), attr
    assert one(moved, './/img').get('loading') == 'lazy'
    assert [n.tag for n in original.iter()] == [n.tag for n in moved.iter()]
    holder.getparent().remove(holder)


def normalize(old, new):
    before, after = (page.get_element_by_id('top') for page in (old, new))
    photo = check_hero(before, after)
    preload = one(new, '/html/head/link[@rel="preload"][@as="image"]')
    for a, b in [('href', 'src'), ('imagesrcset', 'srcset'), ('imagesizes', 'sizes')]:
        assert preload.get(a) == photo.get(b)
    preload.getparent().remove(preload)
    check_relocated_photo(before, new)
    after.getparent().replace(after, deepcopy(before))

    for page in (old, new):
        one(page, '/html/head/style').text = ''
    header = one(new, '/html/body/header')
    brand = one(header, './/a[@class="logo"]/span')
    assert content(brand) == 'Вятский станкостроительный завод'
    brand.getparent().replace(brand, deepcopy(one(old, '/html/body/header//a[@class="logo"]/span')))
    button = one(header, './/a[@data-source-cta="sticky-price"]')
    assert button.attrib.pop('hidden') in ('', 'hidden')

    # Only the header observer and its call following an anchor scroll may differ.
    for page, start_marker in [(old, "  var hero=document.getElementById('top');"),
                               (new, "  var heroPrice=document.querySelector(")]:
        script = one(page, '/html/body/script[not(@src)]')
        start = script.text.index(start_marker)
        end = script.text.index('  function revealAnchor()', start)
        rest = script.text[end:].replace("target.scrollIntoView({block:'start'});updateHeaderPrice();",
                                         "target.scrollIntoView({block:'start'});onScroll();")
        script.text = script.text[:start] + rest

    for page in (old, new):
        for node in page.iter():
            if node.tail and not node.tail.strip():
                node.tail = None
    assert etree.tostring(old) == etree.tostring(new), 'Unexpected change outside the approved hero edits'


if __name__ == '__main__':
    cli = ArgumentParser(description=__doc__)
    cli.add_argument('baseline', type=Path)
    cli.add_argument('current', type=Path)
    args = cli.parse_args()
    old, new = [html.fromstring(path.read_bytes()) for path in (args.baseline, args.current)]
    normalize(old, new)
    with TemporaryDirectory() as temp:
        paths = [Path(temp, name) for name in ('base.html', 'current.html')]
        for path, page in zip(paths, (old, new)):
            path.write_bytes(html.tostring(page, encoding='utf-8'))
        subprocess.run([sys.executable, str(Path(__file__).with_name('verify-preservation.py')), *paths], check=True)
    print('PASS: hero copy, CTA, preload, moved photo, header, metadata and all remaining page content.')
