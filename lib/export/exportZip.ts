import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { HeightMap, Params, PanelSlot } from '../geometry/types';
import { buildFrame } from '../geometry/frame';
import { buildLidFrame } from '../geometry/lidFrame';
import { buildLidPlug } from '../geometry/lidPlug';
import { buildPanelFlat, buildTopPanelFlat } from '../geometry/assembly';
import { geometryToStlBlob } from './exportStl';

const README = `Lithophane Cube — printable parts

Files:
  frame.stl       Print as-is. Four corner posts on a solid bottom floor, with
                  vertical grooves for the side panels. The floor has the
                  optional cable hole(s).
  lid.stl         The top lid frame. Three-sided ring with panel grooves on the
                  inside and alignment tabs that snap into the corner posts.
                  Print face-down with no supports.
  plug.stl        Closes the open front of the lid after the top panel is in
                  place. Print face-down.
  side-*.stl      The four side panels (lithophane plates with tongue borders).
                  Print with the plate flat on the bed.

Assembly:
  1. Slide each side panel down into the frame's vertical corner grooves.
  2. Place your light source inside (through a side opening before the last
     panel, or route a cable through the bottom hole).
  3. Slide the top panel into the lid frame from the open side, then press
     the lid down onto the cube until the tabs click into the corner posts.

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

  onProgress?.('Building lid…');
  zip.file('lid.stl', geometryToStlBlob(buildLidFrame(params)));

  onProgress?.('Building plug…');
  zip.file('plug.stl', geometryToStlBlob(buildLidPlug(params)));

  for (const slot of Object.keys(heightMaps) as PanelSlot[]) {
    const hm = heightMaps[slot];
    if (!hm) continue;
    onProgress?.(`Building ${slot} panel…`);
    const geom = slot === 'top'
      ? buildTopPanelFlat(hm, params, res)
      : buildPanelFlat(slot, hm, params, res);
    const name = slot === 'top' ? 'top.stl' : `side-${slot}.stl`;
    zip.file(name, geometryToStlBlob(geom));
  }

  zip.file('README.txt', README);

  onProgress?.('Zipping…');
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, 'lithophane-cube.zip');
  onProgress?.('Done');
}
