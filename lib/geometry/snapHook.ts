import type { Brush } from 'three-bvh-csg';
import { box, union } from './csg';
import { HOOK } from './constants';
import type { CubeLayout } from './layout';

/**
 * A cantilever snap hook for one base corner: a vertical arm rising from the
 * base plate with a lip near the top that snaps into the frame's catch pocket.
 * `sx`,`sy` are corner signs (±1); the lip points outward toward (sx,sy).
 */
export function cornerHook(
  L: CubeLayout,
  sx: number,
  sy: number,
  baseTopZ: number,
  baseHalf: number,
): Brush {
  const w = HOOK.armWidth;
  const armH = 10;
  const ax = sx * (baseHalf - w / 2);
  const ay = sy * (baseHalf - w / 2);

  // Flexing arm.
  let hook = box(w, w, armH, { x: ax, y: ay, z: baseTopZ + armH / 2 });

  // Retaining lip near the top, protruding diagonally outward.
  const lip = box(w, w, HOOK.lipHeight, {
    x: ax + sx * HOOK.lipDepth,
    y: ay + sy * HOOK.lipDepth,
    z: baseTopZ + armH - HOOK.lipHeight / 2,
  });
  hook = union(hook, lip);
  return hook;
}
