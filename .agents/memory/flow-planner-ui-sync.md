---
name: Flow Planner duplicated UI surfaces
description: Places in flow-planner where the same UI exists twice and must be edited in lockstep
---

Flow Planner renders several pieces of UI in two parallel places. Any change to a
shared field or shared layout element must be applied to BOTH, or they silently drift.

**Rule:**
- Pose editor dialog exists twice: `pages/poses.tsx` and `pages/builder.tsx`. Any pose
  field (add/edit/reset/save) must be mirrored in both. builder.tsx also keeps a JSON
  snapshot dirty-check in openCreatePose/openEditPose that must include new fields.
- The Runner (`pages/runner.tsx`) uses ONE shared layout (a single return) — a 100dvh
  three-zone flex column (top / middle / bottom), built from the `TopBar` / `Caption` /
  `Safety` / `Controls` / `Lightbox` fragments. Theme is switched purely via `--runner-*`
  CSS tokens in `index.css` (the top-bar toggle flips the `.dark` class); the JSX no
  longer branches on `isDark` for layout. So a layout change is made once — but any
  COLOR must be set in both the light AND dark `--runner-*` token blocks, and verified
  in both themes.

**Why:** These duplications are easy to miss — a change that works in one theme/dialog
can look broken in the other, and a snapshot dirty-check that omits a field breaks
unsaved-changes detection.

**How to apply:** When touching a pose field or Runner middle-content layout, grep for
the symbol in both files and edit both; then verify light AND dark, and both dialogs.
