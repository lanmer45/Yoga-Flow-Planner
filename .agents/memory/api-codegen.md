---
name: API codegen workflow
description: How to add or change an API endpoint in this pnpm monorepo (openapi -> generated zod + react-query clients + drizzle schema).
---

Adding an endpoint is a multi-step, codegen-driven flow. Do NOT hand-write zod schemas or client hooks.

**How to apply:**
1. Add the table in `lib/db/src/schema/<name>.ts` (drizzle), then export it from `lib/db/src/schema/index.ts`.
2. Add paths + component schemas in `lib/api-spec/openapi.yaml`.
3. Run `pnpm --filter @workspace/api-spec run codegen` — regenerates `@workspace/api-zod` (request/response zod like `CreateXBody`, `ListXResponse`) and `@workspace/api-client-react` hooks (`useListX`, `useCreateX`, `getListXQueryKey`).
4. Run `pnpm --filter @workspace/db run push` to apply schema to the DB.
5. Add an Express route in `artifacts/api-server/src/routes/<name>.ts` and register it in that dir's `index.ts`.

**Why:** The zod schemas and React Query hooks are generated artifacts; editing them by hand is overwritten on next codegen. The openapi.yaml title must stay "Api" (orval transformer assumption).

Nullable fields use `type: ["integer", "null"]` in openapi. Timestamps use `format: date-time` and surface as `string` in the generated TS client.
