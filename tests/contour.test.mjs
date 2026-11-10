import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOptions, sampleField, buildContourSVG, createContourField } from '../contour-field.mjs';

test('partial edits preserve the other field and style choices', () => {
  const original = normalizeOptions({ field: { seed: 721, scale: [3, 4] }, style: { color: '#aabbcc' } });
  const changed = normalizeOptions({ field: { bands: 32 }, style: { alpha: 0.12 } }, original);
  assert.equal(changed.field.seed, 721);
  assert.deepEqual(changed.field.scale, [3, 4]);
  assert.equal(changed.field.bands, 32);
  assert.equal(changed.style.color, '#aabbcc');
  assert.equal(changed.style.alpha, 0.12);
  assert.notEqual(changed.field, original.field);
});

test('untrusted imported settings cannot produce non-finite values or markup colors', () => {
  const result = normalizeOptions({ field: { octaves: Infinity, bands: -12, scale: [NaN, -4] }, style: { alpha: 400, color: '<script>', fade: [0.9, 0.1] } });
  assert.ok(Number.isFinite(result.field.octaves));
  assert.ok(result.field.bands >= 4);
  assert.ok(result.field.scale.every(v => Number.isFinite(v) && v > 0));
  assert.equal(result.style.alpha, 1);
  assert.match(result.style.color, /^#[a-f0-9]{6}$/i);
  assert.ok(result.style.fade[1] > result.style.fade[0]);
});

test('the same seed and time reproduce the terrain, another time deforms it', () => {
  const settings = normalizeOptions({ field: { seed: 721 } });
  const before = Array.from({ length: 25 }, (_, i) => sampleField((i % 5) / 4, Math.floor(i / 5) / 4, 8, settings));
  const again = Array.from({ length: 25 }, (_, i) => sampleField((i % 5) / 4, Math.floor(i / 5) / 4, 8, settings));
  const later = Array.from({ length: 25 }, (_, i) => sampleField((i % 5) / 4, Math.floor(i / 5) / 4, 70, settings));
  assert.deepEqual(before, again);
  assert.ok(later.some((v, i) => Math.abs(v - before[i]) > 0.005));
});

test('SVG export produces actual seeded contour geometry without remote assets', () => {
  const a = buildContourSVG({ field: { seed: 72 } }, { width: 180, height: 240, time: 5, transparent: true });
  const b = buildContourSVG({ field: { seed: 72 } }, { width: 180, height: 240, time: 5, transparent: true });
  const c = buildContourSVG({ field: { seed: 73 } }, { width: 180, height: 240, time: 5, transparent: true });
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.ok((a.match(/<path /g) || []).length > 8);
  assert.match(a, /<mask/);
  assert.doesNotMatch(a, /<script|(?:href|src)="https?:|<image|foreignObject/);
  assert.match(a, /width="180" height="240"/);
});

test('creating a field requires an actual drawing surface', () => {
  assert.throws(() => createContourField({}), /canvas/i);
});
