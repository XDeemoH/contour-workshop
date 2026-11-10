/** Convert a user-selected image to a compact, portable luminance height field. */
export async function photoFromFile(file) {
  if (!file || !/^image\/(png|jpeg|webp)$/i.test(file.type)) throw new Error('请选择 PNG、JPEG 或 WebP 照片');
  if (file.size > 20 * 1024 * 1024) throw new Error('照片需小于 20 MB');
  const bitmap = await createImageBitmap(file), width = 160, height = 213;
  try {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const aspect = width / height, sourceAspect = bitmap.width / bitmap.height;
    const cropW = sourceAspect > aspect ? bitmap.height * aspect : bitmap.width;
    const cropH = sourceAspect > aspect ? bitmap.height : bitmap.width / aspect;
    ctx.drawImage(bitmap, (bitmap.width - cropW) / 2, (bitmap.height - cropH) / 2, cropW, cropH, 0, 0, width, height);
    const rgba = ctx.getImageData(0, 0, width, height).data, gray = new Uint8Array(width * height);
    for (let i = 0; i < gray.length; i++) {
      const a = rgba[i*4+3] / 255;
      gray[i] = Math.round((rgba[i*4] * 0.2126 + rgba[i*4+1] * 0.7152 + rgba[i*4+2] * 0.0722) * a + 255 * (1-a));
    }
    let binary = ''; for (let i = 0; i < gray.length; i += 8192) binary += String.fromCharCode(...gray.subarray(i, i + 8192));
    return { width, height, data: btoa(binary) };
  } finally { bitmap.close(); }
}
