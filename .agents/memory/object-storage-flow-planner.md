---
name: object storage in flow-planner
description: How file uploads (pose images) are wired end-to-end in this pnpm monorepo
---

- Uploads use the object-storage skill's presigned-URL flow. Server routes live in `artifacts/api-server/src/routes/storage.ts` (+ `lib/objectStorage.ts`, `lib/objectAcl.ts`), mounted in routes/index.ts.
- Web calls `/api/*` relative paths; api-server is proxied under the same origin (no setBaseUrl in web). So serving URL = `/api/storage${objectPath}`.
- Store the returned `objectPath` (e.g. `/objects/uploads/uuid`) in the DB, NOT the presigned/GCS URL. Build img src by prefixing `/api/storage`.
- Project uses React 19 (catalog), so Uppy v5's react>=19 peer is satisfied — do NOT add pnpm `$react` overrides (root has no direct react dep; `$react` override errors on install).
- Pose editor dialog is duplicated across poses.tsx and builder.tsx — see `flow-planner-ui-sync.md` for the keep-in-sync rule (including builder's JSON snapshot dirty-check).
