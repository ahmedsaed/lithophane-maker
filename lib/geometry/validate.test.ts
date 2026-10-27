import { describe, it, expect, beforeAll } from 'vitest';
import { initManifold } from './manifoldInit';
import { buildAllParts } from './assembly';
import { cubeLayout } from './layout';
import { DEFAULT_PARAMS } from './constants';
import { geometryToManifold, mBox, mIntersect, mTranslate, mUnionAll, withManifoldScope, type Manifold } from './mCsg';
import { validateParams, maxPanelThickness } from './validate';
import type { HeightMap, Params, PartId } from './types';

// Overlaps below this (mm³) are floating-point noise from touching faces.
const OVERLAP_TOL = 0.05;

const hm: HeightMap = {
  width: 8,
  height: 8,
  data: Float32Array.from({ length: 64 }, (_, i) => (i % 3) / 2),
};

/** Small deterministic PRNG so failures are reproducible. */
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Random params drawn from the same ranges the sidebar sliders allow. */
function randomParams(rand: () => number): Params {
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const range = (min: number, max: number, step: number) =>
    min + Math.round((rand() * (max - min)) / step) * step;
  const postSize = range(4, 16, 0.5);
  const grooveClearance = range(0.1, 0.6, 0.05);
  const tMax = Math.max(0.8, Math.min(6, maxPanelThickness(postSize, grooveClearance)));
  return {
    ...DEFAULT_PARAMS,
    cubeSize: range(40, 200, 1),
    postSize,
    grooveClearance,
    panelThickness: range(0.8, tMax, 0.1),
    bottomThickness: range(1.5, 10, 0.5),
    lidAttach: pick(['pressfit', 'magnet'] as const),
    pegDepth: range(3, 15, 0.5),
    pegClearance: range(0, 0.3, 0.05),
    magnetDiameter: pick([3, 4, 5, 6, 8, 10]),
    magnetHeight: pick([1, 1.5, 2, 3, 4, 5]),
    relief: pick(['inward', 'outward'] as const),
    lithoMin: range(0.4, 1.5, 0.05),
    lithoMax: range(1.5, 5, 0.1),
    cableHoles: pick([[], [{ diameter: range(1, 40, 1), x: 0, y: 0 }]]),
  };
}

/** Every geometric problem found in the assembled cube; empty means it prints and fits. */
function assemblyProblems(params: Params): string[] {
  return withManifoldScope(() => assemblyProblemsScoped(params));
}

function assemblyProblemsScoped(params: Params): string[] {
  const problems: string[] = [];
  const L = cubeLayout(params);
  const parts = buildAllParts(
    { front: hm, back: hm, left: hm, right: hm, top: hm },
    params,
    20,
  );
  const solids = new Map<PartId, Manifold>();
  for (const part of parts) {
    const m = geometryToManifold(part.geometry);
    solids.set(part.id, m);
    if (m.status() !== 'NoError') problems.push(`${part.id}: not manifold (${m.status()})`);
    else if (!(m.volume() > 0)) problems.push(`${part.id}: empty`);
    else {
      const pieces = m.decompose();
      const bodies = pieces.length;
      pieces.forEach((piece) => piece.delete());
      if (bodies !== 1) problems.push(`${part.id}: ${bodies} separate bodies`);
    }
  }

  const ids = [...solids.keys()];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const v = mIntersect(solids.get(ids[i])!, solids.get(ids[j])!).volume();
      if (v > OVERLAP_TOL) problems.push(`${ids[i]} overlaps ${ids[j]} by ${v.toFixed(2)} mm³`);
    }
  }

  // Side panels must slide straight down into the frame grooves.
  const frame = solids.get('frame')!;
  for (const id of ['front', 'back', 'left', 'right'] as const) {
    const b = solids.get(id)!.boundingBox();
    const z0 = b.min[2] + 0.05;
    const z1 = L.half + 20;
    const sweep = mBox(
      b.max[0] - b.min[0], b.max[1] - b.min[1], z1 - z0,
      (b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (z0 + z1) / 2,
    );
    const v = mIntersect(sweep, frame).volume();
    if (v > OVERLAP_TOL) problems.push(`${id} panel collides with the frame while sliding in (${v.toFixed(2)} mm³)`);
  }

  // It must look like a cube: C on every axis, and every panel sunk the same
  // depth behind its face so all five faces look alike.
  const boxes = ids.map((id) => solids.get(id)!.boundingBox());
  for (const axis of [0, 1, 2]) {
    const size = Math.max(...boxes.map((b) => b.max[axis])) - Math.min(...boxes.map((b) => b.min[axis]));
    if (Math.abs(size - L.C) > 0.01) problems.push(`cube is ${size.toFixed(2)} mm on axis ${axis}, not ${L.C}`);
  }
  const sideDepth = L.half + solids.get('front')!.boundingBox().min[1];
  const topDepth = L.half - solids.get('top')!.boundingBox().max[2];
  if (Math.abs(sideDepth - topDepth) > 0.01) {
    problems.push(`top panel sits ${topDepth.toFixed(2)} mm deep but side panels ${sideDepth.toFixed(2)} mm`);
  }

  // Every panel rests on the frame (side panels in their bottom groove, the top
  // panel on the corner supports): nudged down, each must run into it. And all
  // five are the same square.
  for (const id of ['front', 'back', 'left', 'right', 'top'] as const) {
    const v = mIntersect(mTranslate(solids.get(id)!, 0, 0, -0.2), frame).volume();
    if (!(v > OVERLAP_TOL)) problems.push(`${id} panel isn't supported by the frame`);
  }
  const footprint = (id: PartId) => {
    const b = solids.get(id)!.boundingBox();
    return [0, 1, 2].map((a) => b.max[a] - b.min[a]).sort((x, y) => y - x).slice(0, 2);
  };
  const [w, h] = footprint('front');
  for (const id of ['back', 'left', 'right', 'top'] as const) {
    const [w2, h2] = footprint(id);
    if (Math.abs(w2 - w) > 0.01 || Math.abs(h2 - h) > 0.01) {
      problems.push(`${id} panel is ${w2.toFixed(2)}×${h2.toFixed(2)}, front is ${w.toFixed(2)}×${h.toFixed(2)}`);
    }
  }
  if (Math.abs(w - h) > 0.01) problems.push(`panels aren't square (${w.toFixed(2)}×${h.toFixed(2)})`);

  // The lid must lower straight down onto the cube: part-way on, its pegs are
  // inside the post holes and nothing may collide.
  const lid = solids.get('lid')!;
  const rest = mUnionAll(ids.filter((id) => id !== 'lid').map((id) => solids.get(id)!));
  const travel = params.lidAttach === 'pressfit' ? params.pegDepth : 2;
  for (const lift of [0.5, travel / 2, travel - 0.3]) {
    const v = mIntersect(mTranslate(lid, 0, 0, lift), rest).volume();
    if (v > OVERLAP_TOL) problems.push(`lid collides while being lowered (${lift.toFixed(1)} mm up: ${v.toFixed(2)} mm³)`);
  }

  return problems;
}

describe('validateParams', () => {
  it('accepts the defaults without issues', () => {
    expect(validateParams(DEFAULT_PARAMS)).toEqual([]);
  });

  it('rejects panels too thick for the posts', () => {
    const issues = validateParams({ ...DEFAULT_PARAMS, postSize: 4, panelThickness: 3 });
    expect(issues.some((i) => i.severity === 'error')).toBe(true);
  });

  it('rejects a cable hole wider than the floor', () => {
    const issues = validateParams({ ...DEFAULT_PARAMS, cubeSize: 40, cableHoles: [{ diameter: 40, x: 0, y: 0 }] });
    expect(issues.some((i) => i.severity === 'error')).toBe(true);
  });

  it('rejects posts too large for the cube', () => {
    const issues = validateParams({ ...DEFAULT_PARAMS, cubeSize: 41, postSize: 14.5, panelThickness: 5.9, grooveClearance: 0.45 });
    expect(issues.some((i) => i.severity === 'error')).toBe(true);
  });

  it('rejects magnets too large for the posts', () => {
    const issues = validateParams({ ...DEFAULT_PARAMS, lidAttach: 'magnet', magnetDiameter: 10 });
    expect(issues.some((i) => i.severity === 'error')).toBe(true);
  });

  it('accepts the default magnets', () => {
    expect(validateParams({ ...DEFAULT_PARAMS, lidAttach: 'magnet' })).toEqual([]);
  });

  it('warns when the relief would be clipped', () => {
    const issues = validateParams({ ...DEFAULT_PARAMS, lithoMax: 4 });
    expect(issues.map((i) => i.severity)).toEqual(['warning']);
  });
});

describe('assembled geometry', () => {
  beforeAll(async () => {
    await initManifold();
  });

  it('default cube builds clean, non-overlapping parts', () => {
    expect(assemblyProblems(DEFAULT_PARAMS)).toEqual([]);
  });

  // Set GEOMETRY_SAMPLES=2000 for a deeper sweep before a release.
  const samples = Number(process.env.GEOMETRY_SAMPLES ?? 150);
  it(`every valid combination of ${samples} random parameter sets assembles cleanly`, () => {
    const rand = mulberry32(1234);
    const failures: string[] = [];
    let checked = 0;
    for (let i = 0; i < samples; i++) {
      const params = randomParams(rand);
      if (validateParams(params).some((issue) => issue.severity === 'error')) continue;
      checked++;
      const problems = assemblyProblems(params);
      if (problems.length) {
        const { cubeSize, postSize, panelThickness, grooveClearance, bottomThickness, relief, cableHoles,
          lidAttach, pegDepth, pegClearance, magnetDiameter, magnetHeight } = params;
        failures.push(
          JSON.stringify({ cubeSize, postSize, panelThickness, grooveClearance, bottomThickness, relief, cableHoles,
            lidAttach, pegDepth, pegClearance, magnetDiameter, magnetHeight }) +
          '\n    ' + problems.join('\n    '),
        );
      }
    }
    expect(checked).toBeGreaterThan(samples / 2);
    expect(failures).toEqual([]);
  }, 300_000);
});
