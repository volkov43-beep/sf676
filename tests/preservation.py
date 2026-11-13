"""Check section CTA additions or reproduce an earlier functional/branding acceptance."""
from argparse import ArgumentParser
from copy import deepcopy
from pathlib import Path

from lxml import etree, html


def read_pages():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("baseline", type=Path)
    parser.add_argument("current", type=Path)
    modes = parser.add_mutually_exclusive_group()
    modes.add_argument("--historical", action="store_true", help="check an archived eight-CTA functional change")
    modes.add_argument("--branding", action="store_true", help="allow only the iteration 06 branding changes")
    modes.add_argument("--part1", action="store_true", help="reproduce the first section CTA comparison")
    modes.add_argument("--part2", action="store_true", help="reproduce the second section CTA comparison")
    args = parser.parse_args()
    old, new = (html.fromstring(path.read_bytes()) for path in (args.baseline, args.current))
    if args.branding:
        verify_branding(old, new)
    elif args.part1:
        verify_part1_ctas(old, new)
        return old, new, "section-ctas", 10
    elif args.part2:
        verify_price_ctas(old, new)
        return old, new, "section-ctas", 13
    elif not args.historical:
        verify_header_form(old, new)
        return old, new, "header-form", 13
    else:
        for xpath in ("//picture|//img", "//style"):
            assert fragment_list(old, xpath) == fragment_list(new, xpath), xpath
    assert len(new.xpath('//*[@data-request-form]')) == 8, "historical CTA count"
    return old, new, "branding" if args.branding else "historical", 8


def fragment_list(root, xpath):
    return [etree.tostring(node, method="html", with_tail=False) for node in root.xpath(xpath)]


def verify_header_form(old, new):
    """Validate the additions before comparing the complete HTML with the baseline."""
    links = new.xpath('//*[@data-request-form]')
    assert len(links) == 13 and all(link.get("href") == "#order" for link in links)
    additions = """.sticky .header-email{display:none}
@media (min-width:1024px){
 .sticky .header-email{display:inline-flex;align-items:center;min-height:44px;color:var(--navy);font:600 1rem/1.55 var(--font-body);text-decoration:none;white-space:nowrap}
}
.order-person{grid-template-columns:auto minmax(0,1fr);margin-block:var(--ui-space-1)}
.order-person img{display:block;width:80px;height:80px;border-radius:50%}
@media (max-width:568px){.order-person img{width:64px;height:64px}}
@media (min-width:901px){.order-layout > .ui-card{align-self:stretch}}
.request-details{min-width:0;border-block:1px solid var(--line)}
.request-details > summary{padding:12px 4px;color:var(--navy);font-weight:600;cursor:pointer}
.request-details > .request-fields{padding-block:4px 16px}
"""
    for page in (new, old):
        if page is old and not page.xpath('//header//a[@class="header-email"]'):
            continue
        email, = page.xpath('//header[@class="sticky"]/div[@class="wrap"]/a[@class="header-email"]')
        address = "sale@vsp-kirov.ru"
        assert len(email) == 0 and email.text == address
        assert dict(email.attrib) == {"class": "header-email", "href": "mailto:" + address,
                                      "aria-label": "Написать в отдел продаж: " + address}
        assert email.getprevious().get("class") == "logo" and email.getnext().get("class") == "tel"
        photo, = page.xpath('//*[@id="order"]//*[@class="ui-card order-contacts"]/div[@class="order-person"]/img')
        assert photo.getprevious() is None and photo.getnext().tag == "p" and len(photo) == 0
        prefix = "assets/images/nikolay-bagin-"
        assert dict(photo.attrib) == {
            "src": prefix + "160.webp", "srcset": prefix + "160.webp 160w, " + prefix + "320.webp 320w",
            "sizes": "(max-width:568px) 64px, 80px", "width": "80", "height": "80", "loading": "lazy", "alt": "",
        }
        for item in (email, photo):
            assert not (item.tail or "").strip()
            item.getparent().remove(item)
        style, = page.xpath("/html/head/style")
        assert style.text.count(additions) == 1, "contact and price detail styles"
        style.text = style.text.replace(additions, "")
    assert etree.tostring(old) == etree.tostring(new), "unexpected change outside header email, portrait or their approved styles"


def remove_section_cta(page, section, source, label, form, css):
    """Remove only a validated, standalone final link from the section wrapper."""
    wrap, = page.get_element_by_id(section).xpath('./div[@class="wrap"]')
    holder = wrap[-1]
    assert holder.tag == "div" and dict(holder.attrib) == {"class": "section-cta"}, section
    link, = holder
    assert link.tag == "a" and len(link) == 0 and link.text == label, section
    assert dict(link.attrib) == {
        "class": css, "href": "#order", "data-request-form": form,
        "data-source-section": section, "data-source-cta": source,
    }, source
    assert not (holder.text or "").strip() and not (link.tail or "").strip()
    assert not (holder.tail or "").strip() and not (holder.getprevious().tail or "").strip()
    holder.getprevious().tail = holder.tail
    wrap.remove(holder)


def verify_price_ctas(old, new):
    links = new.xpath('//*[@data-request-form]')
    assert len(links) == 13 and all(link.get("href") == "#order" for link in links)
    original = old.xpath('//*[@data-request-form]')
    assert len(original) in (10, 13), "expected a baseline including part 1"
    expected = [
        ("design", "design-price", "Узнать цену в нужной комплектации"),
        ("delivery", "delivery-quote", "Рассчитать доставку до моего цеха"),
        ("plant", "plant-region", "Узнать цену для моего региона"),
    ]
    for page in ([old, new] if len(original) == 13 else [new]):
        for section, source, label in expected:
            remove_section_cta(page, section, source, label, "price_quote", "btn red")
    assert etree.tostring(old) == etree.tostring(new), "unexpected change outside the three price CTAs"


def verify_part1_ctas(old, new):
    """Reproduce the archived 8-to-10 comparison, including its two CSS rules."""
    links = new.xpath('//*[@data-request-form]')
    assert len(links) == 10 and all(link.get("href") == "#order" for link in links)
    expected = [
        ("specs", "specs-fit", "Проверить станок под мою деталь"),
        ("acceptance", "acceptance-accuracy", "Подобрать класс точности под мою задачу"),
    ]
    for page in (old, new):
        if page is old and not page.xpath('//*[@class="section-cta"]'):
            assert len(page.xpath('//*[@data-request-form]')) == 8
            continue
        for section, source, label in expected:
            remove_section_cta(page, section, source, label, "configuration_help", "btn out")
        assert not page.xpath('//*[@class="section-cta"]')

    # All pre-existing CSS must survive, including rules used by the protected sections.
    rules = (
        ".section-cta{margin-top:var(--ui-space-4);text-align:left}\n"
        "@media (max-width:568px){.section-cta .btn{width:100%;min-height:48px;white-space:normal}}\n"
    )
    for page in (new, old):
        style, = page.xpath("/html/head/style")
        if page is new or rules in style.text:
            assert style.text.count(rules) == 1, "section CTA styles"
            style.text = style.text.replace(rules, "")
    assert etree.tostring(old) == etree.tostring(new), "unexpected change outside the two section CTAs"


def verify_branding(old, new):
    """Compare the complete HTML except the inline CSS, brand links and header mark."""
    expected_links = {
        ("preload", "assets/fonts/open-sans-regular.woff2"),
        ("preload", "assets/fonts/panton-bold.woff2"),
        ("icon", "assets/images/vsz-favicon-32.png"),
        ("apple-touch-icon", "assets/images/vsz-touch-180.png"),
    }
    old_view, new_view = deepcopy(old), deepcopy(new)
    links = new_view.xpath("/html/head/link")
    brand_links = [link for link in links if (link.get("rel"), link.get("href")) in expected_links]
    assert sorted((link.get("rel"), link.get("href")) for link in brand_links) == sorted(expected_links), "brand assets"
    for link in brand_links:
        if link.get("rel") == "preload":
            assert link.get("as") == "font" and link.get("type") == "font/woff2"
            assert link.get("crossorigin") in ("", "anonymous", "crossorigin")
            assert set(link.attrib) == {"rel", "href", "as", "type", "crossorigin"}
        else:
            assert set(link.attrib) <= {"rel", "href", "sizes", "type"}
            assert link.get("sizes") == ("32x32" if link.get("rel") == "icon" else "180x180")
            assert link.get("type", "image/png") == "image/png"
        link.getparent().remove(link)

    for view in (old_view, new_view):
        style, = view.xpath("/html/head/style")
        style.text = None
        head = style.getparent()
        # Head line breaks can change when the new links are inserted.
        for node in head:
            if node.tail and not node.tail.strip():
                node.tail = None

        logo, = view.xpath('//header/a[@class="logo"]|//header/div/a[@class="logo"]')
        assert logo.get("href") == "#top" and logo.text_content().strip() == "ВСЗ", "header link"
        assert set(logo.attrib) == {"class", "href", "aria-label"}, "header link attributes"
        if view is old_view:
            assert len(logo) == 0 and logo.get("aria-label") == "ВСЗ — в начало страницы"
        else:
            assert logo.get("aria-label") == "ВСЗ — Вятский станкостроительный завод, наверх страницы"
            assert [child.tag for child in logo] == ["img", "span"], "unexpected contents of header link"
            image, label = logo
            assert image.get("src") == "assets/images/vsz-logo-80.png" and image.get("alt") == ""
            assert image.get("width") == image.get("height") == "40", "logo dimensions"
            assert set(image.attrib) == {"src", "srcset", "alt", "width", "height"}
            assert image.get("srcset", "").split(", ") == [
                "assets/images/vsz-logo-80.png 2x", "assets/images/vsz-logo-160.png 4x"
            ]
            assert len(label) == 0 and label.text == "ВСЗ" and dict(label.attrib) == {"aria-hidden": "true"}
        logo.attrib.pop("aria-label", None)
        for child in list(logo):
            logo.remove(child)
        logo.text = None
    assert etree.tostring(old_view) == etree.tostring(new_view), "content, metadata, scripts or DOM outside the approved branding changes differ"
