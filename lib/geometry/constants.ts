import type { Params } from './types';

/** Sensible defaults for a 100 mm desktop lithophane cube (all mm). */
export const DEFAULT_PARAMS: Params = {
  cubeSize: 100,
  postSize: 8,
  panelThickness: 3,
  lithoMin: 0.7,
  lithoMax: 2.8,
  grooveClearance: 0.3,
  tongueWidth: 5,
  invert: false,
  relief: 'outward',
  previewResolution: 180,
  exportResolution: 380,
  mmPerPixel: 0.2,
  bottomThickness: 3,
  chamfer: true,
  cableHoles: [{ diameter: 8, x: 0, y: 0 }],
  grayscaleMode: 'rec601',
  lithoBrightness: 0,
  lithoContrast: 1,
  lithoAutoContrast: false,
  lithoGamma: 0.45,
  lithoSharpen: 0,
};

/** Per-part preview colours. */
export const PART_COLORS: Record<string, string> = {
  front: '#e7c6a5',
  back: '#e7c6a5',
  left: '#e7c6a5',
  right: '#e7c6a5',
  frame: '#6b7280',
};
