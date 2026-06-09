import { Mesh, type BufferGeometry } from 'three';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';

const exporter = new STLExporter();

/** Serialize a geometry to a binary STL Blob. */
export function geometryToStlBlob(geometry: BufferGeometry): Blob {
  const mesh = new Mesh(geometry);
  const data = exporter.parse(mesh, { binary: true }) as unknown as DataView;
  return new Blob([data.buffer as ArrayBuffer], { type: 'model/stl' });
}
