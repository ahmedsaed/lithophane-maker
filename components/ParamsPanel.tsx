'use client';

import { useStore } from '@/lib/store';
import type { Params, GrayscaleMode } from '@/lib/geometry/types';

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

export default function ParamsPanel() {
  const params = useStore((s) => s.params);
  const set = useStore((s) => s.setParams);

  const panelThicknessMax = Math.min(6, Math.max(1.2, params.postSize - 2 * params.grooveClearance));

  return (
    <div>
      <Group title="Frame">
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
          label="Post size"
          unit=" mm"
          value={params.postSize}
          min={2}
          max={16}
          step={0.5}
          onChange={(v) => {
            const newMax = Math.min(6, Math.max(1.2, v - 2 * params.grooveClearance));
            set({ postSize: v, panelThickness: Math.min(params.panelThickness, newMax) });
          }}
        />
      </Group>

      <Group title="Panel">
        <Slider
          label="Panel thickness"
          unit=" mm"
          value={Math.min(params.panelThickness, panelThicknessMax)}
          min={0.8}
          max={panelThicknessMax}
          step={0.1}
          onChange={(v) => set({ panelThickness: v })}
        />
        <Slider
          label="Groove clearance"
          unit=" mm"
          value={params.grooveClearance}
          min={0.1}
          max={0.6}
          step={0.05}
          onChange={(v) => {
            const newMax = Math.min(6, Math.max(1.2, params.postSize - 2 * v));
            set({ grooveClearance: v, panelThickness: Math.min(params.panelThickness, newMax) });
          }}
        />
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
          value={params.lithoMax}
          min={1.5}
          max={5}
          step={0.1}
          onChange={(v) => set({ lithoMax: v })}
        />
        <Toggle
          label="Relief direction"
          options={[
            { label: 'Inward', value: 'inward' },
            { label: 'Outward', value: 'outward' },
          ]}
          value={params.relief}
          onChange={(v) => set({ relief: v as Params['relief'] })}
        />
        <Toggle
          label="Invert brightness"
          options={[
            { label: 'Normal', value: false },
            { label: 'Inverted', value: true },
          ]}
          value={params.invert}
          onChange={(v) => set({ invert: v as boolean })}
        />
      </Group>

      <Group title="Image Processing">
        <div className="field">
          <div className="field-row">
            <span className="field-label">Grayscale mode</span>
            <div className="toggle">
              {(['rec601', 'rec709', 'average', 'luminosity'] as GrayscaleMode[]).map((m) => (
                <button
                  key={m}
                  className={params.grayscaleMode === m ? 'active' : ''}
                  onClick={() => set({ grayscaleMode: m })}
                >
                  {m === 'rec601' ? '601' : m === 'rec709' ? '709' : m === 'average' ? 'Avg' : 'Lum'}
                </button>
              ))}
            </div>
          </div>
          <p className="field-desc">
            How colors are converted to brightness. Rec.601 suits traditional photography.
            Luminosity linearizes sRGB first for physically accurate results with modern cameras.
          </p>
        </div>

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
          label="Gamma"
          value={params.lithoGamma}
          min={0.2}
          max={2.0}
          step={0.05}
          onChange={(v) => set({ lithoGamma: v })}
          description="Compensates for Beer-Lambert light decay through PLA. 0.45 gives physically correct shadow depth. Lower = deeper shadows; higher = brighter overall."
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
      </Group>

      <Group title="Output">
        <Slider
          label="Resolution"
          unit=" mm/px"
          value={params.mmPerPixel}
          min={0.1}
          max={1.0}
          step={0.05}
          onChange={(v) => set({ mmPerPixel: v })}
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
        />
      </Group>
    </div>
  );
}
