import { describe, it, expect, beforeAll } from 'vitest';
import { initManifold } from './manifoldInit';
import { DEFAULT_PARAMS } from './constants';
import { geometryToManifold, withManifoldScope } from './mCsg';
import { buildClearanceSweep, buildTestKit, SWEEP_CLEARANCES } from './coupons';
import type { Coupon } from './coupons';

function describeCoupon(c: Coupon) {
  return withManifoldScope(() => {
    const m = geometryToManifold(c.geometry);
    const pieces = m.decompose();
    const bodies = pieces.length;
    pieces.forEach((p) => p.delete());
    const b = m.boundingBox();
    return { status: m.status(), bodies, volume: m.volume(), min: b.min, max: b.max };
  });
}

describe('test coupons', () => {
  beforeAll(async () => {
    await initManifold();
  });

  for (const [label, build] of [['test kit', buildTestKit], ['clearance sweep', buildClearanceSweep]] as const) {
    it(`${label}: every coupon is one solid, on the bed and small`, () => {
      for (const c of build(DEFAULT_PARAMS)) {
        const d = describeCoupon(c);
        expect(d.status, c.name).toBe('NoError');
        expect(d.bodies, c.name).toBe(1);
        expect(d.volume, c.name).toBeGreaterThan(0);
        expect(d.min[2], c.name).toBeCloseTo(0, 4);
        for (const axis of [0, 1, 2]) expect(d.max[axis] - d.min[axis], c.name).toBeLessThan(75);
      }
    });
  }

  it('every sweep coupon is a different fit', () => {
    const sweep = buildClearanceSweep(DEFAULT_PARAMS);
    for (const prefix of ['groove-post-', 'lid-corner-peg-']) {
      const vols = sweep.filter((c) => c.name.startsWith(prefix)).map((c) => describeCoupon(c).volume);
      expect(vols).toHaveLength(SWEEP_CLEARANCES.length);
      // Each clearance changes the part (a wider slot moves the groove's inner
      // wall, a looser peg is thinner), so no two coupons may be identical.
      expect(new Set(vols.map((v) => v.toFixed(3))).size, prefix).toBe(vols.length);
    }
    // Looser pegs only ever remove plastic, so that sweep must shrink steadily.
    const pegs = sweep.filter((c) => c.name.startsWith('lid-corner-peg-')).map((c) => describeCoupon(c).volume);
    for (let i = 1; i < pegs.length; i++) expect(pegs[i]).toBeLessThan(pegs[i - 1]);
  });

  it('magnet lids get no peg sweep', () => {
    const names = buildClearanceSweep({ ...DEFAULT_PARAMS, lidAttach: 'magnet' }).map((c) => c.name);
    expect(names.some((n) => n.startsWith('lid-corner-peg-'))).toBe(false);
  });
});
