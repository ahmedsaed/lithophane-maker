import { describe, it, expect } from 'vitest';
import { settingsJson, settingsText } from './settings';
import { DEFAULT_PARAMS, NEUTRAL_ADJUST } from '../geometry/constants';

const photos = {
  front: { file: 'beach.jpg', crop: { x: 0.25, y: 0, w: 0.5, h: 1 }, adjust: { ...NEUTRAL_ADJUST, brightness: 0.3, invert: true } },
  top: { file: 'sky.png', adjust: NEUTRAL_ADJUST },
};

describe('settings in the download', () => {
  it('JSON carries the full params, so a future import can load them as-is', () => {
    const json = JSON.parse(settingsJson(DEFAULT_PARAMS, photos, new Date('2026-10-27T00:00:00Z')));
    expect(json.params).toEqual(DEFAULT_PARAMS);
    expect(json.exportedAt).toBe('2026-10-27T00:00:00.000Z');
    expect(json.derived.frameWidth).toBe(14.4);
    expect(json.photos.front.crop).toEqual(photos.front.crop);
    expect(json.photos.back).toBeNull();
  });

  it('text lists every setting under its sidebar group and label', () => {
    const text = settingsText(DEFAULT_PARAMS, photos);
    for (const line of [
      /Cube size\.+ 100 mm/,
      /Cable hole\.+ 8 mm/,
      /Attach with\.+ Press-fit/,
      /Peg depth\.+ 8 mm/,
      /Groove clearance\.+ 0\.2 mm/,
      /Peg clearance\.+ 0\.1 mm/,
      /Min thickness \(bright\)\.+ 0\.7 mm/,
      /Max thickness \(dark\)\.+ 2\.8 mm/,
      /Gamma\.+ 0\.45/,
      /Textured side\.+ Outside/,
      /Resolution\.+ 5 px\/mm/,
      /frame 14\.4 mm wide, picture 71\.2 mm square/,
    ]) expect(text).toMatch(line);
  });

  it('text describes each photo, or says the face is blank', () => {
    const text = settingsText(DEFAULT_PARAMS, photos);
    expect(text).toMatch(/Front\.+ beach\.jpg; crop 50% wide from 25% left, 0% top; brightness 0\.3, .*invert on/);
    expect(text).toMatch(/Top\.+ sky\.png; centred; no adjustments/);
    expect(text).toMatch(/Back\.+ blank panel/);
  });

  it('magnet lids list magnet size instead of pegs', () => {
    const text = settingsText({ ...DEFAULT_PARAMS, lidAttach: 'magnet' });
    expect(text).toMatch(/Attach with\.+ Magnets/);
    expect(text).toMatch(/Magnet diameter\.+ 6 mm/);
    expect(text).not.toMatch(/Peg/);
  });
});
