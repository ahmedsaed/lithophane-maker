import { BoxGeometry, BufferGeometry, CylinderGeometry } from 'three';
import { Brush, Evaluator, ADDITION, SUBTRACTION } from 'three-bvh-csg';

const evaluator = new Evaluator();
evaluator.attributes = ['position', 'normal'];

export interface Vec3 {
  x?: number;
  y?: number;
  z?: number;
}

/** An axis-aligned box brush of size (sx,sy,sz) centred at (cx,cy,cz). */
export function box(
  sx: number,
  sy: number,
  sz: number,
  c: Vec3 = {},
): Brush {
  const b = new Brush(new BoxGeometry(sx, sy, sz));
  b.position.set(c.x ?? 0, c.y ?? 0, c.z ?? 0);
  b.updateMatrixWorld(true);
  return b;
}

/** An axis box rotated about Z by `angle` radians, centred at (cx,cy,cz). */
export function rotBox(
  sx: number,
  sy: number,
  sz: number,
  angle: number,
  c: Vec3 = {},
): Brush {
  const b = new Brush(new BoxGeometry(sx, sy, sz));
  b.position.set(c.x ?? 0, c.y ?? 0, c.z ?? 0);
  b.rotation.z = angle;
  b.updateMatrixWorld(true);
  return b;
}

/** A Z-aligned cylinder brush (radius, height) centred at (cx,cy,cz). */
export function cylinderZ(
  radius: number,
  height: number,
  c: Vec3 = {},
  segments = 32,
): Brush {
  const g = new CylinderGeometry(radius, radius, height, segments);
  g.rotateX(Math.PI / 2); // align axis to Z
  const b = new Brush(g);
  b.position.set(c.x ?? 0, c.y ?? 0, c.z ?? 0);
  b.updateMatrixWorld(true);
  return b;
}

export function union(a: Brush, b: Brush): Brush {
  const r = evaluator.evaluate(a, b, ADDITION);
  r.updateMatrixWorld(true);
  return r;
}

export function subtract(a: Brush, b: Brush): Brush {
  const r = evaluator.evaluate(a, b, SUBTRACTION);
  r.updateMatrixWorld(true);
  return r;
}

/** Wrap any BufferGeometry in a Brush for CSG operations. */
export function brushFrom(geom: BufferGeometry): Brush {
  const b = new Brush(geom);
  b.updateMatrixWorld(true);
  return b;
}

export function unionAll(brushes: Brush[]): Brush {
  let acc = brushes[0];
  for (let i = 1; i < brushes.length; i++) acc = union(acc, brushes[i]);
  return acc;
}

export function subtractAll(base: Brush, tools: Brush[]): Brush {
  let acc = base;
  for (const t of tools) acc = subtract(acc, t);
  return acc;
}
