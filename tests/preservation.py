"""Shared checks for historical functional changes and the optional brand refresh."""
from argparse import ArgumentParser
from copy import deepcopy
from pathlib import Path

from lxml import etree, html


def read_pages():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("baseline", type=Path)
    parser.add_argument("current", type=Path)
    parser.add_argument("--branding", action="store_true", help="allow only the iteration 06 branding changes")
    args = parser.parse_args()
    old, new = (html.fromstring(path.read_bytes()) for path in (args.baseline, args.current))
    if args.branding:
        verify_branding(old, new)
    else:
        for xpath in ("//picture|//img", "//style"):
            assert fragment_list(old, xpath) == fragment_list(new, xpath), xpath
    return old, new, args.branding


def fragment_list(root, xpath):
    return [etree.tostring(node, method="html", with_tail=False) for node in root.xpath(xpath)]


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
