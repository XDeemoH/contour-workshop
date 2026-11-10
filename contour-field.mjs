/** Seeded contour artwork. Dependency-free ESM; WebGL + editable SVG fallback. */
export const DEFAULT_OPTIONS = Object.freeze({
  field: Object.freeze({ scale: Object.freeze([3.7, 4.93]), octaves: 3, bands: 48, warp: 1.35, speed: 0.018, seed: 721,
    source: 'procedural', controls: Object.freeze([]), photo: null, photoContrast: 1, photoInvert: false }),
  style: Object.freeze({ color: '#b8bdbb', background: '#111416', alpha: 0.64, lineWidth: 0.85, softness: 0.8,
    fade: Object.freeze([0.48, 0.82]), edgeFade: 0.10, dashed: true,
    light: Object.freeze({ enabled: false, color: '#b9701a', intensity: 0.7, angle: 30, width: 0.18, speed: 0.08 }) }),
  respectReducedMotion: true, motion: false, fps: 30, maxDpr: 2, renderer: 'auto',
});
const number = (v, fallback, min, max) => Number.isFinite(Number(v)) ? Math.min(max, Math.max(min, Number(v))) : fallback;
const hex = (v, fallback) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : fallback;
const pair = (v, fallback, min, max) => [0, 1].map(i => number(Array.isArray(v) ? v[i] : undefined, fallback[i], min, max));
const MAX_CONTROLS = 12;
const validPhoto = v => v && typeof v === 'object' && Number.isInteger(v.width) && Number.isInteger(v.height) &&
  v.width >= 2 && v.height >= 2 && v.width <= 256 && v.height <= 256 && typeof v.data === 'string' &&
  v.data.length <= 90000 && /^[A-Za-z0-9+/]*={0,2}$/.test(v.data) && v.data.length % 4 === 0 &&
  v.data.length === 4 * Math.ceil(v.width * v.height / 3);
const controls = v => Array.isArray(v) ? v.slice(0, MAX_CONTROLS).filter(c => Array.isArray(c) && c.length >= 4)
  .map(c => [number(c[0], 0.5, 0, 1), number(c[1], 0.5, 0, 1), number(c[2], 0.15, 0.02, 0.6), number(c[3], 0, -0.6, 0.6)]) : [];
export function normalizeOptions(patch = {}, base = DEFAULT_OPTIONS) {
  const p = patch && typeof patch === 'object' ? patch : {}, f = p.field || {}, s = p.style || {}, b = base.field, t = base.style;
  const fade = pair(s.fade, t.fade, 0, 1.5).sort((a, b) => a - b);
  if (fade[1] - fade[0] < 0.01) fade[1] = fade[0] + 0.01;
  const photo = f.photo === null ? null : validPhoto(f.photo) ? { width:f.photo.width, height:f.photo.height, data:f.photo.data } : b.photo;
  const source = f.source === 'photo' || f.source === 'procedural' ? f.source : b.source;
  const legacyPath = Array.isArray(s.light?.points) && s.light.points.length >= 2 ? s.light.points : null;
  const rawLegacyAngle = legacyPath ? (Math.atan2(Number(legacyPath.at(-1)?.[1]) - Number(legacyPath[0]?.[1]), Number(legacyPath.at(-1)?.[0]) - Number(legacyPath[0]?.[0])) * 180 / Math.PI + 360) % 360 : t.light.angle;
  const legacyAngle = Number.isFinite(rawLegacyAngle) ? rawLegacyAngle : t.light.angle;
  return {
    field: { scale: pair(f.scale, b.scale, 0.5, 12), octaves: Math.round(number(f.octaves, b.octaves, 1, 6)),
      bands: number(f.bands, b.bands, 4, 96), warp: number(f.warp, b.warp, 0, 4),
      speed: number(f.speed, b.speed, 0, 0.15), seed: Math.floor(number(f.seed, b.seed, 0, 999999)),
      source: source === 'photo' && !photo ? 'procedural' : source,
      controls: f.controls === undefined ? controls(b.controls) : controls(f.controls),
      photo,
      photoContrast: number(f.photoContrast, b.photoContrast, 0.2, 4),
      photoInvert: typeof f.photoInvert === 'boolean' ? f.photoInvert : b.photoInvert },
    style: { color: hex(s.color, t.color), background: hex(s.background, t.background),
      alpha: number(s.alpha, t.alpha, 0, 1), lineWidth: number(s.lineWidth, t.lineWidth, 0.25, 4),
      softness: number(s.softness, t.softness, 0.1, 2), fade, edgeFade: number(s.edgeFade, t.edgeFade, 0, 0.4),
      dashed: typeof s.dashed === 'boolean' ? s.dashed : t.dashed,
      light: { enabled: typeof s.light?.enabled === 'boolean' ? s.light.enabled : Number(s.accent) > 0 ? true : t.light.enabled,
        color: hex(s.light?.color ?? s.accentColor, t.light.color), intensity: number(s.light?.intensity ?? s.accent, t.light.intensity, 0, 2),
        angle: number(s.light?.angle, legacyAngle, 0, 359),
        width: number(legacyPath ? undefined : s.light?.width, t.light.width, 0.03, 0.45), speed: number(s.light?.speed, t.light.speed, 0, 1) } },
    respectReducedMotion: typeof p.respectReducedMotion === 'boolean' ? p.respectReducedMotion : base.respectReducedMotion,
    motion: typeof p.motion === 'boolean' ? p.motion : base.motion,
    fps: number(p.fps, base.fps, 1, 60), maxDpr: number(p.maxDpr, base.maxDpr, 1, 2),
    renderer: ['auto', 'svg'].includes(p.renderer) ? p.renderer : base.renderer,
  };
}
const fract = x => x - Math.floor(x);
const hash = (x, y) => fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453123);
const mix = (a, b, t) => a + (b - a) * t;
function noise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * fx * (fx * (fx * 6 - 15) + 10), uy = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  return mix(mix(hash(ix, iy), hash(ix + 1, iy), ux), mix(hash(ix, iy + 1), hash(ix + 1, iy + 1), ux), uy);
}
function fbm(x, y, octaves) {
  let v = 0, a = 0.5, total = 0;
  for (let i = 0; i < octaves; i++) {
    v += a * noise(x, y); total += a;
    const nx = (x * 0.8 + y * 0.6) * 2.02 + 8.1;
    y = (-x * 0.6 + y * 0.8) * 2.02 + 3.7; x = nx; a *= 0.5;
  }
  return v / total;
}
let cachedPhoto = null, cachedPixels = null;
function photoPixels(photo) {
  if (!photo) return null;
  if (photo.data !== cachedPhoto) {
    try {
      const decoded = atob(photo.data);
      if (decoded.length !== photo.width * photo.height) return null;
      cachedPixels = Uint8Array.from(decoded, c => c.charCodeAt(0)); cachedPhoto = photo.data;
    } catch { return null; }
  }
  return cachedPixels;
}
function samplePhoto(x, y, photo) {
  const pixels = photoPixels(photo); if (!pixels) return 0.5;
  const px = Math.max(0, Math.min(photo.width - 1, x * (photo.width - 1))), py = Math.max(0, Math.min(photo.height - 1, y * (photo.height - 1)));
  const ix = Math.floor(px), iy = Math.floor(py), jx = Math.min(ix + 1, photo.width - 1), jy = Math.min(iy + 1, photo.height - 1);
  const tx = px - ix, ty = py - iy, a = pixels[iy * photo.width + ix], b = pixels[iy * photo.width + jx];
  const c = pixels[jy * photo.width + ix], d = pixels[jy * photo.width + jx];
  return mix(mix(a, b, tx), mix(c, d, tx), ty) / 255;
}
function sculpt(x, y, edits) {
  let value = 0;
  for (const [cx, cy, radius, strength] of edits) {
    const dx = (x - cx) / radius, dy = (y - cy) / radius;
    value += strength * Math.exp(-2.8 * (dx * dx + dy * dy));
  }
  return value;
}
/** CPU field for vector export and static fallback. */
export function sampleField(x, y, time = 0, options = DEFAULT_OPTIONS) {
  const f = options.field, t = time * f.speed;
  if (f.source === 'photo' && f.photo) {
    const raw = samplePhoto(x, y, f.photo), luminance = f.photoInvert ? 1 - raw : raw;
    return Math.max(0, Math.min(1, (luminance - 0.5) * f.photoContrast + 0.5 + sculpt(x, y, f.controls)));
  }
  const px = x * f.scale[0] + (f.seed % 997) * 0.013, py = y * f.scale[1] + Math.floor(f.seed / 997) * 0.017;
  const dx = Math.sin(t * 0.71) * 0.48, dy = Math.cos(t * 0.53) * 0.48;
  const qx = fbm(px + dx, py + dy, f.octaves) - 0.5, qy = fbm(px + 5.2 - dx * 0.73, py + 1.3 - dy * 0.73, f.octaves) - 0.5;
  const wx = px + f.warp * qx, wy = py + f.warp * qy;
  return fbm(wx, wy, f.octaves) * 0.78 + fbm(wx * 0.57 + 8.1, wy * 0.57 + 2.3, f.octaves) * 0.22 + sculpt(x, y, f.controls);
}
function contourPaths(o, width, height, time) {
  const nx = Math.max(24, Math.min(150, Math.round(width / 11))), ny = Math.max(24, Math.round(nx * height / width));
  const values = new Float64Array((nx + 1) * (ny + 1));
  let min = Infinity, max = -Infinity;
  for (let y = 0; y <= ny; y++) for (let x = 0; x <= nx; x++) {
    const v = sampleField(x / nx, y / ny, time, o) * o.field.bands;
    values[y * (nx + 1) + x] = v; min = Math.min(min, v); max = Math.max(max, v);
  }
  const paths = [], sx = width / nx, sy = height / ny, row = nx + 1;
  let level = 0, segments, links, edges;
  // Edge ids are integers: grid vertex index * 2, plus 1 for the vertical edge below that vertex.
  const add = (a, b) => {
    const i = segments.push([a, b]) - 1;
    for (const key of [a.key, b.key]) { const list = links.get(key); if (list) list.push(i); else links.set(key, [i]); }
  };
  const cross = (a, b, key, ax, ay, bx, by) => {
    if ((a >= level) === (b >= level)) return;
    const t = (level - a) / (b - a);
    edges.push({ key, x: (ax + (bx - ax) * t) * sx, y: (ay + (by - ay) * t) * sy });
  };
  for (level = Math.ceil(min); level <= Math.floor(max); level++) {
    segments = []; links = new Map();
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      const off = y * row + x, tl = values[off], tr = values[off + 1], bl = values[off + row], br = values[off + row + 1];
      if (level < Math.min(tl, tr, bl, br) || level > Math.max(tl, tr, bl, br)) continue;
      edges = [];
      cross(tl, tr, off * 2, x, y, x + 1, y);
      cross(tr, br, (off + 1) * 2 + 1, x + 1, y, x + 1, y + 1);
      cross(bl, br, (off + row) * 2, x, y + 1, x + 1, y + 1);
      cross(tl, bl, off * 2 + 1, x, y, x, y + 1);
      if (edges.length === 2) add(edges[0], edges[1]);
      if (edges.length === 4) {
        const connected = (tl >= level) === ((tl + tr + bl + br) / 4 >= level);
        if (connected) { add(edges[0], edges[1]); add(edges[2], edges[3]); }
        else { add(edges[0], edges[3]); add(edges[1], edges[2]); }
      }
    }
    const used = new Uint8Array(segments.length);
    const trace = (segmentIndex, endpoint) => {
      const points = [endpoint]; let current = endpoint, index = segmentIndex;
      while (index !== undefined && !used[index]) {
        used[index] = 1;
        const s = segments[index], next = s[0].key === current.key ? s[1] : s[0];
        points.push(next); current = next; index = links.get(next.key).find(i => !used[i]);
      }
      if (points.length < 3) return;
      const closed = points[0].key === points[points.length - 1].key;
      const d = points.map((p, i) => (i ? 'L' : 'M') + p.x.toFixed(2) + ' ' + p.y.toFixed(2)).join('') + (closed ? 'Z' : '');
      paths.push({ level, d });
    };
    for (const [key, indices] of links) if (indices.length === 1 && !used[indices[0]]) {
      const s = segments[indices[0]]; trace(indices[0], s[0].key === key ? s[0] : s[1]);
    }
    for (let i = 0; i < segments.length; i++) if (!used[i]) trace(i, segments[i][0]);
  }
  return paths;
}
export function buildContourSVG(settings = {}, { width = 1536, height = 2048, time = 0, transparent = false } = {}) {
  const o = normalizeOptions(settings), s = o.style;
  width = Math.round(number(width, 1536, 16, 8192)); height = Math.round(number(height, 2048, 16, 8192)); time = number(time, 0, 0, 1000000);
  const edge = Math.max(0.1, s.edgeFade * 100);
  const paths = contourPaths(o, width, height, time).map(({ level, d }) => {
    const major = level % 5 === 0, dash = s.dashed && level % 5 === 2 ? ' stroke-dasharray="5 5"' : '';
    return '<path d="' + d + '" stroke-width="' + (s.lineWidth * (major ? 1.65 : 1)).toFixed(3) +
      '" stroke-opacity="' + (s.alpha * (major ? 1 : 0.68)).toFixed(3) + '"' + dash + '/>';
  }).join('');
  const light = s.light;
  const angle = light.angle * Math.PI / 180, dx = Math.cos(angle) * 50, dy = Math.sin(angle) * 50;
  const phase = ((time * light.speed + 0.5) % 1 + 1) % 1;
  const beam = light.enabled ? '<linearGradient id="beam" x1="' + (50-dx).toFixed(2) + '%" y1="' + (50-dy).toFixed(2) + '%" x2="' + (50+dx).toFixed(2) + '%" y2="' + (50+dy).toFixed(2) + '%">' +
    '<stop offset="' + Math.max(0,phase-light.width).toFixed(3) + '" stop-color="black"/><stop offset="' + phase.toFixed(3) + '" stop-color="white"/><stop offset="' + Math.min(1,phase+light.width).toFixed(3) + '" stop-color="black"/></linearGradient>' +
    '<mask id="lightBeam"><rect width="100%" height="100%" fill="url(#beam)"/></mask><filter id="halo" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="' + Math.max(1,s.lineWidth*3).toFixed(2) + '"/></filter>' : '';
  const glowSVG = light.enabled ? '<g fill="none" stroke="' + light.color + '">' +
    '<g filter="url(#halo)" opacity="' + Math.min(.4,light.intensity*.19).toFixed(3) + '"><use href="#contours"/></g>' +
    '<g mask="url(#lightBeam)" filter="url(#halo)" opacity="' + Math.min(.8,light.intensity*.52).toFixed(3) + '"><use href="#contours"/></g>' +
    '<g mask="url(#lightBeam)" opacity="' + Math.min(.95,light.intensity*.62).toFixed(3) + '"><use href="#contours"/></g></g>' : '';
  const stops = '<stop offset="0" stop-color="black"/><stop offset="' + edge + '%" stop-color="white"/>' +
    '<stop offset="' + (100 - edge) + '%" stop-color="white"/><stop offset="100%" stop-color="black"/>';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '">' +
    '<defs><linearGradient id="cx">' + stops + '</linearGradient><linearGradient id="cy" x1="0" y1="0" x2="0" y2="1">' + stops +
    '</linearGradient><mask id="mx"><rect width="100%" height="100%" fill="url(#cx)"/></mask>' +
    '<mask id="my"><rect width="100%" height="100%" fill="url(#cy)"/></mask>' + beam +
    '<g id="contours" fill="none" stroke-linecap="round" stroke-linejoin="round">' + paths + '</g></defs>' +
    (transparent ? '' : '<rect width="100%" height="100%" fill="' + s.background + '"/>') +
    '<g mask="url(#mx)"><g mask="url(#my)">' + glowSVG + '<use href="#contours" stroke="' + s.color + '"/></g></g></svg>';
}

const VERTEX = 'attribute vec2 a_position;void main(){gl_Position=vec4(a_position,0.,1.);}';
const FRAGMENT = [
  '#extension GL_OES_standard_derivatives : enable',
  '#ifdef GL_FRAGMENT_PRECISION_HIGH',
  'precision highp float;',
  '#else',
  'precision mediump float;',
  '#endif',
  'uniform vec2 u_res; uniform float u_dpr,u_time; uniform vec2 u_scale;',
  'uniform float u_octaves,u_bands,u_warp,u_speed,u_seed,u_source,u_photoContrast,u_photoInvert,u_controlCount;',
  'uniform vec4 u_controls[12]; uniform sampler2D u_photo;',
  'uniform vec3 u_color,u_background,u_lightColor;',
  'uniform float u_alpha,u_lineWidth,u_softness,u_edgeFade,u_dashed,u_transparent; uniform vec2 u_fade;',
  'uniform float u_lightEnabled,u_lightIntensity,u_lightWidth,u_lightSpeed,u_lightAngle;',
  'float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}',
  'float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*f*(f*(f*6.-15.)+10.);',
  'return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);}',
  'float fbm(vec2 p){float v=0.,a=.5,total=0.;for(int i=0;i<6;i++){if(float(i)>=u_octaves)break;',
  'v+=a*noise(p);total+=a;p=mat2(.8,-.6,.6,.8)*p*2.02+vec2(8.1,3.7);a*=.5;}return v/total;}',
  'float sculpture(vec2 uv){float v=0.;for(int i=0;i<12;i++){if(float(i)>=u_controlCount)break;',
  'vec4 c=u_controls[i];vec2 d=(uv-c.xy)/c.z;v+=c.w*exp(-2.8*dot(d,d));}return v;}',
  'float lightBand(vec2 uv){vec2 axis=vec2(cos(radians(u_lightAngle)),sin(radians(u_lightAngle)));',
  'float center=(fract(u_time*u_lightSpeed+.5)-.5)*1.4;float d=(dot(uv-.5,axis)-center)/max(.01,u_lightWidth);return exp(-d*d);}',
  'void main(){vec2 uv=vec2(gl_FragCoord.x/u_res.x,1.-gl_FragCoord.y/u_res.y);',
  'vec2 p=uv*u_scale+vec2(mod(u_seed,997.)*.013,floor(u_seed/997.)*.017);float t=u_time*u_speed;',
  'vec2 drift=vec2(sin(t*.71),cos(t*.53))*.48;vec2 q=vec2(fbm(p+drift),fbm(p+vec2(5.2,1.3)-drift*.73))-.5;',
  'vec2 w=p+u_warp*q;float procedural=fbm(w)*.78+fbm(w*.57+vec2(8.1,2.3))*.22;',
  'float photo=texture2D(u_photo,vec2(uv.x,1.-uv.y)).r;photo=mix(photo,1.-photo,u_photoInvert);',
  'float f=mix(procedural,clamp((photo-.5)*u_photoContrast+.5,0.,1.),u_source)+sculpture(uv);',
  'float level=f*u_bands,idx=floor(level+.5),dist=abs(level-idx);',
  'float grad=max(length(vec2(dFdx(level),dFdy(level))),.00001);',
  'float major=1.-step(.5,mod(idx,5.));float halfWidth=u_lineWidth*u_dpr*mix(1.,1.65,major)*.5;float soft=u_softness*u_dpr*.5;',
  'float pixels=dist/grad;float line=1.-smoothstep(max(0.,halfWidth-soft),halfWidth+soft,pixels);',
  'float dashLine=u_dashed*(1.-step(.5,abs(mod(idx,5.)-2.)));float dashPhase=(p.x+p.y*.8)*72.;',
  'float wrapped=mod(dashPhase,6.2831853);float gap=wrapped<3.14159265?0.:min(wrapped-3.14159265,6.2831853-wrapped);',
  'float phaseRate=max(length(vec2(dFdx(dashPhase),dFdy(dashPhase))),.00001);float endPixels=gap/phaseRate;',
  'float dashDistance=length(vec2(pixels,endPixels));float dashCore=1.-smoothstep(max(0.,halfWidth-soft),halfWidth+soft,dashDistance);',
  'line=mix(line,dashCore,dashLine);float edge=min(min(uv.x,1.-uv.x),min(uv.y,1.-uv.y));',
  'float fade=smoothstep(.012,max(.013,u_edgeFade),edge);',
  'fade*=1.-smoothstep(u_fade.x,u_fade.y,length((uv-.5)*vec2(1.1,1.)));',
  'float alpha=line*fade*u_alpha*mix(.68,1.,major);',
  'float spread=max(1.,u_lineWidth*u_dpr*3.5);float haloDistance=mix(pixels,dashDistance,dashLine);',
  'float halo=exp(-pow(haloDistance/spread,2.));',
  'float beam=lightBand(uv);float glowStrength=mix(.10+.68*beam,.34+.44*beam,dashLine);',
  'float glow=clamp(u_lightEnabled*u_lightIntensity*glowStrength*halo*fade,0.,.82);float combined=alpha+glow*(1.-alpha);',
  'vec3 color=(u_color*alpha*(1.-glow)+u_lightColor*glow)/max(combined,.00001);',
  'if(u_transparent>.5)gl_FragColor=vec4(color,combined);else gl_FragColor=vec4(mix(u_background,color,combined),1.);}',
].join('\n');
const rgb = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
function makeGL(canvas, initial) {
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: true, depth: false, stencil: false });
  if (!gl || !gl.getExtension('OES_standard_derivatives')) throw new Error('WebGL derivatives unavailable');
  const limit = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
  if (canvas.width > limit || canvas.height > limit) throw new Error('当前设备的 WebGL 导出上限为 ' + limit + ' 像素');
  const shaders = []; let program, buffer, texture;
  const dispose = () => { if (texture) gl.deleteTexture(texture); if (buffer) gl.deleteBuffer(buffer); if (program) gl.deleteProgram(program); for (const shader of shaders) gl.deleteShader(shader); };
  try {
    const compile = (type, source) => { const s = gl.createShader(type); shaders.push(s); gl.shaderSource(s, source); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    program = gl.createProgram(); gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX)); gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program); if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.useProgram(program); gl.disable(gl.DITHER); gl.disable(gl.BLEND);
    buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(program, 'a_position'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    const uniforms = {};
    for (let i = 0; i < gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS); i++) { const name = gl.getActiveUniform(program, i).name; uniforms[name] = gl.getUniformLocation(program, name); }
    texture = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    let options, color, background, lightColor, photoData = null;
    const controlBuffer = new Float32Array(48);
    const update = next => {
      options = next; color = rgb(next.style.color); background = rgb(next.style.background); lightColor = rgb(next.style.light.color);
      controlBuffer.fill(0); next.field.controls.forEach((c, i) => controlBuffer.set(c, i * 4));
      if (next.field.photo?.data !== photoData) {
        const photo = next.field.photo, values = photoPixels(photo), data = values ? new Uint8Array(values.length * 4) : new Uint8Array([128, 128, 128, 255]);
        if (values) for (let i = 0; i < values.length; i++) { data[i*4] = data[i*4+1] = data[i*4+2] = values[i]; data[i*4+3] = 255; }
        gl.bindTexture(gl.TEXTURE_2D, texture); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, photo?.width || 1, photo?.height || 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
        photoData = photo?.data ?? null;
      }
    };
    update(initial);
    const draw = (time, width, height, dpr = 1, transparent = false) => {
      const f = options.field, s = options.style, u = uniforms;
      gl.useProgram(program); gl.viewport(0, 0, width, height);
      gl.uniform2f(u.u_res, width, height); gl.uniform1f(u.u_time, time); gl.uniform1f(u.u_dpr, dpr);
      gl.uniform2f(u.u_scale, f.scale[0], f.scale[1]); gl.uniform1f(u.u_octaves, f.octaves); gl.uniform1f(u.u_bands, f.bands);
      gl.uniform1f(u.u_warp, f.warp); gl.uniform1f(u.u_speed, f.speed); gl.uniform1f(u.u_seed, f.seed);
      gl.uniform1f(u.u_source, f.source === 'photo' && f.photo ? 1 : 0); gl.uniform1f(u.u_photoContrast, f.photoContrast);
      gl.uniform1f(u.u_photoInvert, f.photoInvert ? 1 : 0); gl.uniform1f(u.u_controlCount, f.controls.length);
      gl.uniform4fv(u['u_controls[0]'], controlBuffer); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture); gl.uniform1i(u.u_photo, 0);
      gl.uniform3f(u.u_color, color[0], color[1], color[2]); gl.uniform3f(u.u_background, background[0], background[1], background[2]);
      gl.uniform3f(u.u_lightColor, lightColor[0], lightColor[1], lightColor[2]);
      const light = s.light; gl.uniform1f(u.u_lightEnabled, light.enabled ? 1 : 0);
      gl.uniform1f(u.u_lightIntensity, light.intensity); gl.uniform1f(u.u_lightWidth, light.width); gl.uniform1f(u.u_lightSpeed, light.speed);
      gl.uniform1f(u.u_lightAngle, light.angle);
      gl.uniform1f(u.u_alpha, s.alpha); gl.uniform1f(u.u_lineWidth, s.lineWidth); gl.uniform1f(u.u_softness, s.softness);
      gl.uniform2f(u.u_fade, s.fade[0], s.fade[1]); gl.uniform1f(u.u_edgeFade, s.edgeFade);
      gl.uniform1f(u.u_dashed, s.dashed ? 1 : 0); gl.uniform1f(u.u_transparent, transparent ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    return { draw, update, destroy: dispose, release: () => gl.getExtension('WEBGL_lose_context')?.loseContext() };
  } catch (error) { dispose(); throw error; }
}
const clone = v => JSON.parse(JSON.stringify(v));
const canvasBlob = c => new Promise((resolve, reject) => c.toBlob(b => b ? resolve(b) : reject(new Error('PNG export failed')), 'image/png'));
async function svgToPNG(svg, width, height) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const image = new Image(), canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  try {
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('SVG rasterization failed')); image.src = url; });
    canvas.getContext('2d').drawImage(image, 0, 0, width, height); return await canvasBlob(canvas);
  } finally { URL.revokeObjectURL(url); }
}
export function createContourField({ canvas, onStateChange, ...settings } = {}) {
  if (!canvas || typeof canvas.getContext !== 'function') throw new TypeError('A canvas is required');
  const doc = canvas.ownerDocument, win = doc.defaultView;
  let options = normalizeOptions(settings), gpu = null, backend = 'svg', error = '';
  let destroyed = false, requested = options.motion, raf = 0, frames = 0, time = 0, lastStamp = null, lastDraw = -Infinity;
  let width = 1, height = 1, dpr = 1, fallback = null, fallbackTimer = 0;
  const originalVisibility = canvas.style.visibility, parent = canvas.parentElement, originalPosition = parent?.style.position;
  const media = win.matchMedia('(prefers-reduced-motion: reduce)');
  const notify = () => { if (onStateChange) onStateChange(api.getState()); };
  const allowed = () => requested && options.motion && ((options.field.source === 'procedural' && options.field.speed > 0) || (options.style.light.enabled && options.style.light.intensity > 0 && options.style.light.speed > 0)) && !doc.hidden && !(options.respectReducedMotion && media.matches) &&
    canvas.closest('[data-motion]')?.getAttribute('data-motion') !== 'off';
  function clearFallback() {
    if (fallbackTimer) win.clearTimeout(fallbackTimer); fallbackTimer = 0;
    fallback?.remove(); fallback = null; canvas.style.visibility = originalVisibility;
  }
  function refreshFallback() {
    if (destroyed || backend !== 'svg' || !parent) return;
    if (!fallback) {
      if (win.getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
      fallback = doc.createElement('div'); fallback.setAttribute('aria-hidden', 'true'); fallback.dataset.contourFallback = '';
      Object.assign(fallback.style, { position: 'absolute', overflow: 'hidden', pointerEvents: 'none' }); parent.append(fallback);
    }
    const cw = canvas.clientWidth || 480, ch = canvas.clientHeight || 640;
    Object.assign(fallback.style, { left: canvas.offsetLeft + 'px', top: canvas.offsetTop + 'px', width: cw + 'px', height: ch + 'px', backgroundColor: options.style.background });
    canvas.style.visibility = 'hidden';
    const svg = buildContourSVG(options, { width: Math.round(cw), height: Math.round(ch), time, transparent: true });
    fallback.style.backgroundImage = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")'; fallback.style.backgroundSize = '100% 100%';
  }
  function draw() { if (destroyed) return; if (gpu) gpu.draw(time, width, height, dpr); frames++; }
  function tick(stamp) {
    raf = 0; if (destroyed || !allowed() || backend !== 'webgl') return;
    if (lastStamp !== null) time += Math.min(0.15, Math.max(0, (stamp - lastStamp) / 1000)); lastStamp = stamp;
    if (stamp - lastDraw >= 1000 / options.fps - 0.5) { draw(); lastDraw = stamp; }
    raf = win.requestAnimationFrame(tick);
  }
  function syncMotion() {
    if (raf) win.cancelAnimationFrame(raf); raf = 0; lastStamp = null; lastDraw = -Infinity;
    if (!destroyed && backend === 'webgl' && allowed()) raf = win.requestAnimationFrame(tick);
    notify();
  }
  function resize() {
    if (destroyed) return;
    const rect = canvas.getBoundingClientRect(); dpr = Math.min(win.devicePixelRatio || 1, options.maxDpr, 2);
    width = Math.max(1, Math.round((rect.width || 480) * dpr)); height = Math.max(1, Math.round((rect.height || 640) * dpr));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    if (backend === 'svg') refreshFallback(); else draw();
  }
  function selectBackend() {
    gpu?.destroy(); gpu = null; clearFallback();
    if (options.renderer === 'auto') {
      try { gpu = makeGL(canvas, options); backend = 'webgl'; error = ''; } catch (reason) { backend = 'svg'; error = String(reason.message || reason); }
    } else { backend = 'svg'; error = ''; }
  }
  const contextLost = event => { event.preventDefault(); gpu = null; backend = 'svg'; error = 'WebGL context lost'; refreshFallback(); syncMotion(); };
  const contextRestored = () => { if (!destroyed) { selectBackend(); resize(); syncMotion(); } };
  const api = {
    setOptions(patch) {
      if (destroyed) return;
      const previous = options; options = normalizeOptions(patch, options);
      if (options.renderer !== previous.renderer) selectBackend(); else gpu?.update(options);
      if (backend === 'svg') {
        if (fallbackTimer) win.clearTimeout(fallbackTimer);
        fallbackTimer = win.setTimeout(() => { fallbackTimer = 0; refreshFallback(); syncMotion(); }, 60);
      } else if (options.maxDpr !== previous.maxDpr) resize(); else draw();
      syncMotion();
    },
    getOptions: () => clone(options),
    // The SVG fallback is a static frame, so only the WebGL backend can be running.
    getState: () => ({ backend, running: !destroyed && backend === 'webgl' && raf !== 0 && allowed(),
      requestedRunning: requested, time, frames, width, height, dpr, destroyed, reducedMotion: media.matches, error }),
    start() { if (!destroyed) { requested = true; syncMotion(); } },
    stop() { requested = false; syncMotion(); },
    renderAt(seconds = 0) {
      if (destroyed) throw new Error('Contour field has been destroyed');
      requested = false; time = number(seconds, 0, 0, 1000000); syncMotion(); if (backend === 'svg') refreshFallback(); else draw();
    },
    exportSVG({ width = 3072, height = 4096, time: at = time, transparent = false, ...patch } = {}) {
      return buildContourSVG(normalizeOptions(patch, options), { width, height, time: at, transparent });
    },
    async exportPNG({ width: w = 3072, height: h = 4096, time: at = time, transparent = false, ...patch } = {}) {
      if (destroyed) throw new Error('Contour field has been destroyed');
      w = Math.round(number(w, 3072, 16, 8192)); h = Math.round(number(h, 4096, 16, 8192));
      at = number(at, time, 0, 1000000);
      const snapshot = normalizeOptions(patch, options), target = doc.createElement('canvas'); target.width = w; target.height = h;
      if (backend === 'svg') return svgToPNG(buildContourSVG(snapshot, { width: w, height: h, time: at, transparent }), w, h);
      let exporter;
      try { exporter = makeGL(target, snapshot); exporter.draw(at, w, h, Math.min(w / 1536, h / 2048), transparent); return await canvasBlob(target); }
      finally { exporter?.destroy(); exporter?.release(); }
    },
    destroy() {
      if (destroyed) return; requested = false; if (raf) win.cancelAnimationFrame(raf); raf = 0; destroyed = true;
      observer.disconnect(); motionObserver.disconnect(); media.removeEventListener('change', syncMotion);
      doc.removeEventListener('visibilitychange', syncMotion); win.removeEventListener('resize', resize);
      canvas.removeEventListener('webglcontextlost', contextLost); canvas.removeEventListener('webglcontextrestored', contextRestored);
      gpu?.destroy(); gpu = null; clearFallback(); if (parent) parent.style.position = originalPosition;
    },
  };
  const observer = new win.ResizeObserver(resize), motionObserver = new win.MutationObserver(syncMotion);
  for (let node = canvas; node; node = node.parentElement) motionObserver.observe(node, { attributes: true, attributeFilter: ['data-motion'] });
  selectBackend(); resize(); observer.observe(canvas); media.addEventListener('change', syncMotion); doc.addEventListener('visibilitychange', syncMotion);
  win.addEventListener('resize', resize); canvas.addEventListener('webglcontextlost', contextLost); canvas.addEventListener('webglcontextrestored', contextRestored);
  syncMotion(); return api;
}
