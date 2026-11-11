import assert from 'node:assert/strict';
import test from 'node:test';
import { listenForActivationTap } from '../assets/js/delivery-map.js';

function gesture() {
  const surface = new EventTarget();
  let locked = true;
  let activations = 0;
  surface.classList = { contains: name => name === 'touch-locked' && locked };
  const controller = new AbortController();
  listenForActivationTap(surface, () => { activations++; locked = false; }, controller.signal);
  function pointer(type, x, time, overrides = {}) {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { clientX: x, clientY: 100, pointerId: 1, isPrimary: true, button: 0 }, overrides);
    Object.defineProperty(event, 'timeStamp', { value: time });
    assert.ok(surface.dispatchEvent(event), 'page gestures must keep their default action');
  }
  return { pointer, count: () => activations, controller };
}

test('one short primary tap activates once; a non-primary button does not', () => {
  const { pointer, count } = gesture();
  pointer('pointerdown', 100, 0, { button: 2 });
  pointer('pointerup', 100, 100);
  assert.equal(count(), 0);
  for (const start of [150, 300]) {
    pointer('pointerdown', 100, start);
    pointer('pointerup', 104, start + 80);
  }
  assert.equal(count(), 1);
});

test('a swipe returning to its origin, a long press and multi-touch keep the page scrollable', () => {
  const { pointer, count } = gesture();
  pointer('pointerdown', 100, 0);
  pointer('pointermove', 100, 60, { clientY: 150 });
  pointer('pointerup', 100, 120);
  pointer('pointerdown', 100, 200);
  pointer('pointerup', 100, 900);
  pointer('pointerdown', 100, 950);
  pointer('pointerdown', 130, 970, { pointerId: 2, isPrimary: false });
  pointer('pointerup', 130, 990, { pointerId: 2, isPrimary: false });
  pointer('pointerup', 100, 1000);
  assert.equal(count(), 0);
});

test('cancel, leave and disposal discard unfinished taps', () => {
  const { pointer, count, controller } = gesture();
  for (const type of ['pointercancel', 'pointerleave']) {
    pointer('pointerdown', 100, 0);
    pointer(type, 100, 20);
    pointer('pointerup', 100, 60);
  }
  pointer('pointerdown', 100, 80);
  controller.abort();
  pointer('pointerup', 100, 100);
  assert.equal(count(), 0);
});
