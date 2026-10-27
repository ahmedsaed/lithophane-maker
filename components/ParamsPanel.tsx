'use client';

import { useStore } from '@/lib/store';
import type { Params, LidAttach } from '@/lib/geometry/types';
import { GUIDE_URL } from '@/components/GitHubLink';
import { validateParams } from '@/lib/geometry/validate';
import { cubeLayout } from '@/lib/geometry/layout';
import { Group, Slider, Toggle } from '@/components/Controls';

export default function ParamsPanel() {
  const params = useStore((s) => s.params);
  const set = useStore((s) => s.setParams);

  const issues = validateParams(params);
  const L = cubeLayout(params);

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
        <p className="field-desc derived-info">
          Frame <strong>{L.cornerReach.toFixed(1)} mm</strong> wide, picture{' '}
          <strong>{Math.max(0, 2 * L.windowHalf).toFixed(1)} mm</strong> square. The frame is
          sized to fit the grooves and the {params.lidAttach === 'magnet' ? 'magnets' : 'pegs'}.
        </p>
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
            set({ grooveClearance: v })
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
          value={params.lithoMax}
          min={1.5}
          max={5}
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
    </div>
  );
}
