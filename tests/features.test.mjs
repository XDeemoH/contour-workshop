import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOptions, sampleField, buildContourSVG } from '../contour-field.mjs';
import { addPNGProject, readPNGProject, addSVGProject, readSVGProject } from '../project-format.mjs';

const png = new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+nAXsAAAAASUVORK5CYII=', 'base64')], { type:'image/png' });
test('manual hill and valley edit the same seeded terrain locally', () => {
  const base = normalizeOptions({ field:{ seed:721 } });
  const hill = normalizeOptions({ field:{ controls:[[.5,.5,.16,.4]] } }, base);
  const valley = normalizeOptions({ field:{ controls:[[.5,.5,.16,-.4]] } }, base);
  const middle = sampleField(.5,.5,12,base);
  assert.ok(sampleField(.5,.5,12,hill) > middle + .3);
  assert.ok(sampleField(.5,.5,12,valley) < middle - .3);
  assert.ok(Math.abs(sampleField(.02,.02,12,hill)-sampleField(.02,.02,12,base)) < .001);
});
test('portable photo luminance drives contours and survives normalized settings', () => {
  const data = Buffer.from([0,64,128,255]).toString('base64');
  const o = normalizeOptions({ field:{ source:'photo', photo:{width:2,height:2,data}, photoContrast:1 } });
  assert.equal(o.field.photo.data,data);
  assert.ok(sampleField(0,0,0,o) < sampleField(1,1,0,o));
  assert.match(buildContourSVG(o,{width:180,height:240}),/<path /);
});
test('version-one amber and polyline settings migrate to directional contour light', () => {
  const o = normalizeOptions({style:{accent:.5,accentColor:'#c07821'}});
  assert.equal(o.style.light.enabled,true);
  assert.equal(o.style.light.color,'#c07821');
  assert.equal(o.style.light.intensity,.5);
  assert.equal('accent' in o.style,false);
  const old = normalizeOptions({style:{light:{enabled:true,points:[[.1,.8],[.9,.2]],texture:'grain',width:.03}}});
  assert.equal('points' in old.style.light,false);
  assert.equal('texture' in old.style.light,false);
  assert.equal(old.style.light.width,.18);
  assert.ok(old.style.light.angle > 300);
  const svg = buildContourSVG(old,{width:180,height:240,time:0});
  assert.match(svg, /id="lightBeam"/);
  assert.doesNotMatch(svg, /stroke-dashoffset=/);
});
test('direction and time alter only the contour light treatment in SVG', () => {
  const base = {field:{seed:451},style:{light:{enabled:true,color:'#b9701a',intensity:.8,width:.18,speed:.08,angle:0}}};
  const horizontal = buildContourSVG(base,{width:180,height:240,time:5});
  const vertical = buildContourSVG({field:base.field,style:{light:{...base.style.light,angle:90}}},{width:180,height:240,time:5});
  const later = buildContourSVG(base,{width:180,height:240,time:7});
  const unlit = buildContourSVG({field:base.field},{width:180,height:240,time:5});
  assert.notEqual(horizontal,vertical);
  assert.notEqual(horizontal,later);
  assert.match(horizontal, /feGaussianBlur/);
  assert.equal((horizontal.match(/<path /g)||[]).length,(unlit.match(/<path /g)||[]).length);
});
test('PNG iTXt project round trips UTF-8 settings and detects tampering', async () => {
  const project = { version:2, theme:'light', options:{field:{seed:721,controls:[[.3,.4,.1,.2]]}}, label:'等高线' };
  const tagged = await addPNGProject(png,project);
  assert.deepEqual(await readPNGProject(tagged),project);
  const bytes = new Uint8Array(await tagged.arrayBuffer());
  const location = Buffer.from(bytes).indexOf(Buffer.from('等高线'));
  assert.ok(location > 0); bytes[location] ^= 1;
  await assert.rejects(readPNGProject(new Blob([bytes])),/校验/);
});
test('SVG metadata is embedded as inert text and can restore options', () => {
  const project = {version:2, theme:'dark', label:'<script>alert(1)</script>', options:{field:{seed:72}}};
  const svg = addSVGProject(buildContourSVG({field:{seed:72}},{width:180,height:240}),project);
  assert.deepEqual(readSVGProject(svg),project);
  assert.doesNotMatch(svg,/<script>/);
});
test('example files exported under the legacy PULSE keyword still restore', async () => {
  const { readFile } = await import('node:fs/promises');
  const dir = new URL('../exports/', import.meta.url);
  const fromPNG = await readPNGProject(new Blob([await readFile(new URL('example-art-dark-3072x4096.png', dir))]));
  const fromSVG = readSVGProject(await readFile(new URL('example-art-dark-3072x4096.svg', dir), 'utf8'));
  assert.equal(fromPNG.options.field.seed, 451);
  assert.deepEqual(fromSVG.options, fromPNG.options);
});
test('new exports use the renamed keyword and tolerate editor-escaped quotes', async () => {
  const project = { version:2, label:'"引号" & \'apos\'', options:{field:{seed:9}} };
  const tagged = Buffer.from(await (await addPNGProject(png,project)).arrayBuffer());
  assert.ok(tagged.includes('Contour-Workshop-Project') && !tagged.includes('PULSE'));
  const svg = addSVGProject('<svg xmlns="http://www.w3.org/2000/svg"></svg>',project);
  assert.match(svg,/id="contour-workshop-project"/);
  const resaved = svg.replace(/(project">)([^<]*)/,(m,open,body)=>open+body.replace(/"/g,'&quot;').replace(/'/g,'&#39;'));
  assert.deepEqual(readSVGProject(resaved),project);
});
