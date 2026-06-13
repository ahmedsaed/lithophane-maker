import type { Params } from './types';

/** Sensible defaults for a 100 mm desktop lithophane cube (all mm). */
export const DEFAULT_PARAMS: Params = {
  cubeSize: 100,
  postSize: 8,
  panelThickness: 3,
  lithoMin: 0.8,
  lithoMax: 3.0,
  grooveClearance: 0.3,
  tongueWidth: 5,
  invert: false,
  relief: 'inward',
  previewResolution: 180,
  exportResolution: 380,
  bottomThickness: 3,
  lidThickness: 3,
  cableHoles: [{ diameter: 8, x: 0, y: 0 }],
};

/** Per-part preview colours. */
export const PART_COLORS: Record<string, string> = {
  front: '#e7c6a5',
  back: '#e7c6a5',
  left: '#e7c6a5',
  right: '#e7c6a5',
  top: '#d9b48f',
  frame: '#6b7280',
};
