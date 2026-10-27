import type { Metadata } from 'next';
import Link from 'next/link';
import { GitHubIconLink, ISSUES_URL } from '@/components/GitHubLink';

export const metadata: Metadata = {
  title: 'Printing Guide · Lithophane Cube Maker',
  description:
    'Tune your printer, check the fits with small test pieces, dial in the lithophane, then print and assemble the cube.',
};

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="guide-table">
      <table>
        <thead>
          <tr>{head.map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The good / too tight / too loose verdicts for a fit test. */
function Verdicts({ good, tight, loose }: { good: React.ReactNode; tight: React.ReactNode; loose: React.ReactNode }) {
  return (
    <ul className="guide-verdicts">
      <li><strong className="ok">Good:</strong> {good}</li>
      <li><strong className="bad">Too tight:</strong> {tight}</li>
      <li><strong className="bad">Too loose:</strong> {loose}</li>
    </ul>
  );
}

function Setting({ children }: { children: React.ReactNode }) {
  return <span className="guide-setting">{children}</span>;
}

const STEPS = [
  { id: 'tune', title: 'Tune your printer', print: 'Your slicer’s calibration tests', learn: 'Flow and first layer are right, so parts come out the size they should' },
  { id: 'fits', title: 'Check the fits', print: 'Small pieces cut from the real parts', learn: 'Groove clearance and Peg clearance' },
  { id: 'lithophane', title: 'Tune the lithophane', print: 'A 10-step brightness strip', learn: 'Min / Max thickness and Gamma' },
  { id: 'cube', title: 'Print the cube', print: 'Everything', learn: 'A finished lamp' },
];

export default function GuidePage() {
  return (
    <div className="guide">
      <header className="guide-header">
        <Link href="/" className="guide-back">← Back to the maker</Link>
        <div className="title-row">
          <h1>Printing Guide</h1>
          <span className="beta-badge">Beta</span>
          <GitHubIconLink />
        </div>
        <p className="guide-lead">
          A lithophane cube takes most of a day to print, so this guide front-loads the
          cheap checks. Each step takes minutes to an hour and tells you a setting to
          use. By the time you print the full cube, every fit and image setting has
          already been checked on <em>your</em> printer, filament and slicer.
        </p>
      </header>

      <nav className="guide-steps">
        {STEPS.map((s, i) => (
          <a key={s.id} href={`#${s.id}`} className="guide-step-card">
            <span className="guide-step-num">{i + 1}</span>
            <span className="guide-step-title">{s.title}</span>
            <span className="guide-step-meta">Print: {s.print}</span>
            <span className="guide-step-meta">Learn: {s.learn}</span>
          </a>
        ))}
      </nav>

      <div className="guide-note">
        Use the <strong>same printer, nozzle, filament and slicer profile</strong> throughout.
        The results don’t transfer between filaments or printers. All test pieces come
        from the maker: <Setting>Export → Test kit</Setting> and{' '}
        <Setting>Export → Clearance sweep</Setting>. They’re already oriented for
        printing, so import them as they are, with no supports.
      </div>

      <div className="guide-note subtle">
        <strong>Orca Slicer on Linux (Flatpak):</strong> open files with{' '}
        <Setting>File → Import</Setting> (Ctrl+I) rather than double-clicking them, or
        Orca may report “The file does not contain any geometry data”.
      </div>

      <section id="tune">
        <h2><span className="guide-num">1</span>Tune your printer</h2>
        <p>
          The fit tests in step 2 absorb most printer differences, but they can’t fix a
          printer that’s over-extruding one day and under-extruding the next. Spend a few
          minutes on the basics first:
        </p>
        <ol>
          <li>
            <strong>Flow rate.</strong> Over-extrusion makes grooves and holes tight;
            under-extrusion makes parts weak. In Orca Slicer:{' '}
            <Setting>Calibration → Flow rate</Setting>. Other slicers have an equivalent test.
          </li>
          <li>
            <strong>First layer.</strong> The frame’s floor and the panels’ bottom edges
            print on the bed. You want a clean first layer that isn’t squashed into a lip.
          </li>
          <li>
            <strong>Elephant foot.</strong> The panels print standing on the edge that goes
            into the bottom groove, so if the first layers bulge outward, that edge won’t
            drop all the way in. Turn on your slicer’s elephant
            foot compensation (Orca:{' '}
            <Setting>Quality → Precision → Elephant foot compensation</Setting>, around
            0.1–0.15 mm).
          </li>
        </ol>
        <p>
          Leave hole and contour (X-Y) compensation at 0 for now. Step 2 measures what
          your printer needs, and the maker applies it as clearance.
        </p>
      </section>

      <section id="fits">
        <h2><span className="guide-num">2</span>Check the fits</h2>
        <p>
          Two settings depend on your printer: how loosely a panel slides into its groove,
          and how firmly the lid’s pegs grip the posts. The <strong>Clearance sweep</strong>{' '}
          prints each fit at five sizes side by side, so one print tells you the right number.
        </p>

        <h3>Slicer settings for test pieces</h3>
        <Table
          head={['Pieces', 'Layer height', 'Walls', 'Infill']}
          rows={[
            ['Groove posts, post top, lid corners (frame-like)', 'Your normal frame setting, e.g. 0.2 mm', '3', '15–20 %'],
            ['Panel strip and brightness strip (panel-like)', <a key="l" href="#litho-settings">Lithophane settings</a>, 'See step 3', '100 %, with a brim'],
          ]}
        />
        <p>
          Print the panel strip the same way you’ll print real panels: standing up, as
          exported, with the lithophane settings. The grooves need to fit a real panel,
          not a frame-quality one.
        </p>

        <h3>Panel fit (Groove clearance)</h3>
        <p><strong>Print:</strong> <code>groove-post-*</code> ×5 and <code>panel-strip</code>.</p>
        <p>The five posts differ only in groove width. Count the engraved dots on the floor:</p>
        <Table
          head={['Dots', '1', '2', '3', '4', '5']}
          rows={[['Groove clearance', '0.15 mm', '0.20 mm', '0.25 mm', '0.30 mm', '0.35 mm']]}
        />
        <p>
          <strong>Test:</strong> hold the strip the way it printed, bottom edge down, and
          slide its side edge down into each post’s groove until the bottom edge seats in
          the bottom groove. Try both grooves on each post.
        </p>
        <Verdicts
          good="it slides in by hand with light friction, stands upright on its own and barely wobbles."
          tight="it needs force or stops before the bottom."
          loose="it drops in and rattles."
        />
        <p><strong>Set:</strong> <Setting>Fit → Groove clearance</Setting> to the tightest post that passes.</p>

        <h3>Lid fit (Peg clearance), press-fit lids</h3>
        <p>
          <strong>Print:</strong> <code>lid-corner-peg-*</code> ×5 and <code>post-top</code>.
          The lid corners print face-down with the peg pointing up, and the dots are on top.
        </p>
        <Table
          head={['Dots', '1', '2', '3', '4', '5']}
          rows={[['Peg clearance', '0.00 mm', '0.05 mm', '0.10 mm', '0.15 mm', '0.20 mm']]}
        />
        <p><strong>Test:</strong> press each peg into the post top’s hole.</p>
        <Verdicts
          good="it goes all the way in with firm thumb pressure, and the post stays attached when you lift it by the lid corner."
          tight="it won’t seat fully, or the peg cracks."
          loose="it falls out when lifted."
        />
        <p>
          Insert and remove your favourite three or four times. You’ll open the lid to reach
          the light, so it has to keep gripping.
        </p>
        <p>
          <strong>Set:</strong> <Setting>Fit → Peg clearance</Setting> to that one. If even
          the tightest is loose, raise <Setting>Peg depth</Setting>.
        </p>

        <h3>Magnet fit, magnet lids</h3>
        <p>
          <strong>Print:</strong> the <code>post-top</code> and <code>lid-corner</code> from
          the <strong>Test kit</strong> with <Setting>Lid → Attach with: Magnets</Setting>{' '}
          selected, and get your magnets (6×3 mm by default).
        </p>
        <p><strong>Test:</strong> press a magnet into each hole.</p>
        <ul>
          <li><strong>Good:</strong> it goes in snugly and sits flush or slightly below the surface. On many printers it then holds by friction alone, firmly enough that it can’t be pulled back out.</li>
          <li><strong>Loose:</strong> it slides out on its own. Fit it with a drop of glue in the final build.</li>
          <li><strong>Doesn’t fit:</strong> check the <Setting>Magnet diameter / height</Setting> settings match your magnets.</li>
        </ul>
        <div className="guide-note warn">
          <strong>Check the polarity before pressing each magnet in.</strong> A pressed-in
          magnet may never come out again, and a flipped one repels the lid. Stack the
          magnet for a lid corner on the one for the post below it, mark the face that
          points down, and press it in that way.
        </div>
      </section>

      <section id="lithophane">
        <h2><span className="guide-num">3</span>Tune the lithophane</h2>
        <p>
          The image comes from light passing through plastic of varying thickness, so the
          right thickness range depends on your filament and your light source.
        </p>

        <h3 id="litho-settings">Lithophane slicer settings</h3>
        <p>
          <strong>Panels print standing up.</strong> The maker exports every panel standing
          on its bottom edge, and that’s how to print them:
        </p>
        <ul>
          <li>
            <strong>Smooth shading.</strong> Lying flat, thickness can only change in whole
            layers: at 0.1 mm layers that’s about 20 brightness levels, which shows up as
            rings in gradients. Standing up, thickness comes from the nozzle’s much finer
            sideways moves.
          </li>
          <li>
            <strong>No grid.</strong> A flat panel is mostly infill, and its pattern shows
            through when lit. A standing panel is built from walls.
          </li>
        </ul>
        <p>The cost is a slower print and a tall, thin part that needs a brim. Use these settings for every panel and for the test strips:</p>
        <Table
          head={['Setting', 'Value', 'Why']}
          rows={[
            ['Orientation', <strong key="o">Standing, as exported</strong>, 'Smooth shading, no infill grid'],
            ['Filament', 'Plain white PLA', 'Colours and silk finishes tint or scatter the light'],
            ['Layer height', '0.1–0.12 mm', 'Sets the vertical detail; the shading itself comes from sideways moves'],
            ['Infill', <strong key="i">100 %</strong>, 'Gaps inside the plate show up as lines when lit'],
            ['Brim', <strong key="b">5 mm</strong>, 'Keeps a tall, thin plate from tipping or wobbling'],
            ['Speed', 'Outer walls ≤ 40 mm/s', 'Wobble near the top shows up as streaks when backlit'],
            ['Supports', 'None', ''],
          ]}
        />
        <p>
          Print panels spaced apart rather than packed tightly, so the nozzle doesn’t knock
          a neighbour while it’s still thin. Peel the brim off before assembly.
        </p>

        <h3>Brightness test</h3>
        <p><strong>Print:</strong> <code>litho-steps</code> from the <strong>Test kit</strong> with the settings above.</p>
        <p>
          <strong>Test:</strong> in a dim room, hold it in front of <strong>the light you’ll
          use in the cube</strong>. It shows 10 steps from black to white.
        </p>
        <Table
          head={['What you see', 'Change']}
          rows={[
            ['All 10 steps look different', 'Nothing, you’re set'],
            ['The darkest steps merge into one block', <>Lower <Setting>Max thickness (dark)</Setting></>],
            ['The brightest steps merge into one glow', <>Raise <Setting>Min thickness (bright)</Setting></>],
            ['Everything looks too dark or too washed out', <>Adjust <Setting>Gamma</Setting>: lower for deeper shadows, higher for brighter overall</>],
          ]}
        />
        <p>
          <Setting>Max thickness</Setting> is also the panel’s own thickness. The thicker it is,
          the more light it blocks and the wider the frame needs to be, so the slider stops
          before the groove walls would get too thin.
        </p>

        <h3>Choosing a light</h3>
        <ul>
          <li><strong>Diffuse beats bright.</strong> A single bare LED shows up as a hot spot in the middle of every panel. A frosted bulb or an LED puck light spreads evenly.</li>
          <li><strong>Warm white</strong> (around 2700–3000 K) gives lithophanes their classic look.</li>
          <li><strong>Centre it</strong> in the cube so all five panels get equal light. The cable hole in the floor is for routing its power lead.</li>
        </ul>
      </section>

      <section id="cube">
        <h2><span className="guide-num">4</span>Print the cube</h2>
        <p>
          With the clearances and thicknesses set, export with{' '}
          <Setting>Download all (.zip)</Setting>. Empty image slots become plain panels
          (<code>*-blank.stl</code>), which glow evenly and print faster. They’re handy for a
          first test assembly.
        </p>
        <Table
          head={['Part', 'Profile', 'Notes']}
          rows={[
            [<code key="f">frame.stl</code>, 'Frame: 0.2 mm, 3 walls, 15–20 %', 'Floor down, as exported'],
            [<code key="l">lid.stl</code>, 'Frame', 'Exported face-down, with the pegs or magnet holes pointing up'],
            [<><code>side-*.stl</code>, <code>top.stl</code></>, <a key="s" href="#litho-settings">Lithophane</a>, 'Standing on the bottom edge, as exported, with a 5 mm brim'],
          ]}
        />

        <h3>Assembly</h3>
        <ol>
          <li>Slide each side panel down the corner grooves until it seats in the bottom groove. Each file is named for its side, so match them up.</li>
          <li>Place the light inside and route its cable through the floor hole.</li>
          <li>Lay the top panel on the four small supports at the posts’ inner corners.</li>
          <li>Press the lid down onto the posts. Its skirts slide over the side panels’ top edges, and it traps the top panel.</li>
        </ol>
      </section>

      <section id="troubleshooting">
        <h2>Troubleshooting</h2>
        <Table
          head={['Problem', 'Likely cause', 'Fix']}
          rows={[
            ['Panel won’t reach the bottom groove', 'Elephant foot on the panel or frame', <>Turn on elephant foot compensation (<a key="t" href="#tune">step 1</a>)</>],
            ['Panels fit the test piece but not the real frame', 'Different layer height or profile than the test', 'Print the test pieces with the same profiles as the real parts'],
            ['Lid falls off', 'Peg clearance too high', <>Lower <Setting>Peg clearance</Setting> or raise <Setting>Peg depth</Setting></>],
            ['Lid pegs snapped', 'Peg clearance too low', <>Raise <Setting>Peg clearance</Setting></>],
            ['Rings or steps in smooth gradients', 'Panel printed lying flat', 'Print it standing up, as exported'],
            ['Grid pattern visible in the image', 'Panel printed flat, or infill below 100 %', 'Print standing up with 100 % infill'],
            ['Panel wobbled or tipped over while printing', 'Tall, thin part with too little bed grip', 'Use a 5 mm (or wider) brim, slow down, and space panels apart'],
            ['Bright spot in the middle of each panel', 'Small bare light source', 'Use a diffuse bulb or puck light'],
            ['Image looks flat or muddy', 'Thickness range too narrow', <>Re-run the brightness test (<a key="b" href="#lithophane">step 3</a>)</>],
          ]}
        />
      </section>

      <section id="share">
        <h2>Share your results</h2>
        <p>
          This project is in beta, and printer reports are the most useful contribution. If
          you run the tests, please <a href={ISSUES_URL} target="_blank" rel="noopener noreferrer">open
          an issue</a> with your printer, nozzle, filament, the clearances that worked and a
          photo of the result. It helps set better defaults for everyone.
        </p>
      </section>

      <footer className="guide-footer">
        <Link href="/" className="guide-back">← Back to the maker</Link>
      </footer>
    </div>
  );
}
