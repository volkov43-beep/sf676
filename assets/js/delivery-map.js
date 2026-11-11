const API_URL = 'https://api-maps.yandex.ru/v3/';
const CLUSTER_PACKAGE = '@yandex/ymaps3-clusterer';
const registry = new URL('../data/delivery-points.json', import.meta.url);
const MAP_PADDING = 28;
let apiRequest;

function loadApi(key) {
  if (!apiRequest) {
    apiRequest = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const url = new URL(API_URL);
      url.search = new URLSearchParams({ apikey: key, lang: 'ru_RU' });
      script.src = url.href;
      script.async = true;
      script.onload = () => {
        const api = window.ymaps3;
        if (!api?.ready) return reject(new Error('API unavailable'));
        resolve(Promise.resolve(api.ready).then(() => api));
      };
      script.onerror = () => reject(new Error('Map unavailable'));
      document.head.append(script);
    });
  }
  return apiRequest;
}

async function loadPoints(signal) {
  const response = await fetch(registry, { signal });
  if (!response.ok) throw new Error('Registry unavailable');
  return response.json();
}

async function loadClusters(api) {
  api.import.registerCdn('https://cdn.jsdelivr.net/npm/{package}', [CLUSTER_PACKAGE + '@0.0.13']);
  return api.import(CLUSTER_PACKAGE);
}

// YMap LngLatBounds: top-left [west, north], bottom-right [east, south].
export function bounds(features) {
  const coords = features.map(feature => feature.geometry.coordinates);
  const lons = coords.map(point => point[0]);
  const lats = coords.map(point => point[1]);
  return [[Math.min(...lons), Math.max(...lats)], [Math.max(...lons), Math.min(...lats)]];
}

export function fittedLocation(features, projection, width, height) {
  const [nw, se] = bounds(features).map(point => projection.toWorldCoordinates(point));
  const center = projection.fromWorldCoordinates({ x: (nw.x + se.x) / 2, y: (nw.y + se.y) / 2 });
  // The grid renders at integer zooms. Round down to include the outer cells and marker radii.
  // YMap's projected world spans two units, or 256 CSS pixels at zoom zero.
  const fitX = (width - 2 * MAP_PADDING) / (128 * Math.abs(se.x - nw.x));
  const fitY = (height - 2 * MAP_PADDING) / (128 * Math.abs(se.y - nw.y));
  const zoom = Math.max(0, Math.min(19, Math.floor(Math.log2(Math.min(fitX, fitY)))));
  return { center, zoom };
}

// Keep native page scrolling. A swipe (even one that returns to its origin),
// a second finger or a browser-cancelled pointer cannot unlock the map.
export function listenForActivationTap(surface, activate, signal) {
  let start;
  function moved(event) {
    return Math.hypot(event.clientX - start.x, event.clientY - start.y) >= 10;
  }
  surface.addEventListener('pointerdown', event => {
    start = null;
    if (event.target === surface && surface.classList.contains('touch-locked') &&
        event.isPrimary && event.button === 0) {
      start = { id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp };
    }
  }, { signal });
  surface.addEventListener('pointermove', event => {
    if (start?.id === event.pointerId && moved(event)) start = null;
  }, { signal });
  for (const type of ['pointercancel', 'pointerleave']) {
    surface.addEventListener(type, event => {
      if (start?.id === event.pointerId) start = null;
    }, { signal });
  }
  surface.addEventListener('pointerup', event => {
    if (start?.id !== event.pointerId) return;
    const tapped = !moved(event) && event.timeStamp - start.time < 700;
    start = null;
    if (tapped && surface.classList.contains('touch-locked')) activate();
  }, { signal });
}

// Called once per block. The deadline includes data, API script, API readiness and optional clustering.
function mountDeliveryMap(root, key) {
  const timeout = 15000;
  const moduleTimeout = 1800;
  const ui = root.querySelector('.delivery-map-ui');
  const status = root.querySelector('.delivery-status');
  const directory = root.querySelector('.delivery-directory');
  const surface = root.querySelector('.delivery-surface');
  const hint = root.querySelector('.delivery-tap-hint');
  const canvas = root.querySelector('.delivery-canvas');
  const selection = root.querySelector('.delivery-selection');
  const touchButton = root.querySelector('.delivery-touch');
  const filters = [...root.querySelectorAll('[data-filter]')];
  const controller = new AbortController();
  const { signal } = controller;
  const coarse = matchMedia('(pointer: coarse)');
  let map, api, clusterer, observer, deadlineTimer, moduleTimer;
  let started = false;
  let features = [];
  let visible = [];
  let markers = [];
  let selected;
  let filter = 'all';

  function setMapReady(ready) {
    directory.hidden = ready;
    status.classList.toggle('sr-only', ready);
  }

  function dispose() {
    controller.abort();
    observer?.disconnect();
    clearTimeout(deadlineTimer);
    clearTimeout(moduleTimer);
    map?.destroy();
    map = null;
    ui.hidden = true;
    setMapReady(false);
  }

  function unavailable() {
    dispose();
    status.textContent = 'Карта недоступна. Полная география поставок приведена в списке ниже.';
  }

  function closeLabel(restoreFocus = false) {
    if (!selected) return;
    const previous = selected;
    selected = null;
    previous.setAttribute('aria-pressed', 'false');
    selection.hidden = true;
    if (restoreFocus) {
      (previous.isConnected ? previous : filters.find(b => b.dataset.filter === filter)).focus();
    }
  }

  function marker(feature) {
    const p = feature.properties;
    const label = p.type === 'russia' ? p.region + '. Условная точка: ' + p.city : p.country + ' — ' + p.city;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'delivery-pin ' + p.type;
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', 'false');
    button.onclick = () => {
      const closing = selected === button;
      closeLabel();
      if (closing) return;
      selected = button;
      button.setAttribute('aria-pressed', 'true');
      selection.querySelector('span').textContent = label;
      selection.hidden = false;
      selection.querySelector('button').focus({ preventScroll: true });
    };
    return new api.YMapMarker({ coordinates: feature.geometry.coordinates }, button);
  }

  function fit(items) {
    map.setLocation(fittedLocation(items, map.projection, canvas.clientWidth, canvas.clientHeight));
  }

  function cluster(coordinates, items) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'delivery-cluster';
    button.textContent = items.length;
    button.setAttribute('aria-label', 'Приблизить группу. Географических точек: ' + items.length);
    button.onclick = () => {
      closeLabel();
      fit(items);
      filters.find(b => b.dataset.filter === filter).focus({ preventScroll: true });
    };
    return new api.YMapMarker({ coordinates }, button);
  }

  function showFilter(value) {
    closeLabel();
    filter = value;
    visible = value === 'all' ? features : features.filter(f => f.properties.type === value);
    if (clusterer) {
      clusterer.update({ features: visible });
    } else {
      for (const marker of markers) map.removeChild(marker);
      markers = visible.map(marker);
      for (const point of markers) map.addChild(point);
    }
    fit(visible);
    for (const button of filters) button.setAttribute('aria-pressed', String(button.dataset.filter === value));
    status.textContent = 'Географических точек в выбранной группе: ' + visible.length + '.' +
      (clusterer ? ' Число в кружке обозначает количество точек.' : '');
  }

  function setTouch(active) {
    touchButton.hidden = !coarse.matches;
    touchButton.setAttribute('aria-pressed', String(active));
    touchButton.textContent = active ? 'Вернуть прокрутку страницы' : 'Двигать карту';
    const locked = coarse.matches && !active;
    surface.classList.toggle('touch-locked', locked);
    hint.hidden = !locked;
    const behaviors = ['drag', 'pinchZoom', 'dblClick'];
    if (!coarse.matches) behaviors.push('scrollZoom');
    map.setBehaviors(locked ? [] : behaviors);
  }

  async function start() {
    if (started || signal.aborted) return;
    started = true;
    observer?.disconnect();
    window.addEventListener('offline', unavailable, { signal });
    if (!key) return unavailable();
    const end = performance.now() + timeout;
    deadlineTimer = setTimeout(unavailable, timeout);
    status.textContent = 'Загружается карта поставок…';
    try {
      const [loadedApi, points] = await Promise.all([loadApi(key), loadPoints(signal)]);
      if (signal.aborted) return;
      api = loadedApi;
      features = points.map(p => ({
        type: 'Feature', id: p.id, geometry: { type: 'Point', coordinates: p.coordinates }, properties: p
      }));
      // The optional package only gets the unused part of the startup budget.
      clearTimeout(deadlineTimer);
      const clusters = await Promise.race([
        Promise.resolve().then(() => loadClusters(api)).catch(() => null),
        new Promise(resolve => {
          moduleTimer = setTimeout(() => resolve(null), Math.max(0, Math.min(moduleTimeout, end - performance.now())));
        })
      ]);
      clearTimeout(moduleTimer);
      if (signal.aborted) return;
      ui.hidden = false;
      map = new api.YMap(canvas, {
        location: { bounds: bounds(features) }, margin: [MAP_PADDING, MAP_PADDING, MAP_PADDING, MAP_PADDING],
        mode: 'raster', behaviors: [], zoomRounding: 'smooth', copyrightsPosition: 'bottom right'
      });
      // A ready SDK can still receive no basemap tiles (for example when service limits apply).
      // Use the provider's layer state when available; missing diagnostics alone are not an error.
      let awaitingTiles = false;
      let hasTiles = false;
      map.addChild(new api.YMapListener({
        onStateChanged(state) {
          if (hasTiles || signal.aborted) return;
          const tiles = state.getLayerState('delivery-ground', 'tile', 'raster');
          if (!tiles) return;
          awaitingTiles = tiles.tilesTotal > 0;
          if (tiles.tilesReady > 0) {
            hasTiles = true;
            clearTimeout(deadlineTimer);
          }
        }
      }));
      deadlineTimer = setTimeout(() => {
        if (awaitingTiles && !hasTiles) unavailable();
      }, Math.max(0, end - performance.now()));
      map.addChild(new api.YMapDefaultSchemeLayer({ layers: { ground: { id: 'delivery-ground' } } }));
      map.addChild(new api.YMapDefaultFeaturesLayer({}));
      if (clusters) {
        try {
          clusterer = new clusters.YMapClusterer({
            method: clusters.clusterByGrid({ gridSize: 48 }), features, marker, cluster
          });
          map.addChild(clusterer);
        } catch {
          clusterer = null;
        }
      }
      setTouch(false);
      listenForActivationTap(surface, () => setTouch(true), signal);
      setMapReady(true);
      showFilter('all');
      for (const b of filters) b.addEventListener('click', () => showFilter(b.dataset.filter), { signal });
      for (const b of root.querySelectorAll('[data-zoom]')) {
        b.addEventListener('click', () => map.setLocation({ zoom: map.zoom + Number(b.dataset.zoom) }), { signal });
      }
      touchButton.addEventListener('click', () => setTouch(touchButton.getAttribute('aria-pressed') === 'false'), { signal });
      coarse.addEventListener('change', () => setTouch(false), { signal });
      selection.querySelector('button').addEventListener('click', () => closeLabel(true), { signal });
      ui.addEventListener('keydown', e => { if (e.key === 'Escape') closeLabel(true); }, { signal });
    } catch {
      if (!signal.aborted) unavailable();
    }
  }

  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) start();
    }, { rootMargin: '300px 0px' });
    observer.observe(root);
  } else {
    start();
  }
  // A persisted page keeps its existing instance when restored from the back/forward cache.
  window.addEventListener('pagehide', event => { if (!event.persisted) dispose(); }, { signal });
  return dispose;
}

const geography = globalThis.document?.getElementById('delivery-geography');
if (geography) mountDeliveryMap(geography, document.querySelector('meta[name="yandex-maps-key"]')?.content);
