import { describe, it, expect, beforeAll } from 'vitest';
import { buildPlug, buildPlugInPlace } from './plug';
import { buildAllParts } from './assembly';
import { cubeLayout } from './layout';
import { DEFAULT_PARAMS } from './constants';
import { initManifold } from './manifoldInit';

const vcount = (g: any) => g.getAttribute('position').count;

describe('plug chamfer verification', () => {
  beforeAll(async () => { await initManifold(); });

  it('chamfer changes the plug lip geometry (vs toggle off)', () => {
    const off = buildPlug({ ...DEFAULT_PARAMS, chamfer: false });
    const on  = buildPlug({ ...DEFAULT_PARAMS, chamfer: true });
    console.log('plug verts off:', vcount(off), ' on:', vcount(on));
    expect(vcount(on)).not.toBe(vcount(off));   // bevel altered the lip
    off.computeBoundingBox(); on.computeBoundingBox();
    // Chamfer only removes material → plug doesn't grow.
    const bo = off.boundingBox!, bn = on.boundingBox!;
    expect(bn.min.z).toBeGreaterThanOrEqual(bo.min.z - 1e-6);
  });

  it('lidPlug + basePlug still build and the assembly stays 100³', () => {
    const L = cubeLayout(DEFAULT_PARAMS);
    const lp = buildPlugInPlace(DEFAULT_PARAMS, L.lidCenterZ, false);
    const bp = buildPlugInPlace(DEFAULT_PARAMS, L.baseCenterZ, true);
    expect(vcount(lp)).toBeGreaterThan(0);
    expect(vcount(bp)).toBeGreaterThan(0);

    const parts = buildAllParts({}, DEFAULT_PARAMS, 60);
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (const p of parts) {
      p.geometry.computeBoundingBox();
      const b = p.geometry.boundingBox!;
      lo[0] = Math.min(lo[0], b.min.x); hi[0] = Math.max(hi[0], b.max.x);
      lo[1] = Math.min(lo[1], b.min.y); hi[1] = Math.max(hi[1], b.max.y);
      lo[2] = Math.min(lo[2], b.min.z); hi[2] = Math.max(hi[2], b.max.z);
    }
    console.log('overall:', (hi[0]-lo[0]).toFixed(2), (hi[1]-lo[1]).toFixed(2), (hi[2]-lo[2]).toFixed(2));
    expect(hi[2]-lo[2]).toBeCloseTo(L.C, 1);
  });
});
