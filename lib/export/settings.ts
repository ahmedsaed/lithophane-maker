import pkg from '../../package.json';
import type { CropRect, ImageAdjust, Params, PanelSlot } from '../geometry/types';
import { PANEL_SLOTS } from '../geometry/types';
import { NEUTRAL_ADJUST } from '../geometry/constants';
import { cubeLayout } from '../geometry/layout';

/** What a download records about one face's photo. */
export interface PhotoRecord {
  /** Original file name, so the user knows which photo went where. */
  file: string;
  crop?: CropRect;
  adjust: ImageAdjust;
}

export type PhotoRecords = Partial<Record<PanelSlot, PhotoRecord>>;

const FACE: Record<PanelSlot, string> = {
  front: 'Front',
  back: 'Back',
  left: 'Left',
  right: 'Right',
  top: 'Top',
};

/**
 * Everything needed to make the same cube again, as JSON. `params` is the full
 * settings object, so a future import can load it as-is.
 */
export function settingsJson(params: Params, photos?: PhotoRecords, exportedAt = new Date()): string {
  const L = cubeLayout(params);
  return JSON.stringify(
    {
      app: 'Lithophane Cube Maker',
      url: 'https://lithophane-maker.merope.dev',
      version: pkg.version,
      exportedAt: exportedAt.toISOString(),
      params,
      // Calculated from params, recorded for reference only.
      derived: {
        frameWidth: round(L.cornerReach),
        pictureSize: round(2 * L.windowHalf),
        panelSize: round(L.sidePanelW),
        panelThickness: round(L.t),
      },
      ...(photos ? { photos: Object.fromEntries(PANEL_SLOTS.map((s) => [s, photos[s] ?? null])) } : {}),
    },
    null,
    2,
  );
}

/**
 * The same settings as plain text for README.txt, grouped and labelled like
 * the sidebar so each line can be re-entered by hand.
 */
export function settingsText(params: Params, photos?: PhotoRecords): string {
  const L = cubeLayout(params);
  const mm = (v: number) => `${round(v)} mm`;
  const rows: Array<[string, Array<[string, string]>]> = [
    ['Cube', [
      ['Cube size', mm(params.cubeSize)],
      ['Cable hole', params.cableHoles.length ? mm(params.cableHoles[0].diameter) : 'none'],
    ]],
    ['Lid', params.lidAttach === 'magnet'
      ? [['Attach with', 'Magnets'], ['Magnet diameter', mm(params.magnetDiameter)], ['Magnet height', mm(params.magnetHeight)]]
      : [['Attach with', 'Press-fit'], ['Peg depth', mm(params.pegDepth)]]],
    ['Fit', [
      ['Groove clearance', mm(params.grooveClearance)],
      ...(params.lidAttach === 'pressfit' ? [['Peg clearance', mm(params.pegClearance)] as [string, string]] : []),
    ]],
    ['Lithophane', [
      ['Min thickness (bright)', mm(params.lithoMin)],
      ['Max thickness (dark)', mm(params.lithoMax)],
      ['Gamma', `${params.lithoGamma}`],
      ['Textured side', params.relief === 'outward' ? 'Outside' : 'Inside'],
      ['Resolution', `${params.pixelsPerMm} px/mm`],
    ]],
  ];

  const lines = [
    'SETTINGS USED',
    '',
    'Enter these in the Lithophane Cube Maker to make this cube again.',
    'The same settings are in settings.json.',
    '',
  ];
  for (const [group, fields] of rows) {
    lines.push(`  ${group}`);
    for (const [label, value] of fields) lines.push(`    ${label.padEnd(24, '.')} ${value}`);
  }
  lines.push(`  (Calculated: frame ${mm(L.cornerReach)} wide, picture ${mm(2 * L.windowHalf)} square.)`);

  if (photos) {
    lines.push('', '  Photos (Edit on each image slot)');
    for (const slot of PANEL_SLOTS) {
      const p = photos[slot];
      lines.push(`    ${FACE[slot].padEnd(7, '.')} ${p ? describePhoto(p) : 'blank panel'}`);
    }
  }
  return lines.join('\n') + '\n';
}

function describePhoto(p: PhotoRecord): string {
  const parts = [p.file];
  if (p.crop) {
    const pct = (v: number) => `${round(v * 100)}%`;
    parts.push(`crop ${pct(p.crop.w)} wide from ${pct(p.crop.x)} left, ${pct(p.crop.y)} top`);
  } else {
    parts.push('centred');
  }
  const a = p.adjust;
  const changed = (Object.keys(NEUTRAL_ADJUST) as Array<keyof ImageAdjust>).some((k) => a[k] !== NEUTRAL_ADJUST[k]);
  parts.push(
    changed
      ? `brightness ${a.brightness}, contrast ${a.contrast}, auto contrast ${a.autoContrast ? 'on' : 'off'}, ` +
        `sharpen ${a.sharpen}, invert ${a.invert ? 'on' : 'off'}`
      : 'no adjustments',
  );
  return parts.join('; ');
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}
