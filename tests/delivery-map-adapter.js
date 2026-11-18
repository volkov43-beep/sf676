// Browser fixture only. Exercise the landing page's SDK callbacks without requesting tiles or a key.
(() => {
  const { mode, pointer } = document.currentScript.dataset;
  const state = window.mapTest = { scripts: 0, registries: 0, instances: 0, errors: [] };
  window.addEventListener('error', event => state.errors.push(event.message));
  window.addEventListener('unhandledrejection', event => state.errors.push(String(event.reason)));

  const realMedia = window.matchMedia.bind(window);
  window.matchMedia = query => query === '(pointer: coarse)'
    ? realMedia(pointer === 'coarse' ? 'all' : 'not all') : realMedia(query);

  const realAppend = document.head.append.bind(document.head);
  document.head.append = (...nodes) => {
    for (const node of nodes) {
      if (node.tagName === 'SCRIPT' && node.src.startsWith('https://api-maps.yandex.ru/v3/')) {
        state.scripts++;
        queueMicrotask(() => node.dispatchEvent(new Event(mode === 'api-error' ? 'error' : 'load')));
      } else {
        realAppend(node);
      }
    }
  };
  const realFetch = window.fetch.bind(window);
  window.fetch = (url, options) => {
    if (new URL(url, document.baseURI).pathname.endsWith('/delivery-points.json')) state.registries++;
    return realFetch(url, options);
  };

  const projection = {
    toWorldCoordinates([lon, lat]) {
      return { x: lon / 180, y: Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI };
    },
    fromWorldCoordinates({ x, y }) {
      return [180 * x, 180 / Math.PI * Math.atan(Math.sinh(Math.PI * y))];
    }
  };

  class TestMap {
    constructor(canvas) {
      state.instances++;
      state.map = this;
      this.canvas = canvas;
      this.projection = projection;
      this.behaviors = [];
      const pointers = new Map();
      canvas.addEventListener('pointerdown', e => pointers.set(e.pointerId, e.clientX));
      canvas.addEventListener('pointerup', e => pointers.delete(e.pointerId));
      canvas.addEventListener('pointermove', e => {
        const start = pointers.get(e.pointerId);
        if (start === undefined || start === e.clientX) return;
        if (pointers.size === 2 && this.behaviors.includes('pinchZoom')) this.setLocation({ zoom: this.zoom + 1 });
        else if (pointers.size === 1 && this.behaviors.includes('drag')) {
          this.setLocation({ center: [this.center[0] + (start - e.clientX) / 100, this.center[1]] });
        }
        pointers.set(e.pointerId, e.clientX);
      });
      canvas.addEventListener('wheel', e => {
        if (!this.behaviors.includes('scrollZoom')) return;
        e.preventDefault();
        this.setLocation({ zoom: this.zoom - Math.sign(e.deltaY) });
      }, { passive: false });
    }
    setBehaviors(behaviors) { this.behaviors = behaviors; }
    setLocation(location) {
      Object.assign(this, location);
      this.clusterer?.render();
    }
    addChild(child) {
      if (child instanceof TestClusterer) this.clusterer = child;
    }
    destroy() { this.canvas.replaceChildren(); }
  }

  class TestMarker {
    constructor(options, element) { this.element = element; }
  }

  class TestClusterer {
    constructor(options) { Object.assign(this, options); }
    update({ features }) { this.features = features; }
    render() {
      const { canvas, zoom, center } = state.map;
      const origin = projection.toWorldCoordinates(center);
      const scale = 128 * 2 ** zoom;
      const cells = new Map();
      for (const feature of this.features) {
        const world = projection.toWorldCoordinates(feature.geometry.coordinates);
        const x = (world.x - origin.x) * scale + canvas.clientWidth / 2;
        const y = (origin.y - world.y) * scale + canvas.clientHeight / 2;
        const key = [Math.floor(x / this.method.gridSize), Math.floor(y / this.method.gridSize)].join(',');
        if (!cells.has(key)) cells.set(key, { features: [], x, y });
        cells.get(key).features.push(feature);
      }
      canvas.replaceChildren();
      for (const cell of cells.values()) {
        const features = cell.features;
        const marker = features.length === 1 ? this.marker(features[0]) : this.cluster(features[0].geometry.coordinates, features);
        Object.assign(marker.element.style, { position: 'absolute', left: cell.x + 'px', top: cell.y + 'px' });
        canvas.append(marker.element);
      }
    }
  }
  const loadPackage = async name => {
    if (name !== '@yandex/ymaps3-clusterer') throw new Error('Unexpected map package');
    return { YMapClusterer: TestClusterer, clusterByGrid: options => options };
  };
  loadPackage.registerCdn = () => {};
  class Layer {}
  window.ymaps3 = { ready: Promise.resolve(), import: loadPackage, YMap: TestMap, YMapMarker: TestMarker,
    YMapListener: Layer, YMapDefaultSchemeLayer: Layer, YMapDefaultFeaturesLayer: Layer };
})();
