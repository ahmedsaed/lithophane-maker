'use client';

import { useStore } from '@/lib/store';
import type { Params, LidAttach } from '@/lib/geometry/types';
import { GUIDE_URL } from '@/components/GitHubLink';
import { maxPanelThickness, validateParams } from '@/lib/geometry/validate';

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="param-group">
      <p className="param-group-title">{title}</p>
      {children}
    </div>
  );
}

function Slider({
  label,
  unit,
  value,
  min,
  max,
  step,
  onChange,
  description,
}: {
  label: string;
  unit?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  description?: string;
}) {
  const handleNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
  };

  return (
    <div className="field">
      <div className="field-row">
        <span className="field-label">{label}</span>
        <div className="field-value">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={handleNumber}
          />
          {unit && <span className="field-unit">{unit}</span>}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      {description && <p className="field-desc">{description}</p>}
    </div>
  );
}

function Toggle({
  label,
  options,
  value,
  onChange,
  description,
}: {
  label: string;
  options: { label: string; value: string | boolean }[];
  value: string | boolean;
  onChange: (v: string | boolean) => void;
  description?: string;
}) {
  return (
    <div className="field">
      <div className="field-row">
        <span className="field-label">{label}</span>
        <div className="toggle">
          {options.map((opt) => (
            <button
              key={String(opt.value)}
              className={value === opt.value ? 'active' : ''}
              onClick={() => onChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      {description && <p className="field-desc">{description}</p>}
    </div>
  );
}

/**
 * Max-thickness slider ceiling. The panel is as thick as its darkest point, so
 * this also keeps MIN_WALL around each groove; held within 1.5–5 mm.
 */
function lithoMaxCeiling(frameWidth: number, grooveClearance: number): number {
  return Math.min(5, Math.max(1.5, maxPanelThickness(frameWidth, grooveClearance)));
}

export default function ParamsPanel() {
  const params = useStore((s) => s.params);
  const set = useStore((s) => s.setParams);

  const lithoMaxTop = lithoMaxCeiling(params.frameWidth, params.grooveClearance);
  const issues = validateParams(params);

  return (
    <div>
      {issues.length > 0 && (
        <ul className="param-issues">
          {issues.map((issue) => (
            <li key={issue.message} className={`param-issue ${issue.severity}`}>
              {issue.message}
            </li>
          ))}
        </ul>
      )}
      <Group title="Cube">
        <Slider
          label="Cube size"
          unit=" mm"
          value={params.cubeSize}
          min={40}
          max={200}
          step={1}
          onChange={(v) => set({ cubeSize: v })}
        />
        <Slider
          label="Frame width"
          unit=" mm"
          value={params.frameWidth}
          min={7.2}
          max={28.8}
          step={0.1}
          onChange={(v) =>
            set({ frameWidth: v, lithoMax: Math.min(params.lithoMax, lithoMaxCeiling(v, params.grooveClearance)) })
          }
          description="The band around every picture: posts, bottom rail and lid."
        />
        <Slider
          label="Cable hole ⌀"
          unit=" mm"
          value={params.cableHoles[0]?.diameter ?? 0}
          min={0}
          max={40}
          step={1}
          onChange={(v) =>
            set({ cableHoles: v > 0 ? [{ diameter: v, x: 0, y: 0 }] : [] })
          }
          description="In the floor, for the light's power lead. 0 for none."
        />
      </Group>

      <Group title="Lid">
        <Toggle
          label="Attach with"
          options={[
            { label: 'Press-fit', value: 'pressfit' },
            { label: 'Magnets', value: 'magnet' },
          ]}
          value={params.lidAttach}
          onChange={(v) => set({ lidAttach: v as LidAttach })}
          description={
            params.lidAttach === 'pressfit'
              ? 'Fully printed: pegs under the lid press into holes in the posts.'
              : 'Press a disc magnet into each post top and each lid corner (8 total); glue any that are loose. Check the polarity first: a pressed-in magnet may not come out again.'
          }
        />
        {params.lidAttach === 'pressfit' ? (
          <Slider
            label="Peg depth"
            unit=" mm"
            value={params.pegDepth}
            min={3}
            max={15}
            step={0.5}
            onChange={(v) => set({ pegDepth: v })}
            description="Longer pegs grip harder."
          />
        ) : (
          <>
            <Slider
              label="Magnet diameter"
              unit=" mm"
              value={params.magnetDiameter}
              min={3}
              max={10}
              step={0.5}
              onChange={(v) => set({ magnetDiameter: v })}
            />
            <Slider
              label="Magnet height"
              unit=" mm"
              value={params.magnetHeight}
              min={1}
              max={5}
              step={0.5}
              onChange={(v) => set({ magnetHeight: v })}
            />
          </>
        )}
      </Group>

      <Group title="Fit">
        <p className="field-desc" style={{ marginTop: 0 }}>
          Depends on your printer. Find yours with the clearance sweep test print (see the{' '}
          <a href={GUIDE_URL} target="_blank" rel="noopener noreferrer">printing guide</a>).
        </p>
        <Slider
          label="Groove clearance"
          unit=" mm"
          value={params.grooveClearance}
          min={0.1}
          max={0.6}
          step={0.05}
          onChange={(v) =>
            set({ grooveClearance: v, lithoMax: Math.min(params.lithoMax, lithoMaxCeiling(params.frameWidth, v)) })
          }
          description="Gap around each panel edge in its groove. Lower = tighter."
        />
        {params.lidAttach === 'pressfit' && (
          <Slider
            label="Peg clearance"
            unit=" mm"
            value={params.pegClearance}
            min={0}
            max={0.3}
            step={0.05}
            onChange={(v) => set({ pegClearance: v })}
            description="Gap around each lid peg. Lower = tighter."
          />
        )}
      </Group>

      <Group title="Lithophane">
        <Slider
          label="Min thickness (bright)"
          unit=" mm"
          value={params.lithoMin}
          min={0.4}
          max={1.5}
          step={0.05}
          onChange={(v) => set({ lithoMin: v })}
        />
        <Slider
          label="Max thickness (dark)"
          unit=" mm"
          value={Math.min(params.lithoMax, lithoMaxTop)}
          min={1.5}
          max={lithoMaxTop}
          step={0.1}
          onChange={(v) => set({ lithoMax: v })}
          description="Also the thickness of the whole panel, border included."
        />
        <Slider
          label="Gamma"
          value={params.lithoGamma}
          min={0.2}
          max={2.0}
          step={0.05}
          onChange={(v) => set({ lithoGamma: v })}
          description="Matches the shading to how light fades through your filament. Tune it with the brightness test print. Lower = deeper shadows; higher = brighter overall."
        />
        <Toggle
          label="Textured side"
          options={[
            { label: 'Outside', value: 'outward' },
            { label: 'Inside', value: 'inward' },
          ]}
          value={params.relief}
          onChange={(v) => set({ relief: v as Params['relief'] })}
          description="Which side of each panel carries the relief. The other side is flat."
        />
        <Slider
          label="Resolution"
          unit=" px/mm"
          value={params.pixelsPerMm}
          min={1}
          max={10}
          step={0.5}
          onChange={(v) => set({ pixelsPerMm: v })}
          description="Photo pixels per mm of panel. Higher = finer detail and bigger files. About 2 per mm of nozzle: 5 for a 0.4 mm nozzle, 10 for 0.2 mm."
        />
      </Group>

      <Group title="Image">
        <Toggle
          label="Auto contrast"
          options={[
            { label: 'Off', value: false },
            { label: 'On', value: true },
          ]}
          value={params.lithoAutoContrast}
          onChange={(v) => set({ lithoAutoContrast: v as boolean })}
          description="Stretches the brightness range to fill the full dark-to-light span. Useful for low-contrast or washed-out photos."
        />
        <Slider
          label="Brightness"
          value={params.lithoBrightness}
          min={-0.5}
          max={0.5}
          step={0.05}
          onChange={(v) => set({ lithoBrightness: v })}
          description="Shifts all brightness values up (+) or down (−). Use to correct over- or under-exposed photos."
        />
        <Slider
          label="Contrast"
          value={params.lithoContrast}
          min={0.5}
          max={2.0}
          step={0.05}
          onChange={(v) => set({ lithoContrast: v })}
          description="Multiplies the difference from mid-gray. Values above 1 increase the distinction between light and dark areas."
        />
        <Slider
          label="Sharpen"
          value={params.lithoSharpen}
          min={0}
          max={2.0}
          step={0.1}
          onChange={(v) => set({ lithoSharpen: v })}
          description="Unsharp mask sharpening. Enhances fine edges and detail. 0 = off. High values may amplify noise."
        />
        <Toggle
          label="Invert brightness"
          options={[
            { label: 'Normal', value: false },
            { label: 'Inverted', value: true },
          ]}
          value={params.invert}
          onChange={(v) => set({ invert: v as boolean })}
          description="For photo negatives."
        />
      </Group>
    </div>
  );
}
