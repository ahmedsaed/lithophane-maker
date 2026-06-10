import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { HeightMap, Params, PanelSlot } from '../geometry/types';
import { buildFrame } from '../geometry/frame';
import { buildPanelFlat } from '../geometry/assembly';
import { geometryToStlBlob } from './exportStl';

const README = `Lithophane Cube — printable parts

Files:
  frame.stl       Print as-is. Four ramped corner posts on a solid bottom
                  floor, with vertical grooves for the side panels. The top is
                  open (the side panels carry the top rails). The floor has the
                  optional cable hole(s).
  side-*.stl      The four side panels. Each has a lithophane plate plus a
                  wedge top rail; together the four rails form the top frame.
                  Print with the plate flat on the bed (rail pointing up).
  top.stl         The lid lithophane. Print flat, relief side up.

Assembly:
  1. Slide each side panel down into the frame's vertical corner grooves; the
     top rails come together to form the top frame.
  2. Place your light source inside (through a side opening before the last
     panel, or route a cable through the bottom hole).
  3. Drop the lid panel into the ledge formed by the four top rails.

Tips:
  - Lithophanes print best flat with a fine layer height (0.08-0.12 mm).
  - If panels fit too tight/loose, adjust "groove clearance" and re-export.
`;

/** Build all printable parts and download them as a single zip. */
export async function exportPartsZip(
  heightMaps: Partial<Record<PanelSlot, HeightMap>>,
  params: Params,
  onProgress?: (msg: string) => void,
): Promise<void> {
  const zip = new JSZip();
  const res = params.exportResolution;

  onProgress?.('Building frame…');
  zip.file('frame.stl', geometryToStlBlob(buildFrame(params)));

  for (const slot of Object.keys(heightMaps) as PanelSlot[]) {
    const hm = heightMaps[slot];
    if (!hm) continue;
    onProgress?.(`Building ${slot} panel…`);
    const geom = buildPanelFlat(slot, hm, params, res);
    const name = slot === 'top' ? 'top.stl' : `side-${slot}.stl`;
    zip.file(name, geometryToStlBlob(geom));
  }

  zip.file('README.txt', README);

  onProgress?.('Zipping…');
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, 'lithophane-cube.zip');
  onProgress?.('Done');
}
