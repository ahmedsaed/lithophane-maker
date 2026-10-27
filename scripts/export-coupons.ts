/**
 * Write the test-coupon STLs for the default parameters to disk.
 *   npm run coupons [-- <outDir>]      (default: ./coupons)
 * The test kit and sweep use the default press-fit lid; magnet-fit/ has the
 * magnet-hole versions of the lid pieces.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { initManifold } from '../lib/geometry/manifoldInit';
import { DEFAULT_PARAMS } from '../lib/geometry/constants';
import { buildClearanceSweep, buildLidCornerCoupon, buildPostTopCoupon, buildTestKit } from '../lib/geometry/coupons';
import { geometryToStlBlob } from '../lib/export/exportStl';
import { COUPON_README } from '../lib/export/exportZip';

async function main() {
  const outDir = process.argv[2] ?? 'coupons';
  await initManifold();
  const magnet = { ...DEFAULT_PARAMS, lidAttach: 'magnet' as const };
  for (const [folder, coupons] of [
    ['test-kit', buildTestKit(DEFAULT_PARAMS)],
    ['clearance-sweep', buildClearanceSweep(DEFAULT_PARAMS)],
    ['magnet-fit', [
      { name: 'post-top', geometry: buildPostTopCoupon(magnet) },
      { name: 'lid-corner', geometry: buildLidCornerCoupon(magnet) },
    ]],
  ] as const) {
    const dir = join(outDir, folder);
    mkdirSync(dir, { recursive: true });
    for (const c of coupons) {
      const buf = Buffer.from(await geometryToStlBlob(c.geometry).arrayBuffer());
      writeFileSync(join(dir, `${c.name}.stl`), buf);
      console.log(join(dir, `${c.name}.stl`));
    }
  }
  writeFileSync(join(outDir, 'README.txt'), COUPON_README);
}

main();
