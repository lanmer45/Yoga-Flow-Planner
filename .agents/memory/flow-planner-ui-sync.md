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
- The Runner (`pages/runner.tsx`) has two full return branches — dark ("Still Water")
  and light ("Warm Studio"). They share the `TopBar`/`Safety`/`Controls`/`Caption`
  fragments, but the middle content (pose card sizes, name/heading sizes) is duplicated
  per branch. Any layout change to the middle must be made in both branches.

**Why:** These duplications are easy to miss — a change that works in one theme/dialog
can look broken in the other, and a snapshot dirty-check that omits a field breaks
unsaved-changes detection.

**How to apply:** When touching a pose field or Runner middle-content layout, grep for
the symbol in both files and edit both; then verify light AND dark, and both dialogs.
