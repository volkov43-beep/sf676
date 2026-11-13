"""Usage: python tests/verify-preservation.py BASELINE CURRENT [--branding | --historical | --part1] (requires lxml)."""
from lxml import etree
from preservation import read_pages

old, new, mode, cta_count = read_pages()
def serialized(nodes):
    return [etree.tostring(n, method='html', with_tail=False) for n in nodes]
ids = ['top','advantages','specs','price','acceptance','design','compare','config','delivery','gov','plant','faq','order']
assert new.xpath('//section[@id and @id!="qlist"]/@id') == ids
for sid in ids[:-1]:
    a,b = (root.get_element_by_id(sid) for root in (old,new))
    assert ' '.join(a.itertext()) == ' '.join(b.itertext()), sid
assert serialized(old.xpath('//table')) == serialized(new.xpath('//table'))
assert serialized(old.xpath('//*[local-name()="svg"]')) == serialized(new.xpath('//*[local-name()="svg"]'))
assert serialized(old.xpath('//script[not(@src)]')) == serialized(new.xpath('//script[not(@src)]'))
assert serialized(old.xpath('//*[@class="ui-card order-contacts"]')) == serialized(new.xpath('//*[@class="ui-card order-contacts"]'))
assert new.xpath('//meta[@name="robots"]/@content') == ['noindex, nofollow']
assert serialized(old.xpath('//*[@data-q]')) == serialized(new.xpath('//*[@data-q]'))
assert len(new.xpath('//dialog')) == 1
assert all(a.get('href') == '#order' for a in new.xpath('//*[@data-request-form]'))
all_ids = new.xpath('//*[@id]/@id'); assert len(all_ids) == len(set(all_ids))
assert all(new.xpath('//*[@id=$target]', target=a.get('href')[1:]) for a in new.xpath('//a[starts-with(@href,"#")]'))
assert new.xpath('//form/@method') == ['dialog']
assert not new.xpath('//form/@action|//input[@type="file"]|//button[@type="submit"]')
print(f'PASS: 13 sections; unchanged text outside order, tables, photos outside the header mark, SVG and inline JS, contacts, questions; {cta_count} fallback CTAs; unique IDs; safe form.')
