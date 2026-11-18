const template = document.getElementById('gallery-viewer-template');
const viewer = template.content.querySelector('dialog').cloneNode(true);
const image = viewer.querySelector('img');
const position = viewer.querySelector('[role="status"]');
const caption = viewer.querySelector('.gallery-caption');
const previous = viewer.querySelector('.gallery-prev');
const next = viewer.querySelector('.gallery-next');
const close = viewer.querySelector('.gallery-close');
let photos = [];
let index = 0;
let opener = null;
let onSelection = null;

function showPhoto(at) {
  if (at < 0 || at >= photos.length) return;
  photos[index].removeAttribute('aria-current');
  index = at;
  const photo = photos[index];
  photo.setAttribute('aria-current', 'true');
  onSelection?.(index);
  image.alt = photo.querySelector('img').alt;
  image.src = photo.href;
  caption.textContent = image.alt;
  position.textContent = (index + 1) + ' из ' + photos.length;
  previous.setAttribute('aria-disabled', String(index === 0));
  next.setAttribute('aria-disabled', String(index === photos.length - 1));
}

function openViewer(group, at, trigger, title, select = null) {
  if (document.querySelector('dialog[open]')) return;
  photos = group;
  opener = trigger;
  onSelection = select;
  viewer.querySelector('#gallery-title').textContent = title;
  // A different thumbnail may have been selected the last time this group was open.
  for (const photo of group) photo.removeAttribute('aria-current');
  index = at;
  document.body.append(viewer);
  showPhoto(index);
  viewer.showModal();
}

previous.addEventListener('click', () => showPhoto(index - 1));
next.addEventListener('click', () => showPhoto(index + 1));
close.addEventListener('click', () => viewer.close());
viewer.addEventListener('close', () => {
  if (viewer.open) return;
  viewer.remove();
  image.removeAttribute('src');
  if (opener?.isConnected && !document.querySelector('dialog[open]')) opener.focus({preventScroll: true});
  opener = null;
  photos = [];
  onSelection = null;
});

// The native modal makes the page inert. Also yield if another dialog is opened by code.
document.addEventListener('beforetoggle', event => {
  if (viewer.open && event.target !== viewer && event.target.tagName === 'DIALOG' && event.newState === 'open') {
    viewer.close();
  }
}, true);

viewer.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    event.preventDefault();
    showPhoto(index + (event.key === 'ArrowLeft' ? -1 : 1));
  } else if (event.key === 'Tab') {
    if (event.shiftKey && document.activeElement === close) {
      event.preventDefault();
      next.focus();
    } else if (!event.shiftKey && document.activeElement === next) {
      event.preventDefault();
      close.focus();
    }
  }
});

// Consume the compatibility click of a drag, but leave taps, pinch zoom and vertical page scrolling native.
function onSwipe(surface, step) {
  let start;
  let suppressClick = false;
  surface.addEventListener('pointerdown', event => {
    suppressClick = false;
    start = event.pointerType === 'touch' && event.isPrimary ? event : null;
  });
  surface.addEventListener('pointercancel', () => { start = null; });
  surface.addEventListener('pointerup', event => {
    if (!start || event.pointerId !== start.pointerId) return;
    const dx = event.clientX - start.clientX;
    const dy = event.clientY - start.clientY;
    start = null;
    suppressClick = Math.max(Math.abs(dx), Math.abs(dy)) >= 12;
    if (Math.abs(dx) >= 48 && Math.abs(dx) > 1.5 * Math.abs(dy)) step(dx < 0 ? 1 : -1);
  });
  surface.addEventListener('click', event => {
    if (!suppressClick || event.detail === 0) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
}

onSwipe(viewer.querySelector('.gallery-stage'), direction => showPhoto(index + direction));

function bindLink(link, activate) {
  link.addEventListener('click', event => {
    if (event.button || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    activate();
  });
  link.addEventListener('keydown', event => {
    if (event.key === ' ' && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
      event.preventDefault();
      if (!event.repeat) link.click();
    }
  });
}

function initShowcase(gallery, title) {
  const main = gallery.querySelector('.tech-main');
  const hero = main.querySelector('.tech-photo');
  const preview = document.createElement('img');
  preview.width = 1600;
  preview.height = 1066;
  preview.loading = 'lazy';
  preview.decoding = 'async';
  preview.sizes = '(min-width: 1200px) 722px, (min-width: 1024px) calc(64vw - 43px), calc(100vw - 48px)';
  hero.prepend(preview);
  const track = gallery.querySelector('.tech-thumbs');
  const links = [...track.querySelectorAll('a')];
  const desktop = matchMedia('(min-width: 1024px)');
  const name = main.querySelector('.tech-name');
  const counter = main.querySelector('.tech-counter');
  let selected = 0;

  function updateThumbnails() {
    links.forEach((link, i) => {
      const active = selected === i;
      if (desktop.matches && active && document.activeElement === link) hero.focus({preventScroll: true});
      link.parentElement.hidden = desktop.matches && active;
      link.setAttribute('aria-current', String(active));
    });
    if (!desktop.matches) {
      const item = links[selected].getBoundingClientRect();
      const rail = track.getBoundingClientRect();
      if (item.left < rail.left) track.scrollLeft += item.left - rail.left;
      else if (item.right > rail.right) track.scrollLeft += item.right - rail.right;
    }
  }

  function select(at) {
    selected = (at + links.length) % links.length;
    const link = links[selected];
    const thumb = link.querySelector('img');
    const label = link.querySelector('span').textContent;
    hero.href = link.href;
    hero.setAttribute('aria-label', 'Увеличить фото: ' + label);
    preview.alt = thumb.alt;
    preview.srcset = thumb.src + ' 640w, ' + link.href + ' 1600w';
    preview.src = thumb.src;
    name.textContent = label;
    counter.textContent = String(selected + 1).padStart(2, '0') + ' / ' + String(links.length).padStart(2, '0');
    updateThumbnails();
  }

  main.hidden = false;
  select(0);
  desktop.addEventListener('change', updateThumbnails);
  for (const [at, link] of links.entries()) {
    link.setAttribute('role', 'button');
    link.setAttribute('aria-label', 'Выбрать ракурс: ' + link.querySelector('span').textContent);
    link.setAttribute('aria-controls', hero.id);
    bindLink(link, () => {
      if (desktop.matches) hero.focus({preventScroll: true});
      select(at);
    });
  }
  main.querySelector('.gallery-prev').addEventListener('click', () => select(selected - 1));
  main.querySelector('.gallery-next').addEventListener('click', () => select(selected + 1));
  onSwipe(hero, direction => select(selected + direction));
  if (typeof viewer.showModal === 'function') {
    hero.setAttribute('aria-haspopup', 'dialog');
    bindLink(hero, () => openViewer(links, selected, hero, title, select));
  }
}

for (const gallery of document.querySelectorAll('[data-sf676-gallery]')) {
  const title = gallery.querySelector('h2, h3').textContent;
  if (gallery.classList.contains('tech-gallery')) {
    initShowcase(gallery, title);
    continue;
  }
  const track = gallery.querySelector('.gallery-track');
  const links = Array.from(track.querySelectorAll('.gallery-photo'));
  const controls = gallery.querySelector('.gallery-controls');
  const back = controls.querySelector('.gallery-prev');
  const forward = controls.querySelector('.gallery-next');

  function updateControls() {
    const limit = track.scrollWidth - track.clientWidth;
    controls.hidden = limit <= 1;
    back.setAttribute('aria-disabled', String(track.scrollLeft <= 1));
    forward.setAttribute('aria-disabled', String(track.scrollLeft >= limit - 1));
  }

  function scrollOne(direction) {
    const step = links[1].getBoundingClientRect().left - links[0].getBoundingClientRect().left;
    track.scrollBy({left: direction * step, behavior: 'instant'});
  }

  if (links.length > 1) {
    back.addEventListener('click', () => scrollOne(-1));
    forward.addEventListener('click', () => scrollOne(1));
    track.addEventListener('scroll', updateControls, {passive: true});
    new ResizeObserver(updateControls).observe(track);
    updateControls();
  }

  if (typeof viewer.showModal !== 'function') continue;
  for (const link of links) {
    link.setAttribute('aria-haspopup', 'dialog');
    bindLink(link, () => openViewer(links, links.indexOf(link), link, title));
  }
}
