# Lithophane Cube Maker

A fully client-side web tool that turns **5 images** (4 sides + 1 top) into a
3D-printable, backlit **lithophane cube**. Everything — image processing, mesh
generation, 3D preview and STL export — runs in the browser. No backend.

A lithophane encodes an image as varying material thickness: dark pixels print
thicker (block more light), light pixels print thinner. Backlit, the image
appears.

## The 6 printable parts

| Part        | Description |
|-------------|-------------|
| `frame`     | Corner posts, integrated solid floor, and vertical grooves for the side panels. Cable/USB hole(s) in the floor for a light source. |
| `side-*` ×4 | Side lithophane panels with a flat tongue border that rides in the grooves. Each carries a top rail that forms the lid ledge. |
| `top`       | Lid lithophane panel that drops onto the ledge formed by the four side rails. |

Assembly: slide the 4 side panels down into the corner grooves → drop the top
lid onto the rail ledge → add a light source through the cable hole.

> **Future idea (postponed):** a detachable snap-fit base plate with cantilever
> hooks, replacing the integrated floor, so the light source can be swapped
> without disassembling the panels.

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
