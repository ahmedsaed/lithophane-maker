import type { Params } from './types';
import { cubeLayout, MAGNET_FIT, MIN_ATTACH_WALL, PEG_HOLE_EXTRA } from './layout';

/** Thinnest wall we accept anywhere in a printed part (≈ 3 perimeters at 0.4 mm). */
export const MIN_WALL = 1.2;

/** Lowest rail (above the floor, or below the lid plate) that still holds a panel edge (mm). */
export const MIN_RAIL_HEIGHT = 2;

/** Thinnest press-fit peg we trust to survive printing and pressing (mm). */
export const MIN_PEG_DIAMETER = 3;

export interface ParamIssue {
  /** `error`: the parts will not print or assemble. `warning`: they will, but with a compromise. */
  severity: 'error' | 'warning';
  message: string;
}

/** Largest panel thickness that still leaves MIN_WALL outside each frame groove. */
export function maxPanelThickness(postSize: number, grooveClearance: number): number {
  return postSize - 2 * grooveClearance - 2 * MIN_WALL;
}

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
    const maxT = maxPanelThickness(params.postSize, params.grooveClearance);
    error(
      `Post walls around the panel grooves are ${grooveWall.toFixed(2)} mm thick (minimum ${MIN_WALL} mm). ` +
      (maxT > 0
        ? `Reduce panel thickness to ${maxT.toFixed(1)} mm or less, or increase post size.`
        : 'Increase post size.'),
    );
  }

  if (L.windowHalf <= 0) {
    error('Panels have no room left for the image. Increase cube size or reduce post size.');
  }

  // The bottom rail and the lid make the top and bottom of each face's frame,
  // both as tall as the posts are wide.
  if (L.cornerReach - L.bottomThickness < MIN_RAIL_HEIGHT) {
    error(
      `Bottom thickness leaves no room for the bottom groove. Reduce it to ${Math.floor(L.cornerReach - MIN_RAIL_HEIGHT)} mm or less, or increase post size.`,
    );
  }
  if (L.panelTop - L.postTop < MIN_RAIL_HEIGHT) {
    error('Panels are too thick for the lid to hold them. Reduce panel thickness or increase post size.');
  }

  // Each panel's edge rides in a groove; once cornerReach hits its 0.35·C cap,
  // the edges can reach the neighbouring panels at the corners.
  const panelEdge = L.sidePanelW / 2 + L.clear;
  const neighbourInner = L.panelOffset - L.t / 2;
  if (panelEdge > neighbourInner) {
    error('Post size is too large for this cube size, so neighbouring panels collide at the corners. Reduce post size or increase cube size.');
  }

  // Pegs and magnets live in the solid square at each post's outer corner.
  if (params.lidAttach === 'magnet') {
    const maxD = L.postCornerSolid - 2 * MIN_ATTACH_WALL - MAGNET_FIT;
    if (params.magnetDiameter > maxD) {
      error(
        maxD >= 2
          ? `${params.magnetDiameter} mm magnets don't fit in the posts. The largest that fits is ${maxD.toFixed(1)} mm. Use smaller magnets or increase post size.`
          : 'The posts are too thin for magnets. Increase post size or use press-fit.',
      );
    }
    const maxH = L.lidThickness - MIN_WALL - MAGNET_FIT;
    if (params.magnetHeight > maxH) {
      error(
        `${params.magnetHeight} mm tall magnets are deeper than the lid (max ${Math.max(0, maxH).toFixed(1)} mm). ` +
        'Use thinner magnets or increase panel thickness.',
      );
    }
  } else {
    if (L.attachHoleD < MIN_PEG_DIAMETER) {
      error('The posts are too thin for press-fit pegs. Increase post size.');
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

  if (params.lithoMax > params.panelThickness) {
    warn(
      `Max lithophane thickness (${params.lithoMax} mm) exceeds panel thickness (${params.panelThickness} mm), ` +
      'so the darkest areas are clipped. Increase panel thickness or lower the max.',
    );
  }
  if (params.lithoMin >= params.lithoMax) {
    warn('Min and max lithophane thickness are equal, so the image will be flat.');
  }

  return issues;
}
