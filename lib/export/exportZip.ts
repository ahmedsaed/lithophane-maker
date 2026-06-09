import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { HeightMap, Params, PanelSlot } from '../geometry/types';
import { buildFrame } from '../geometry/frame';
import { buildBasePlate } from '../geometry/basePlate';
import { buildPanelFlat } from '../geometry/assembly';
import { geometryToStlBlob } from './exportStl';

const README = `Lithophane Cube — printable parts

Files:
  frame.stl       Print upright as-is. The four corner posts have vertical
                  grooves for the side panels and a top groove for the lid.
  side-*.stl      The four side lithophanes. Print flat, relief side UP.
  top.stl         The lid lithophane. Print flat, relief side UP.
  base.stl        Snap-fit base. Print flat (hooks up). Has cable hole(s).

Assembly:
  1. Slide each side panel down into the frame's vertical corner grooves.
  2. Slide the top panel into the top groove to close the top.
  3. Add your light source, then clip the base plate onto the bottom.

Tips:
  - Lithophanes print best with no top/bottom layer lines visible: use a
    fine layer height (0.08-0.12 mm) and print panels flat.
  - If panels are too tight/loose, adjust "groove clearance" and re-export.
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

  onProgress?.('Building base…');
  zip.file('base.stl', geometryToStlBlob(buildBasePlate(params)));

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
