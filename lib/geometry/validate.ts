import type { Params } from './types';
import { cubeLayout, FRAME_PER_POST, MAGNET_FIT, MAX_PANEL_CELLS, MIN_ATTACH_WALL, PEG_HOLE_EXTRA } from './layout';

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
 * Largest Max thickness (= panel thickness) that still leaves MIN_WALL outside
 * each frame groove at this frame width.
 */
export function maxPanelThickness(frameWidth: number, grooveClearance: number): number {
  return frameWidth / FRAME_PER_POST - 2 * grooveClearance - 2 * MIN_WALL;
}

/** Above this, an exported panel's relief is visibly stepped (mm per sample). */
export const COARSE_MM_PER_PIXEL = 0.4;
/** Below this, detail is finer than a 0.4 mm nozzle can lay down (mm per sample). */
export const FINE_MM_PER_PIXEL = 0.15;
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

  // Material between each frame groove and the outer face of the post.
  const grooveWall = L.p / 2 - L.t / 2 - L.clear;
  if (grooveWall < MIN_WALL) {
    const maxT = maxPanelThickness(params.frameWidth, params.grooveClearance);
    error(
      `The walls around the panel grooves are ${grooveWall.toFixed(2)} mm thick (minimum ${MIN_WALL} mm). ` +
      (maxT > 0
        ? `Reduce Max thickness to ${maxT.toFixed(1)} mm or less, or widen the frame.`
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

  // Each panel's edge rides in a groove; once cornerReach hits its 0.35·C cap,
  // the edges can reach the neighbouring panels at the corners.
  const panelEdge = L.sidePanelW / 2 + L.clear;
  const neighbourInner = L.panelOffset - L.t / 2;
  if (panelEdge > neighbourInner) {
    error('The frame is too wide for this cube size, so neighbouring panels collide at the corners. Narrow the frame or increase cube size.');
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
  const requested = Math.round(L.sidePanelW / params.mmPerPixel);
  const samples = Math.min(requested, MAX_PANEL_CELLS);
  if (requested > MAX_PANEL_CELLS) {
    warn(
      `At this cube size, exports are limited to ${(L.sidePanelW / MAX_PANEL_CELLS).toFixed(2)} mm per pixel ` +
      `(${MAX_PANEL_CELLS} samples across a panel), so they are coarser than the ${params.mmPerPixel} mm you set.`,
    );
  }
  if (params.mmPerPixel > COARSE_MM_PER_PIXEL) {
    warn(`At ${params.mmPerPixel} mm per pixel the image will look visibly stepped. 0.2 mm suits a 0.4 mm nozzle.`);
  } else if (params.mmPerPixel < FINE_MM_PER_PIXEL) {
    warn(`${params.mmPerPixel} mm per pixel is finer than a 0.4 mm nozzle can print, and only adds detail with a smaller nozzle.`);
  }
  const panelMB = estimatePanelMB(samples);
  if (panelMB > LARGE_PANEL_MB) {
    warn(
      `Each panel's STL will be about ${Math.round(panelMB)} MB, so the download may be slow or fail on a phone. ` +
      'A larger mm-per-pixel value makes smaller files.',
    );
  }

  return issues;
}
