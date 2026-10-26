# Lithophane Cube Maker

> **Beta.** The geometry is checked by automated tests, but real-world fits
> vary by printer. Print the test pieces (Export → Test prints) before a full
> cube, and please report how it went. See the **[printing guide](PRINTING.md)**.

A fully client-side web tool that turns **5 images** (4 sides + 1 top) into a
3D-printable, backlit **lithophane cube**. Everything — image processing, mesh
generation, 3D preview and STL export — runs in the browser. No backend.

A lithophane encodes an image as varying material thickness: dark pixels print
thicker (block more light), light pixels print thinner. Backlit, the image
appears.

## The 7 printable parts

| Part        | Description |
|-------------|-------------|
| `frame`     | Corner posts and bottom rails on a solid floor, grooved to hold each side panel's side and bottom edges. A peg or magnet hole in each post top. Cable/USB hole(s) in the floor for a light source. |
| `side-*` ×4 | Side lithophane panels with a flat border that rides in the grooves. |
| `top`       | Top lithophane panel, corners notched to clear the posts. |
| `lid`       | The top band of the cube: a square frame on top with skirts that cover the side panels' top edges, so every face is framed on all four sides. The top panel sits in a recess underneath. |

Assembly: slide the 4 side panels down into the corner grooves until they seat
in the bottom groove → add a light
source (cable through the floor hole) → lay the top panel on the side panels →
press the lid onto the posts, trapping the top panel.

The lid attaches in one of two ways (sidebar → Lid):

- **Press-fit** (fully printed): pegs under the lid press into holes in the
  posts. Peg depth and clearance are adjustable.
- **Magnets**: glue a disc magnet (default 6×3 mm) into each post top and
  each lid corner.

## Tech stack

- **Next.js (App Router, TypeScript)** — static-exportable SPA (`output: 'export'`).
- **Three.js** + **react-three-fiber** + **drei** — declarative 3D preview.
- **manifold-3d** (WASM) — watertight boolean ops for grooves, peg/magnet holes and cable holes.
- **zustand** — image slots + parametric state.
- **jszip** + **file-saver** — bundle the STLs into one download.

## Develop

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # unit + geometry tests (vitest)
npm run build   # static export to ./out
```

## Project layout

```
app/                     Next.js pages + global styles
components/               UI: uploader, params, 3D viewer, export
lib/
  image/                 image -> grayscale heightmap
  geometry/              panel / frame / base mesh generation + layout + CSG
  export/                STL + zip export
```

## Parameters

Cube size, post size, panel thickness, lithophane min/max thickness, groove
clearance, lid attachment (press-fit pegs or magnets), relief direction,
brightness invert, and cable-hole diameter are all adjustable live in the
sidebar. Combinations that would produce unprintable or colliding parts are
flagged there.

## Printing

See **[PRINTING.md](PRINTING.md)**. It covers a short printer tune-up, the fit
test pieces (groove and peg clearance), lithophane slicer settings with a
brightness test, and assembly.

## Testing

`npm test` builds the full cube for 150 random parameter combinations and
checks that every part is a single valid solid, nothing overlaps, the side
panels slide in and the lid lowers on cleanly. Run a deeper sweep before a
release with `GEOMETRY_SAMPLES=3000 npm test`.

## Contributing

Issues and pull requests are welcome, whether it's a bug, a fit that didn't
work on your printer (include your clearances and printer/material), or a new
feature. Run `npm test` before opening a PR; it builds the cube across random
parameter combinations and catches most geometry regressions.

## License

[MIT](LICENSE)
