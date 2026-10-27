import type { Params } from './types';
import { cubeLayout, MAGNET_FIT, MAX_PANEL_CELLS, MIN_ATTACH_WALL, OUTER_WALL, PEG_HOLE_EXTRA } from './layout';

/** Thinnest wall we accept anywhere in a printed part (≈ 3 perimeters at 0.4 mm). */
export const MIN_WALL = 1.2;

/** Thinnest inner wall for the top and bottom grooves (≈ 2 lines at 0.4 mm) (mm). */
export const MIN_INNER_WALL = 0.8;

/** Least gap between the side panels' top borders and the top panel above them (mm). */
export const MIN_TOP_GAP = 0.5;

/**
 * Rough size of one exported panel's binary STL: a front and a back grid of
 * n × n samples, two triangles per cell each, 50 bytes per triangle.
 */
export function estimatePanelMB(samplesPerSide: number): number {
  return (4 * samplesPerSide * samplesPerSide * 50) / 1e6;
}

/** Thinnest press-fit peg we trust to survive printing and pressing (mm). */
export const MIN_PEG_DIAMETER = 3;

export interface ParamIssue {
  /** `error`: the parts will not print or assemble. `warning`: they will, but with a compromise. */
  severity: 'error' | 'warning';
  message: string;
}

/**
 * Largest Max thickness (= panel thickness) whose groove still leaves MIN_WALL
 * of post behind it at this frame width. The wall in front of the groove is
 * always OUTER_WALL.
 */
export function maxPanelThickness(frameWidth: number, grooveClearance: number): number {
  return frameWidth - OUTER_WALL - 2 * grooveClearance - MIN_WALL;
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

  // Each groove runs into its post from the outer wall; the post needs material
  // left behind it, or the groove splits the post in two.
  const behindGroove = L.cornerReach - OUTER_WALL - (L.t + 2 * L.clear);
  if (behindGroove < MIN_WALL) {
    const maxT = maxPanelThickness(params.frameWidth, params.grooveClearance);
    error(
      `The frame is too narrow for ${params.lithoMax} mm thick panels: the grooves would cut through the posts. ` +
      (maxT >= 1.5
        ? `Widen the frame or reduce Max thickness to ${maxT.toFixed(1)} mm or less.`
        : 'Widen the frame.'),
    );
  }

  if (L.windowHalf <= 0) {
    error('The frame leaves no room for the image. Increase cube size or narrow the frame.');
  }

  // The top panel rests on the corner supports above the side panels' top
  // borders; it needs room there for the borders and their groove clearance.
  if (L.topPanelBase - (L.panelEdge + L.clear) < MIN_TOP_GAP) {
    error('Panels are too thick for the lid to hold them. Reduce Max thickness or widen the frame.');
  }

  // Each panel's edge rides in a groove inside its corner post. With the panel
  // depth fixed by OUTER_WALL, a narrow post leaves the edges reaching into the
  // neighbouring panels.
  const panelEdge = L.sidePanelW / 2 + L.clear;
  const neighbourInner = L.panelOffset - L.t / 2;
  if (panelEdge > neighbourInner) {
    error('The frame is too narrow: neighbouring panels would collide at the corners. Widen the frame or reduce Max thickness.');
  }

  // Pegs and magnets live in the solid square at each post's outer corner.
  if (params.lidAttach === 'magnet') {
    const maxD = L.postCornerSolid - 2 * MIN_ATTACH_WALL - MAGNET_FIT;
    if (params.magnetDiameter > maxD) {
      error(
        maxD >= 2
          ? `${params.magnetDiameter} mm magnets don't fit in the posts. The largest that fits is ${maxD.toFixed(1)} mm. Use smaller magnets or widen the frame.`
          : 'The posts are too thin for magnets. Widen the frame or use press-fit.',
      );
    }
    const maxH = L.lidThickness - MIN_WALL - MAGNET_FIT;
    if (params.magnetHeight > maxH) {
      error(
        `${params.magnetHeight} mm tall magnets are deeper than the lid (max ${Math.max(0, maxH).toFixed(1)} mm). ` +
        'Use thinner magnets or widen the frame.',
      );
    }
  } else {
    if (L.attachHoleD < MIN_PEG_DIAMETER) {
      error('The posts are too thin for press-fit pegs. Widen the frame.');
    }
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
