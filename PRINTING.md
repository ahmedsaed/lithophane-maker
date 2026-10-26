# Printing Guide

A lithophane cube takes most of a day to print, so this guide front-loads the
cheap checks. Each step takes minutes to an hour and tells you a setting to
use. By the time you print the full cube, every fit and image setting has
already been checked on **your** printer, filament and slicer.

| Step | What you print | What you learn |
|------|----------------|----------------|
| [1. Tune your printer](#1-tune-your-printer) | Your slicer's calibration tests | Flow and first layer are right, so parts come out the size they should |
| [2. Check the fits](#2-check-the-fits) | Small pieces cut from the real parts | **Groove clearance** and **Peg clearance** |
| [3. Tune the lithophane](#3-tune-the-lithophane) | A 10-step brightness strip | **Min / Max thickness** and **Gamma** |
| [4. Print the cube](#4-print-the-cube) | Everything | A finished lamp |

Use the **same printer, nozzle, filament and slicer profile** throughout. The
results don't transfer between filaments or printers.

All test pieces come from the app: **Export → Test kit** and **Export →
Clearance sweep**. Each zip includes a short README. The pieces are already
oriented for printing. Import them as they are, with no supports.

> **Orca Slicer on Linux (Flatpak):** open files with **File → Import**
> (Ctrl+I) rather than double-clicking them, or Orca may report "The file does
> not contain any geometry data".

---

## 1. Tune your printer

The fit tests in step 2 absorb most printer differences, but they can't fix a
printer that's over-extruding one day and under-extruding the next. Spend a few
minutes on the basics first:

1. **Flow rate.** Over-extrusion makes grooves and holes tight; under-extrusion
   makes parts weak. In Orca Slicer: **Calibration → Flow rate**. Other
   slicers have an equivalent test.
2. **First layer.** The panels' flat backs and the frame's floor print on the
   bed. You want a clean first layer that isn't squashed into a lip.
3. **Elephant foot.** If the bottom layer bulges outward, the panels won't drop
   all the way into the bottom groove. Turn on your slicer's elephant foot
   compensation (Orca: **Quality → Precision → Elephant foot compensation**,
   around 0.1–0.15 mm).

Leave hole and contour (X-Y) compensation at 0 for now. Step 2 measures what
your printer needs, and the app applies it as clearance.

---

## 2. Check the fits

Two settings depend on your printer: how loosely a panel slides into its
groove, and how firmly the lid's pegs grip the posts. The **Clearance sweep**
prints each fit at five sizes side by side, so one print tells you the right
number.

### Slicer settings for test pieces

| Pieces | Layer height | Walls | Infill |
|--------|--------------|-------|--------|
| Groove posts, post top, lid corners (frame-like) | Your normal frame setting, e.g. 0.2 mm | 3 | 15–20 % |
| Panel strip (panel-like) | Your lithophane setting, see [step 3](#lithophane-slicer-settings) | | 100 % |

Print the panel strip the same way you'll print real panels. The grooves need
to fit a real panel, not a frame-quality one.

### Panel fit (Groove clearance)

**Print:** `groove-post-*` ×5 and `panel-strip`.

The five posts differ only in groove width. Count the engraved dots on the floor:

| Dots | 1 | 2 | 3 | 4 | 5 |
|------|---|---|---|---|---|
| Groove clearance | 0.15 mm | 0.20 mm | 0.25 mm | 0.30 mm | 0.35 mm |

**Test:** stand the strip on its short edge and slide its long flat edge down
into each post's grooves until it seats in the bottom groove. Try both grooves
on each post.

- **Good:** it slides in by hand with light friction, stands upright on its
  own and barely wobbles.
- **Too tight:** it needs force or stops before the bottom.
- **Too loose:** it drops in and rattles.

**Set:** **Panel → Groove clearance** to the tightest post that passes.

### Lid fit (Peg clearance), press-fit lids

**Print:** `lid-corner-peg-*` ×5 and `post-top`. The lid corners print
face-down with the peg pointing up, and the dots are on top.

| Dots | 1 | 2 | 3 | 4 | 5 |
|------|---|---|---|---|---|
| Peg clearance | 0.00 mm | 0.05 mm | 0.10 mm | 0.15 mm | 0.20 mm |

**Test:** press each peg into the post top's hole.

- **Good:** it goes all the way in with firm thumb pressure, and the post
  stays attached when you lift it by the lid corner.
- **Too tight:** it won't seat fully, or the peg cracks.
- **Too loose:** it falls out when lifted.

Insert and remove your favourite three or four times. You'll open the lid to
reach the light, so it has to keep gripping.

**Set:** **Lid → Peg clearance** to that one. If even the tightest is loose,
raise **Peg depth**.

### Magnet fit, magnet lids

**Print:** the `post-top` and `lid-corner` from the **Test kit** with
**Lid → Attach with: Magnets** selected, and get your magnets (6×3 mm by default).

**Test:** press a magnet into each hole.

- **Good:** it goes in snugly and sits flush or slightly below the surface.
  Add a drop of glue in the final build.
- **Doesn't fit:** check the **Magnet diameter / height** settings match your
  magnets.

When gluing, **check every pair attracts before the glue sets.** A flipped
magnet repels the lid.

---

## 3. Tune the lithophane

The image comes from light passing through plastic of varying thickness, so
the right thickness range depends on your filament and your light source.

### Lithophane slicer settings

Use these for every panel and for the brightness strip:

| Setting | Value | Why |
|---------|-------|-----|
| Filament | Plain white PLA | Colours and silk finishes tint or scatter the light |
| Layer height | 0.08–0.12 mm | Thinner layers give smoother shading |
| Infill | **100 %** | Any infill pattern shows through as a grid when lit |
| Outer wall speed | Slow, e.g. ≤ 50 mm/s | Ringing and wobble show up when backlit |
| Ironing | Off | Flattens the relief |
| Orientation | As exported: flat back down, relief up | The app already does this |
| Supports / brim | None | |

### Brightness test

**Print:** `litho-steps` from the **Test kit** with the settings above.

**Test:** in a dim room, hold it in front of **the light you'll use in the
cube**. It shows 10 steps from black to white.

| What you see | Change |
|--------------|--------|
| All 10 steps look different | Nothing, you're set |
| The darkest steps merge into one block | Lower **Max thickness (dark)** |
| The brightest steps merge into one glow | Raise **Min thickness (bright)** |
| Everything looks too dark or too washed out | Adjust **Gamma**: lower for deeper shadows, higher for brighter overall |

Max thickness can't exceed **Panel thickness**. The app warns you if it does.

### Choosing a light

- **Diffuse beats bright.** A single bare LED shows up as a hot spot in the
  middle of every panel. A frosted bulb or an LED puck light spreads evenly.
- **Warm white** (around 2700–3000 K) gives lithophanes their classic look.
- **Centre it** in the cube so all five panels get equal light. The cable hole
  in the floor is for routing its power lead.

---

## 4. Print the cube

With the clearances and thicknesses set, export with **Download all (.zip)**.
Empty image slots become plain panels (`*-blank.stl`), which glow evenly and
print faster. They're handy for a first test assembly.

| Part | Profile | Notes |
|------|---------|-------|
| `frame.stl` | Frame: 0.2 mm, 3 walls, 15–20 % | Floor down, as exported |
| `lid.stl` | Frame | Exported face-down, with the pegs or magnet holes pointing up |
| `side-*.stl`, `top.stl` | Lithophane, see [step 3](#lithophane-slicer-settings) | Flat back down, relief up |

**Assembly**

1. Slide each side panel down the corner grooves until it seats in the bottom
   groove. Each file is named for its side, so match them up.
2. Place the light inside and route its cable through the floor hole.
3. Lay the top panel on the side panels, with its notched corners over the posts.
4. Press the lid down onto the posts. It traps the top panel.

---

## Troubleshooting

| Problem | Likely cause | Fix |
|---------|--------------|-----|
| Panel won't reach the bottom groove | Elephant foot on the panel or frame | Turn on elephant foot compensation (step 1) |
| Panels fit the test piece but not the real frame | Different layer height or profile than the test | Print the test pieces with the same profiles as the real parts |
| Lid falls off | Peg clearance too high | Lower **Peg clearance** or raise **Peg depth** |
| Lid pegs snapped | Peg clearance too low | Raise **Peg clearance** |
| Grid pattern visible in the image | Infill below 100 % | Set infill to 100 % |
| Bright spot in the middle of each panel | Small bare light source | Use a diffuse bulb or puck light |
| Image looks flat or muddy | Thickness range too narrow | Re-run the brightness test (step 3) |

---

## Share your results

This project is in beta, and printer reports are the most useful contribution.
If you run the tests, please
[open an issue](https://github.com/ahmedsaed/lithophane-maker/issues/new) with
your printer, nozzle, filament, the clearances that worked and a photo of the
result. It helps set better defaults for everyone.
