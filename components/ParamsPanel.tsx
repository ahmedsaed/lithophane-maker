'use client';

import { useStore } from '@/lib/store';
import type { Params } from '@/lib/geometry/types';

function Slider({
  label,
  unit,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  unit?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="field">
      <label>
        <span>{label}</span>
        <span>
          {value}
          {unit ?? ''}
        </span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

export default function ParamsPanel() {
  const params = useStore((s) => s.params);
  const setParams = useStore((s) => s.setParams);
  const set = (patch: Partial<Params>) => setParams(patch);

  return (
    <div>
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
        min={4}
        max={16}
        step={0.5}
        onChange={(v) => set({ postSize: v })}
      />
      <Slider
        label="Post chamfer"
        unit=" mm"
        value={params.grooveChamfer}
        min={0}
        max={3}
        step={0.5}
        onChange={(v) => set({ grooveChamfer: v })}
      />
      <Slider
        label="Bottom thickness"
        unit=" mm"
        value={params.bottomThickness}
        min={1.5}
        max={6}
        step={0.5}
        onChange={(v) => set({ bottomThickness: v })}
      />
      <Slider
        label="Panel thickness"
        unit=" mm"
        value={params.panelThickness}
        min={2}
        max={5}
        step={0.1}
        onChange={(v) => set({ panelThickness: v })}
      />
      <Slider
        label="Litho min (bright)"
        unit=" mm"
        value={params.lithoMin}
        min={0.4}
        max={1.5}
        step={0.1}
        onChange={(v) => set({ lithoMin: v })}
      />
      <Slider
        label="Litho max (dark)"
        unit=" mm"
        value={params.lithoMax}
        min={1.5}
        max={5}
        step={0.1}
        onChange={(v) => set({ lithoMax: v })}
      />
      <Slider
        label="Groove clearance"
        unit=" mm"
        value={params.grooveClearance}
        min={0.1}
        max={0.6}
        step={0.05}
        onChange={(v) => set({ grooveClearance: v })}
      />

      <div className="field">
        <label>
          <span>Relief direction</span>
        </label>
        <div className="toggle">
          <button
            className={params.relief === 'inward' ? 'active' : ''}
            onClick={() => set({ relief: 'inward' })}
          >
            Inward
          </button>
          <button
            className={params.relief === 'outward' ? 'active' : ''}
            onClick={() => set({ relief: 'outward' })}
          >
            Outward
          </button>
        </div>
      </div>

      <div className="field">
        <label>
          <span>Invert brightness</span>
        </label>
        <div className="toggle">
          <button
            className={!params.invert ? 'active' : ''}
            onClick={() => set({ invert: false })}
          >
            Normal
          </button>
          <button
            className={params.invert ? 'active' : ''}
            onClick={() => set({ invert: true })}
          >
            Inverted
          </button>
        </div>
      </div>

      <Slider
        label="Cable hole ⌀"
        unit=" mm"
        value={params.cableHoles[0]?.diameter ?? 0}
        min={0}
        max={20}
        step={1}
        onChange={(v) =>
          set({ cableHoles: v > 0 ? [{ diameter: v, x: 0, y: 0 }] : [] })
        }
      />
    </div>
  );
}
