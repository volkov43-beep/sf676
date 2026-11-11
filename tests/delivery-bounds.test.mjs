import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { bounds, fittedLocation } from '../assets/js/delivery-map.js';

const points = JSON.parse(readFileSync(new URL('../assets/data/delivery-points.json', import.meta.url)));
const features = points.map(({ city, coordinates, type }) => ({ city, type, geometry: { coordinates } }));
const projection = {
  toWorldCoordinates([lon, lat]) {
    return { x: lon / 180, y: Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI };
  },
  fromWorldCoordinates({ x, y }) {
    return [x * 180, Math.atan(Math.sinh(y * Math.PI)) * 180 / Math.PI];
  }
};

function checkViewport(selection, width, height) {
  const view = fittedLocation(selection, projection, width, height);
  assert.ok(Number.isInteger(view.zoom), 'cluster grid needs an integer zoom');
  const center = projection.toWorldCoordinates(view.center);
  const scale = 128 * 2 ** view.zoom;
  for (const point of selection) {
    const world = projection.toWorldCoordinates(point.geometry.coordinates);
    const dx = Math.abs(world.x - center.x) * scale;
    const dy = Math.abs(world.y - center.y) * scale;
    assert.ok(dx <= width / 2 - 28 + 1e-8 && dy <= height / 2 - 28 + 1e-8,
      `${point.city} outside padded viewport at ${width}×${height}`);
  }
  return view;
}

const groups = [
  ['all', 90, [[20.51102, 68.96778], [158.62751, 40.16557]]],
  ['russia', 73, [[20.51102, 68.96778], [158.62751, 42.97782]]],
  ['export', 17, [[24.10589, 56.946], [77.06304, 40.16557]]]
];
for (const [filter, count, expected] of groups) {
  test(`${filter}: YMap corners and visible points after fit`, () => {
    const selection = features.filter(f => filter === 'all' || f.type === filter);
    assert.equal(selection.length, count);
    assert.deepEqual(bounds(selection), expected);
    for (const [width, height] of [[240, 280], [320, 280], [700, 330], [1120, 420]]) {
      checkViewport(selection, width, height);
    }
  });
}

test('opening the Moscow–Krasnogorsk cluster fits both places at a closer zoom', () => {
  const cluster = features.filter(f => ['Москва', 'Красногорск'].includes(f.city));
  assert.equal(cluster.length, 2);
  assert.deepEqual(bounds(cluster), [[37.32984, 55.81904], [37.61781, 55.75204]]);
  for (const width of [240, 1120]) {
    const overview = checkViewport(features, width, 320);
    const expanded = checkViewport(cluster, width, 320);
    assert.ok(expanded.zoom > overview.zoom);
  }
});
