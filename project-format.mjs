/** Portable project state stored as PNG iTXt or SVG metadata. No external libraries. */
const keyword = 'Contour-Workshop-Project';
// Files exported before the rename still use the legacy names; keep reading them.
const readableKeywords = [keyword, 'PULSE-Contour-Project'];
const metadataId = 'contour-workshop-project';
const MAX_PAYLOAD = 180000;
const encoder = new TextEncoder(), decoder = new TextDecoder('utf-8', { fatal: true });
const signature = [137, 80, 78, 71, 13, 10, 26, 10];
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const b of bytes) { crc ^= b; for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, body) {
  const data = new Uint8Array(12 + body.length), view = new DataView(data.buffer);
  view.setUint32(0, body.length); data.set(encoder.encode(type), 4); data.set(body, 8); view.setUint32(data.length - 4, crc32(data.subarray(4, data.length - 4)));
  return data;
}
const isPNG = data => signature.every((v, i) => data[i] === v);
export async function addPNGProject(blob, project) {
  const source = new Uint8Array(await blob.arrayBuffer()); if (!isPNG(source)) throw new Error('PNG 数据无效');
  const payload = encoder.encode(JSON.stringify(project)); if (payload.length > MAX_PAYLOAD) throw new Error('工程参数过大');
  const prefix = encoder.encode(keyword), body = new Uint8Array(prefix.length + 5 + payload.length);
  body.set(prefix); body.set(payload, prefix.length + 5);
  const metadata = chunk('iTXt', body), offset = 8 + 12 + new DataView(source.buffer).getUint32(8);
  const result = new Uint8Array(source.length + metadata.length);
  result.set(source.subarray(0, offset)); result.set(metadata, offset); result.set(source.subarray(offset), offset + metadata.length);
  return new Blob([result], { type: 'image/png' });
}
export async function readPNGProject(blob) {
  const data = new Uint8Array(await blob.arrayBuffer()); if (!isPNG(data)) throw new Error('不是 PNG 图片');
  const view = new DataView(data.buffer), prefixes = readableKeywords.map(k => encoder.encode(k));
  for (let offset = 8; offset + 12 <= data.length;) {
    const length = view.getUint32(offset), end = offset + 12 + length;
    if (end > data.length) throw new Error('PNG 数据不完整');
    const type = decoder.decode(data.subarray(offset + 4, offset + 8));
    // iTXt body: keyword + NUL, then this tool always writes four more zero bytes (no compression, empty tags).
    const prefix = type === 'iTXt' && length <= MAX_PAYLOAD &&
      prefixes.find(k => k.length < length && data[offset + 8 + k.length] === 0 && k.every((v, i) => data[offset + 8 + i] === v));
    if (prefix) {
      const start = offset + 8 + prefix.length;
      if (data[start + 1] !== 0 || data[start + 2] !== 0 || data[start + 3] !== 0 || data[start + 4] !== 0) throw new Error('工程元数据编码不支持');
      if (crc32(data.subarray(offset + 4, end - 4)) !== view.getUint32(end - 4)) throw new Error('PNG 工程元数据校验失败');
      return JSON.parse(decoder.decode(data.subarray(start + 5, end - 4)));
    }
    if (type === 'IEND') break; offset = end;
  }
  throw new Error('这张 PNG 没有工坊参数');
}
const escapeXML = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const xmlEntities = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'" };
// Editors that re-save the SVG may switch to other entities, so decode the named and numeric forms.
const unescapeXML = text => text.replace(/&(?:#x([0-9a-f]+)|#(\d+)|(lt|gt|amp|quot|apos));/gi, (match, hexCode, decimal, name) =>
  hexCode ? String.fromCodePoint(parseInt(hexCode, 16)) : decimal ? String.fromCodePoint(Number(decimal)) : xmlEntities[name.toLowerCase()]);
export function addSVGProject(svg, project) {
  const payload = JSON.stringify(project); if (payload.length > MAX_PAYLOAD) throw new Error('工程参数过大');
  return svg.replace(/(<svg\b[^>]*>)/, '$1<metadata id="' + metadataId + '">' + escapeXML(payload) + '</metadata>');
}
export function readSVGProject(svg) {
  const match = svg.match(/<metadata id="(?:contour-workshop-project|pulse-contour-project)">([\s\S]*?)<\/metadata>/);
  if (!match || match[1].length > 900000) throw new Error('这张 SVG 没有工坊参数');
  return JSON.parse(unescapeXML(match[1]));
}
