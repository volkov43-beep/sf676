"""Iteration 2 contract and preservation: python tests/verify-cta-distribution.py BASELINE CURRENT."""
import sys
from copy import deepcopy
from lxml import etree, html

old, new = (html.parse(path).getroot() for path in sys.argv[1:])
links = new.xpath('//a[@data-request-form]')
assert len(old.xpath('//a[@data-request-form]')) == 16
assert len(links) == 19
assert len({link.get('data-source-cta') for link in links}) == 19
assert {link.get('data-request-form') for link in links} == {
    'price_quote', 'configuration_help', 'repair_comparison',
    'procurement_documents', 'procurement_nmck',
}
for link in links:
    assert link.get('href') == '#order'
    section = link.xpath('ancestor::section/@id')
    assert link.get('data-source-section') == (section[-1] if section else 'sticky')

expected = {
    'specs-price': ('specs', 'price_quote', 'red', 'Запросить стоимость СФ676'),
    'design-consult': ('design', 'configuration_help', 'out', 'Обсудить комплектацию с технологом'),
    'compare-new-price': ('compare', 'price_quote', 'red', 'Получить цену нового СФ676'),
}
for source, (section, scenario, style, text) in expected.items():
    link, = new.xpath('//a[@data-source-cta=$source]', source=source)
    assert link.get('data-source-section') == section
    assert link.get('data-request-form') == scenario
    assert link.get('class') == 'btn ' + style
    assert link.text == text
    assert not link.xpath('ancestor::table|ancestor::article|ancestor::*[@data-sf676-gallery]')

def one(root, expression):
    node, = root.xpath(expression)
    return node

specs = one(new, '//a[@data-source-cta="specs-price"]/..')
assert specs.getprevious().get('class') == 'spec-groups'
assert specs.getnext().get('class') == 'spec-operations'
design = one(new, '//a[@data-source-cta="design-consult"]/..')
groups = new.xpath('//*[@id="design"]//*[@class="construction-grid"]')
assert len(groups) == 2 and [len(group) for group in groups] == [3, 3]
assert design.getprevious() is groups[0] and design.getnext() is groups[1]
assert groups[0][-1].xpath('.//h3/span/text()') == ['Литая станина']
actions = one(new, '//*[@class="comparison-actions"]')
assert [link.get('data-source-cta') for link in actions] == ['compare-request', 'compare-new-price']
plant = one(new, '//a[@data-source-cta="plant-region"]/..')
assert plant.getparent().get('id') == 'delivery-geography'
assert plant.getprevious().get('class') == 'delivery-map-ui'
assert plant.getnext().get('class') == 'delivery-status'

# Undo only the authorized changes, then compare the entire original document.
# This also protects text, illustrations, tables, forms, scripts, metadata and order.
restored = deepcopy(new)
for source in ('specs-price', 'design-consult'):
    wrapper = one(restored, '//a[@data-source-cta="' + source + '"]/..')
    wrapper.getparent().remove(wrapper)
first, second = restored.xpath('//*[@id="design"]//*[@class="construction-grid"]')
for card in list(second):
    first.append(card)
second.getparent().remove(second)
actions = one(restored, '//*[@class="comparison-actions"]')
actions.remove(actions[1])
actions.getparent().replace(actions, actions[0])
plant = one(restored, '//a[@data-source-cta="plant-region"]/..')
one(restored, '//*[@id="plant"]/div[@class="wrap"]').append(plant)
original_style = one(old, '//style').text
updated_style = one(restored, '//style')
assert updated_style.text.startswith(original_style)
assert updated_style.text[len(original_style):].startswith('/* CTA distribution:')
updated_style.text = original_style

def normalized(root):
    for node in root.iter():
        if node.text and not node.text.strip():
            node.text = None
        if node.tail and not node.tail.strip():
            node.tail = None
    return etree.tostring(root, method='html', with_tail=False)

assert normalized(old) == normalized(restored), 'Unexpected change outside CTA distribution'
print('PASS: 16 → 19 unique CTA links; five scenarios; positions; original HTML preserved outside the four changes.')
