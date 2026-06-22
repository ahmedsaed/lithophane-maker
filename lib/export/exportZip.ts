import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { HeightMap, Params, PanelSlot } from '../geometry/types';
import { buildFrame } from '../geometry/frame';
import { buildLidFrame } from '../geometry/lidFrame';
import { buildPanelFlat, buildTopPanelFlat, buildBottomPanelFlat } from '../geometry/assembly';
import { buildPlug } from '../geometry/plug';
import { geometryToStlBlob } from './exportStl';

const README = `Lithophane Cube — printable parts

Files:
  frame.stl       Print as-is. Four corner posts with vertical grooves for the
                  side panels, fused to a base ring at the bottom. The base ring
                  has an inner groove that accepts the bottom lithophane panel
                  (slid in from the open front).
  lid.stl         The top lid frame. Three-sided ring with panel grooves on the
                  inside and alignment tabs that snap into the corner posts.
                  Print face-down with no supports.
  plug.stl        Closes the open front of a ring after its panel is in place.
                  PRINT TWO: one for the lid, one for the base (identical part).
                  Print face-down. The lid and base each have a built-in wall
                  across the front opening on their print side; flip one plug
                  over (rotate 180°) when fitting it to the base.
  side-*.stl      The four side panels (lithophane plates with tongue borders).
                  Print with the plate flat on the bed.
  top.stl         The top lithophane panel (slides into the lid).
  bottom.stl      The bottom lithophane panel (slides into the fused base).

Assembly:
  1. Slide the bottom panel into the frame's base ring from the open front,
     then push a plug into the base front opening until its ridges click in.
  2. Slide each side panel down into the frame's vertical corner grooves.
  3. Place your light source inside (through a side opening before the last
     panel).
  4. Slide the top panel into the lid frame from the open side, then push the
     second plug into the lid front opening.
  5. Press the lid down onto the cube until the tabs click into the corner posts.

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
  // Identical part for both the lid and base front openings — print two copies.
  zip.file('plug.stl', geometryToStlBlob(buildPlug(params)));

  for (const slot of Object.keys(heightMaps) as PanelSlot[]) {
    const hm = heightMaps[slot];
    if (!hm) continue;
    onProgress?.(`Building ${slot} panel…`);
    const geom =
      slot === 'top'    ? buildTopPanelFlat(hm, params, res) :
      slot === 'bottom' ? buildBottomPanelFlat(hm, params, res) :
      buildPanelFlat(slot, hm, params, res);
    const name =
      slot === 'top'    ? 'top.stl' :
      slot === 'bottom' ? 'bottom.stl' :
      `side-${slot}.stl`;
    zip.file(name, geometryToStlBlob(geom));
  }

  zip.file('README.txt', README);

  onProgress?.('Zipping…');
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, 'lithophane-cube.zip');
  onProgress?.('Done');
}
