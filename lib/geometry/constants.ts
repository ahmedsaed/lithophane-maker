import type { ImageAdjust, Params } from './types';

/** Sensible defaults for a 100 mm desktop lithophane cube (all mm). */
export const DEFAULT_PARAMS: Params = {
  cubeSize: 100,
  lithoMin: 0.7,
  lithoMax: 2.8,
  grooveClearance: 0.2,
  tongueWidth: 5,
  relief: 'outward',
  previewResolution: 180,
  pixelsPerMm: 5,
  lidAttach: 'pressfit',
  pegDepth: 8,
  pegClearance: 0.1,
  magnetDiameter: 6,
  magnetHeight: 3,
  cableHoles: [{ diameter: 8, x: 0, y: 0 }],
  lithoGamma: 0.45,
};

/** A new photo's adjustments: none. */
export const NEUTRAL_ADJUST: ImageAdjust = {
  brightness: 0,
  contrast: 1,
  autoContrast: false,
  sharpen: 0,
  invert: false,
};

/** Per-part preview colours. */
export const PART_COLORS: Record<string, string> = {
  front: '#e7c6a5',
  back: '#e7c6a5',
  left: '#e7c6a5',
  right: '#e7c6a5',
  frame: '#6b7280',
  lid: '#6b7280',
  top: '#e7c6a5',
};
