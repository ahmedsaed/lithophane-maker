import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { HeightMap, Params, PanelSlot } from '../geometry/types';
import { buildFrame } from '../geometry/frame';
import { buildLidForPrint } from '../geometry/lidFrame';
import { buildPanelForPrint, buildTopPanelForPrint, fillBlankPanels, panelFileName } from '../geometry/assembly';
import { geometryToStlBlob } from './exportStl';
import type { Coupon } from '../geometry/coupons';

const README = `Lithophane Cube — printable parts

Files:
  frame.stl       Four corner posts and bottom rails on a solid floor, grooved
                  to hold the side panels' side and bottom edges. A small
                  support rises from each post's inner corner for the top
                  panel to rest on. A peg/magnet hole in each post top and the
                  optional cable hole(s) in the floor. Print as-is, no supports.
  lid.stl         The top band of the cube. Its skirts hold the side panels'
                  top edges in a groove, so every face is framed on all four
                  sides. Already face-down: print as-is, no supports.
  side-*.stl      The four side panels (lithophane plates with a flat border
                  that rides in the grooves). Exported standing on their
                  bottom edge: print them that way, with a 5 mm brim.
  top.stl         The top panel: the same square as the side panels, also
                  exported standing.
  *-blank.stl     Plain panels for slots without a photo: one even thickness
                  that glows about as brightly as an average photo. Swap in a
                  photo panel later, or keep them for a plain side.

Assembly:
  1. Slide each side panel down into the frame's corner grooves until it
     seats in the bottom groove.
  2. Put your light source inside, routing its cable through the floor hole.
  3. Lay the top panel on the four corner supports.
  4. Press the lid down onto the posts. Its skirts slide over the side
     panels' top edges and it traps the top panel.
     Magnet version: first press one magnet into each post top and each lid
     corner (glue any that are loose). Check every pair attracts BEFORE
     pressing it in: a pressed-in magnet may not come out again.

Tips:
  - Lithophanes: plain white PLA, standing up as exported, 0.1-0.12 mm
    layers, 100% infill, 5 mm brim.
  - Print the test kit and clearance sweep first to dial in the fits.
  - Full printing guide: the "printing guide" link under the title in the
    Lithophane Cube Maker.
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
  zip.file('lid.stl', geometryToStlBlob(buildLidForPrint(params)));

  // Empty slots get blank panels so the zip is always a complete cube.
  const { heightMaps: all, blankSlots } = fillBlankPanels(heightMaps);
  for (const slot of Object.keys(all) as PanelSlot[]) {
    const hm = all[slot];
    onProgress?.(`Building ${slot} panel…`);
    const geom = slot === 'top'
      ? buildTopPanelForPrint(hm, params, res)
      : buildPanelForPrint(slot, hm, params, res);
    zip.file(panelFileName(slot, blankSlots.includes(slot)), geometryToStlBlob(geom));
  }

  zip.file('README.txt', README);

  onProgress?.('Zipping…');
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, 'lithophane-cube.zip');
  onProgress?.('Done');
}

export const COUPON_README = `Lithophane Cube — test prints

Small pieces cut from the real parts, so you can check fit and image settings
in minutes instead of printing a whole cube. Print them with the same
printer, material and slicer settings you will use for the cube.

Full walkthrough, including slicer settings: open "printing guide" under
the title in the Lithophane Cube Maker.

TEST KIT (current settings)

  groove-post.stl + panel-strip.stl
      The bottom of a corner post and the bottom corner of a side panel.
      Print the strip standing, as exported, like a real panel. Hold it
      bottom edge down and slide its side edge into either groove until the
      bottom edge seats in the bottom groove.
      Good:      slides in by hand with light friction, stands upright, little wobble.
      Too tight: needs force or won't go in -> raise "Groove clearance".
      Too loose: falls in and rattles     -> lower "Groove clearance".
      Tip: run the clearance sweep below to find your number in one print.

  post-top.stl + lid-corner.stl
      The top of a corner post and the matching lid corner (printed face-down).
      Press-fit: push the lid corner's peg into the post's hole.
        Good:      goes in with firm thumb pressure and holds when you
                   lift the post by the lid corner.
        Too tight: won't go in fully, or the peg cracks -> raise "Peg clearance".
        Too loose: falls out when you lift it          -> lower "Peg clearance",
                   or make "Peg depth" longer.
      Magnets: press a magnet into each hole. It should go in snugly and sit
      flush or slightly below the surface. It may then hold by friction alone;
      glue it if it's loose. Check polarity first, since it may not come out.

  litho-steps.stl
      A 10-step brightness wedge (black -> white) using your min/max thickness
      and gamma. Print it standing, as exported, with your lithophane settings
      and hold it in front of the light source you'll use in the cube.
      Good: all 10 steps look different. If the dark end merges into one
            block, lower "Max thickness"; if the bright end merges, raise
            "Min thickness" or adjust gamma.

CLEARANCE SWEEP

  groove-post-<clearance>mm-<N>dots.stl x5 + panel-strip.stl
      The same corner post at five groove clearances. The engraved dots on the
      floor tell them apart (1 dot = tightest). Try the strip in each one and
      set "Groove clearance" to the tightest one that slides in without force.

  lid-corner-peg-<clearance>mm-<N>dots.stl x5 + post-top.stl  (press-fit only)
      Lid corners whose pegs range from tight (1 dot, 0 mm) to loose (5 dots).
      The dots are on the face that prints on top. Try each in the post top and
      set "Peg clearance" to the one that grips best while still going in.
`;

/** Bundle a set of test coupons with instructions into one zip download. */
export async function exportCouponsZip(coupons: Coupon[], filename: string): Promise<void> {
  const zip = new JSZip();
  for (const c of coupons) zip.file(`${c.name}.stl`, geometryToStlBlob(c.geometry));
  zip.file('README.txt', COUPON_README);
  saveAs(await zip.generateAsync({ type: 'blob' }), filename);
}
