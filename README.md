# Lithophane Cube Maker

**Turn five photos into a 3D-printable lithophane lamp.**

**Try it: [lithophane-maker.merope.dev](https://lithophane-maker.merope.dev)**

A lithophane is a thin plastic panel that shows a picture when light shines
through it: darker parts of the image are printed thicker and block more light,
lighter parts are thinner and glow. Lithophane Cube Maker builds a complete cube
lamp from your photos: four side panels, a top panel, and a frame and lid that
hold them together. Put a light inside and all five pictures light up.

> **Beta.** The parts are checked by automated tests, but every printer is a
> little different. Start with the [printing guide](https://lithophane-maker.merope.dev/guide/),
> which has you print a few small test pieces before the full cube, and
> [let us know how it went](https://github.com/ahmedsaed/lithophane-maker/issues/new).

## Free, private and open source

- **Free.** Every feature, including all five panels, with no account,
  watermark or paywall.
- **Private.** Everything runs in your browser. Your photos are never uploaded
  anywhere.
- **Open source.** MIT-licensed, so you can use it, change it and build on it.
  Contributions are welcome.

## What it supports

**Your images**
- Five panels: front, back, left, right and top. Empty slots become plain
  panels that glow evenly, so you can mix photos with plain sides.
- Crop each image to the square window it fills.
- Image controls: brightness, contrast, auto-contrast, sharpening and invert.

**The cube**
- Any size from 40 to 200 mm, with an adjustable frame width.
- Every face is framed evenly on all four sides, and all five panels are the
  same square, so all five pictures look the same.
- The lid attaches with **printed press-fit pegs** (no extra parts) or **disc
  magnets** pressed into the posts and lid.
- A cable hole in the floor for the light's power lead, with adjustable size.
- Lithophane controls for your filament: thickness range, gamma, which side
  carries the texture, and resolution to match your nozzle.

**Getting a good print**
- A live 3D preview with an exploded view to see how the parts fit together.
- A **[printing guide](https://lithophane-maker.merope.dev/guide/)** covering
  printer setup, slicer settings and assembly.
- **Test pieces**: small parts cut from the real cube that check groove fit,
  lid fit and image brightness in minutes, instead of a day-long full print.
- Warnings for settings that would produce parts that can't be printed or won't
  fit together.
- STL export, part by part or everything in one zip, already oriented for
  printing.

## How to use it

1. **Add images** to the five slots and crop them.
2. **Adjust** the cube size, lid type and image settings while watching the preview.
3. **Print the test pieces** (Export → Test kit / Clearance sweep) and set
   your clearances. The [guide](https://lithophane-maker.merope.dev/guide/)
   walks you through it.
4. **Download all** and print the parts. Panels print standing up.
5. **Assemble**: slide the side panels into the frame, put the light inside,
   lay the top panel on and press the lid down.

### The parts

| Part | What it is |
|------|------------|
| `frame` | The floor, corner posts and bottom rails, grooved to hold each side panel, plus a small support at each post's inner corner for the top panel. A peg or magnet hole in each post top and a cable hole in the floor. |
| `side-*` ×4 | The side lithophane panels. Their 5 mm borders are hidden in the grooves on all four edges. |
| `top` | The top lithophane panel: the same square as the sides. It rests on the corner supports. |
| `lid` | The top band of the cube. It frames the top panel, holds the side panels' top edges in a groove and traps the top panel in place. |

---

## Technical details

### How it works

Everything happens in the browser:

1. **Image → height map** (`lib/image/`): each image is converted to grayscale,
   adjusted (contrast, gamma, sharpening and so on) and cropped to the square
   window.
2. **Height map → panel** (`lib/geometry/lithophanePanel.ts`): a watertight
   mesh whose thickness follows image brightness, with a flat border that rides
   in the grooves. Gamma compensates for the non-linear way light dims through
   plastic (Beer–Lambert).
3. **Frame and lid** (`frame.ts`, `lidFrame.ts`): solid modelling with
   [manifold-3d](https://github.com/elalish/manifold) (WebAssembly), which
   guarantees watertight output. Every dimension comes from one shared layout
   (`layout.ts`), so the parts always fit each other.
4. **Export** (`lib/export/`): binary STLs, oriented for printing, zipped with
   a README.

### Tech stack

- **Next.js** (App Router, TypeScript), exported as a static site (`output: 'export'`)
- **Three.js**, **react-three-fiber** and **drei** for the 3D preview
- **manifold-3d** (WASM) for watertight solid modelling
- **zustand** for state, **jszip** and **file-saver** for downloads
- **vitest** for tests

### Develop

```bash
npm install
npm run dev       # http://localhost:3000
npm test          # unit + geometry tests
npm run build     # static export to ./out
npm run coupons   # write the test-piece STLs for the default settings to ./coupons
```

### Project layout

```
app/
  page.tsx              the maker
  guide/page.tsx        the printing guide (/guide)
components/             sidebar (uploads, crop, parameters, export) and 3D viewer
lib/
  image/                image → grayscale height map
  geometry/
    layout.ts           shared dimensions for every part
    frame.ts            frame: floor, posts, bottom rails, grooves, corner supports
    lidFrame.ts         lid: top band, panel recess, pegs / magnet holes
    lithophanePanel.ts  lithophane panel mesh
    assembly.ts         builds every part, in place and in print orientation
    coupons.ts          test pieces cut from the real parts
    validate.ts         flags settings that produce unprintable parts
    mCsg.ts             manifold-3d helpers (with WASM memory cleanup)
  export/               STL and zip export
scripts/                command-line export of the test pieces
```

### Testing

`npm test` includes a geometry sweep: it builds the whole cube for 150 random
combinations of the sidebar settings and checks that every part is a single
valid solid, nothing overlaps, the side panels slide in, the lid lowers on
cleanly, the cube has the right dimensions and every panel sits at the same
depth. Run a deeper sweep before a release:

```bash
GEOMETRY_SAMPLES=3000 npm test
```

### Contributing

Issues and pull requests are welcome: bugs, features, or a report of how the
cube printed on your printer (include your printer, filament and the
clearances that worked). Please run `npm test` before opening a PR.

### License

[MIT](LICENSE)
