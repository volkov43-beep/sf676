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

function showPhoto(at) {
  if (at < 0 || at >= photos.length) return;
  photos[index].removeAttribute('aria-current');
  index = at;
  const photo = photos[index];
  photo.setAttribute('aria-current', 'true');
  image.alt = photo.querySelector('img').alt;
  image.src = photo.href;
  caption.textContent = image.alt;
  position.textContent = (index + 1) + ' из ' + photos.length;
  previous.setAttribute('aria-disabled', String(index === 0));
  next.setAttribute('aria-disabled', String(index === photos.length - 1));
}

function openViewer(group, link) {
  if (document.querySelector('dialog[open]')) return;
  photos = group;
  opener = link;
  // A different thumbnail may have been selected the last time this group was open.
  for (const photo of group) photo.removeAttribute('aria-current');
  index = group.indexOf(link);
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
    if (event.shiftKey && document.activeElement === previous) {
      event.preventDefault();
      close.focus();
    } else if (!event.shiftKey && document.activeElement === close) {
      event.preventDefault();
      previous.focus();
    }
  }
});

const stage = viewer.querySelector('.gallery-stage');
let touch = null;
stage.addEventListener('pointerdown', event => {
  touch = event.pointerType === 'touch' && event.isPrimary ? event : null;
});
stage.addEventListener('pointercancel', () => { touch = null; });
stage.addEventListener('pointerup', event => {
  const start = touch;
  touch = null;
  if (!start || start.pointerId !== event.pointerId) return;
  const dx = event.clientX - start.clientX;
  const dy = event.clientY - start.clientY;
  if (Math.abs(dx) >= 48 && Math.abs(dx) > 1.5 * Math.abs(dy)) showPhoto(index + (dx < 0 ? 1 : -1));
});

for (const gallery of document.querySelectorAll('[data-sf676-gallery]')) {
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
    link.addEventListener('click', event => {
      if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      openViewer(links, link);
    });
    link.addEventListener('keydown', event => {
      if (event.key === ' ' && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        event.preventDefault();
        if (!event.repeat) link.click();
      }
    });
  }
}
