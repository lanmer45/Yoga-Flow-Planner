---
name: Flow Planner API + codegen flow
description: How poses/routines API and the generated client work in the flow-planner monorepo
---

# Flow Planner API & client codegen

- API contract lives in `lib/api-spec/openapi.yaml`. After editing paths/schemas, run
  `pnpm --filter @workspace/api-spec run codegen` to regenerate the react-query hooks
  (`@workspace/api-client-react`) and zod schemas (`@workspace/api-zod`). Codegen also runs `typecheck:libs`.
- Express routes are per-resource under `artifacts/api-server/src/routes/`. Restart the
  `artifacts/api-server: API Server` workflow after adding a route so the new endpoint loads.
- Poses support GET, POST, and PUT `/poses/{id}` (update). `PUT` reuses the `PoseInput` schema
  (full replace) and does NOT touch `isCustom`, so editing a built-in (library) pose keeps
  `isCustom: false` and the edit applies globally wherever that pose is used. **Why:** user
  wanted editable pose fields to reduce AI requests; global edits of built-ins are intended.
- Builder pose dialog is shared for create+edit, keyed by `editingPoseId` state. The pose-bank
  row's Edit button uses `stopPropagation` so it doesn't also add the pose to a section.
