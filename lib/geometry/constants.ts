import type { Params } from './types';

/** Sensible defaults for a 100 mm desktop lithophane cube (all mm). */
export const DEFAULT_PARAMS: Params = {
  cubeSize: 100,
  postSize: 6,
  panelThickness: 3,
  lithoMin: 0.8,
  lithoMax: 3.0,
  grooveClearance: 0.3,
  tongueWidth: 5,
  invert: false,
  relief: 'inward',
  previewResolution: 200,
  exportResolution: 400,
  cableHoles: [{ diameter: 8, x: 0, y: 0 }],
};

/** Parametric cantilever snap-hook geometry for the base plate. */
export const HOOK = {
  /** Length of the flexing arm (mm). */
  armLength: 8,
  /** Thickness of the arm (mm). */
  armThickness: 1.6,
  /** Width of the arm (mm). */
  armWidth: 8,
  /** How far the retaining lip protrudes (mm). */
  lipDepth: 1.2,
  /** Height of the retaining lip (mm). */
  lipHeight: 2,
} as const;

/** Per-part preview colours. */
export const PART_COLORS: Record<string, string> = {
  front: '#e7c6a5',
  back: '#e7c6a5',
  left: '#e7c6a5',
  right: '#e7c6a5',
  top: '#d9b48f',
  frame: '#6b7280',
  base: '#4b5563',
};
