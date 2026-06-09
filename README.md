# Lithophane Cube Maker

A fully client-side web tool that turns **5 images** (4 sides + 1 top) into a
3D-printable, backlit **lithophane cube**. Everything — image processing, mesh
generation, 3D preview and STL export — runs in the browser. No backend.

A lithophane encodes an image as varying material thickness: dark pixels print
thicker (block more light), light pixels print thinner. Backlit, the image
appears.

## The 7 printable parts

| Part        | Description |
|-------------|-------------|
| `frame`     | Corner posts + top rails with vertical grooves (side panels) and a top groove (lid). |
| `side-*` ×4 | Side lithophane panels with a flat tongue border that rides in the grooves. |
| `top`       | Lid lithophane panel that slides into the top groove. |
| `base`      | Snap-fit base plate with cantilever hooks and cable/USB hole(s) for a light. |

Assembly: slide the 4 side panels down into the corner grooves → slide the top
panel into the top groove → add a light source → clip the base on the bottom.

## Tech stack

- **Next.js (App Router, TypeScript)** — static-exportable SPA (`output: 'export'`).
- **Three.js** + **react-three-fiber** + **drei** — declarative 3D preview.
- **three-bvh-csg** — boolean ops for grooves, hook pockets and cable holes.
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
clearance, relief direction (inward/outward), brightness invert, and cable-hole
diameter are all adjustable live in the sidebar.

## Printing tips

- Print panels **flat, relief side up**, at a fine layer height (0.08–0.12 mm).
- If panels fit too tight/loose, adjust **groove clearance** and re-export.
- Snap-fit hook strength may need tuning to your printer/material.
