import type { Params } from './types';
import { cubeLayout, MAX_PANEL_CELLS, PEG_HOLE_EXTRA } from './layout';

/** Thinnest wall we accept anywhere in a printed part (≈ 3 perimeters at 0.4 mm). */
export const MIN_WALL = 1.2;

/**
 * Rough size of one exported panel's binary STL: a front and a back grid of
 * n × n samples, two triangles per cell each, 50 bytes per triangle.
 */
export function estimatePanelMB(samplesPerSide: number): number {
  return (4 * samplesPerSide * samplesPerSide * 50) / 1e6;
}

export interface ParamIssue {
  /** `error`: the parts will not print or assemble. `warning`: they will, but with a compromise. */
  severity: 'error' | 'warning';
  message: string;
}

/** Below this, the picture looks pixelated (pixels per mm). */
export const COARSE_PX_PER_MM = 2.5;
/** Above this, detail is finer than a 0.4 mm nozzle can lay down (pixels per mm). */
export const FINE_PX_PER_MM = 7;
/** Warn when one panel's STL would be bigger than this (MB). */
export const LARGE_PANEL_MB = 60;

/**
 * Check a parameter set for combinations that produce unprintable or
 * non-assembling parts. The geometry sweep in validate.test.ts verifies that
 * every combination passing without errors builds clean, non-overlapping parts.
 */
export function validateParams(params: Params): ParamIssue[] {
  const L = cubeLayout(params);
  const issues: ParamIssue[] = [];
  const error = (message: string) => issues.push({ severity: 'error', message });
  const warn = (message: string) => issues.push({ severity: 'warning', message });

  // The frame is sized to fit the grooves, panels and pegs or magnets (see
  // frameWidth in layout.ts), so what can still go wrong is a cube too small
  // to leave a picture inside that frame.
  if (L.windowHalf <= 0) {
    error(`A ${params.cubeSize} mm cube leaves no room for a picture inside its ${L.cornerReach.toFixed(1)} mm frame. Increase cube size.`);
  }

  if (params.lidAttach === 'pressfit') {
    const postH = L.postTop - (-L.half + L.bottomThickness);
    if (L.postHoleDepth > postH / 2) {
      error(`Peg depth is more than half the post height. Reduce it to ${Math.floor(postH / 2 - PEG_HOLE_EXTRA)} mm or less.`);
    }
  }

  // Holes must stay inside the bottom rails so they don't cut away the floor under them.
  const holeLimit = L.railInner - MIN_WALL;
  for (const hole of params.cableHoles) {
    const reach = hole.diameter / 2 + Math.max(Math.abs(hole.x), Math.abs(hole.y));
    if (reach > holeLimit) {
      error(`The ${hole.diameter} mm cable hole is too large for this cube. The maximum is ${Math.floor(2 * holeLimit)} mm.`);
    }
  }

  if (params.lithoMin >= params.lithoMax) {
    warn('Min and max lithophane thickness are equal, so the image will be flat.');
  }

  // Export detail. The cap keeps a panel's mesh small enough to build and
  // download in a browser; say so rather than quietly ignoring the setting.
  const ppm = params.pixelsPerMm;
  const requested = Math.round(L.sidePanelW * ppm);
  const samples = Math.min(requested, MAX_PANEL_CELLS);
  if (requested > MAX_PANEL_CELLS) {
    warn(
      `At this cube size, exports are limited to ${(MAX_PANEL_CELLS / L.sidePanelW).toFixed(1)} px/mm ` +
      `(${MAX_PANEL_CELLS} pixels across a panel), lower than the ${ppm} px/mm you set.`,
    );
  }
  if (ppm < COARSE_PX_PER_MM) {
    const across = Math.round(2 * L.windowHalf * ppm);
    warn(
      `At ${ppm} px/mm the picture will look pixelated: only about ${across} pixels across the window. ` +
      '5 px/mm suits a standard 0.4 mm nozzle.',
    );
  } else if (ppm > FINE_PX_PER_MM) {
    warn(`${ppm} px/mm is more detail than a 0.4 mm nozzle can print (about 5 px/mm). It only helps with a finer nozzle, and makes bigger files.`);
  }
  const panelMB = estimatePanelMB(samples);
  if (panelMB > LARGE_PANEL_MB) {
    warn(
      `Each panel's STL will be about ${Math.round(panelMB)} MB, so the download may be slow or fail on a phone. ` +
      'A lower px/mm value makes smaller files.',
    );
  }

  return issues;
}
