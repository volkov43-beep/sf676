"""Usage: python tests/verify-payment-preservation.py BASELINE CURRENT (requires lxml)."""
import sys
from pathlib import Path
from lxml import html, etree
old, new = (html.fromstring(Path(p).read_bytes()) for p in sys.argv[1:3])
def serialized(nodes):
    return [etree.tostring(n, method='html', with_tail=False) for n in nodes]
ids = ['top','advantages','specs','price','acceptance','design','compare','config','delivery','gov','plant','faq','order']
assert new.xpath('//section[@id and @id!="qlist"]/@id') == ids
for sid in [sid for sid in ids if sid != "price"]:
    a,b = (root.get_element_by_id(sid) for root in (old,new))
    assert ' '.join(a.itertext()) == ' '.join(b.itertext()), sid
for css in ['section-heading','lead','purchase-conditions']:
    assert serialized(old.xpath('//section[@id="price"]//*[@class=$css]',css=css)) == serialized(new.xpath('//section[@id="price"]//*[@class=$css]',css=css))
plan=new.xpath('//*[@class="payment-plan"]')[0]
for amount in plan.xpath('.//*[@data-payment-enhanced]'): amount.getparent().remove(amount)
assert serialized(old.xpath('//*[@class="payment-plan"]')) == serialized([plan])
assert serialized(old.xpath('//*[@class="payment-scale"]')) == serialized(new.xpath('//*[@class="payment-scale"]'))
assert serialized(old.xpath('//table')) == serialized(new.xpath('//table'))
assert serialized(old.xpath('//picture|//img')) == serialized(new.xpath('//picture|//img'))
assert serialized(old.xpath('//*[local-name()="svg"]')) == serialized(new.xpath('//*[local-name()="svg"]'))
assert serialized(old.xpath('//style')) == serialized(new.xpath('//style'))
assert serialized(old.xpath('//script[not(@src)]')) == serialized(new.xpath('//script[not(@src)]'))
assert serialized(old.xpath('//*[@class="ui-card order-contacts"]')) == serialized(new.xpath('//*[@class="ui-card order-contacts"]'))
assert new.xpath('//meta[@name="robots"]/@content') == ['noindex, nofollow']
assert serialized(old.xpath('//*[@data-q]')) == serialized(new.xpath('//*[@data-q]'))
assert len(new.xpath('//dialog')) == 1
assert len(new.xpath('//*[@data-request-form]')) == 8
assert all(a.get('href') == '#order' for a in new.xpath('//*[@data-request-form]'))
all_ids = new.xpath('//*[@id]/@id'); assert len(all_ids) == len(set(all_ids))
assert all(new.xpath('//*[@id=$target]', target=a.get('href')[1:]) for a in new.xpath('//a[starts-with(@href,"#")]'))
assert new.xpath('//form/@method') == ['dialog']
assert not new.xpath('//form/@action|//input[@type="file"]|//button[@type="submit"]')
print('PASS: 13 sections; unchanged text outside price, original payment scheme and all commercial conditions, tables, photos, SVG, inline styles/JS, contacts, questions; 8 fallback CTAs; unique IDs; safe form.')
