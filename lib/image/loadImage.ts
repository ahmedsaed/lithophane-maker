/**
 * Decode a user-selected File into an ImageBitmap, then rasterise it to
 * ImageData at a target longest-side resolution via an offscreen canvas.
 */
export async function fileToImageData(
  file: File,
  longestSide: number,
): Promise<ImageData> {
  const bitmap = await createImageBitmap(file);
  try {
    return bitmapToImageData(bitmap, longestSide);
  } finally {
    bitmap.close();
  }
}

/** Resample an ImageBitmap to ImageData, capping the longest side. */
export function bitmapToImageData(
  bitmap: ImageBitmap,
  longestSide: number,
): ImageData {
  const scale = Math.min(1, longestSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D canvas context unavailable');
  ctx.drawImage(bitmap, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

/** Build a data URL thumbnail for UI previews. */
export async function fileToThumbnailUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
