---
name: Playwright E2E on this NixOS project
description: How to run committed Playwright tests in the flow-planner artifact on Replit/NixOS
---

# Running Playwright E2E tests here

The Playwright-downloaded browser will NOT launch on this NixOS container:
it fails with `libglib-2.0.so.0: cannot open shared object file`.

**Fix:** install a Nix-native chromium (`installSystemDependencies(["chromium"])`)
and point Playwright at it via `launchOptions.executablePath`. The
flow-planner `playwright.config.ts` auto-detects it with `which chromium`
(override via `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`).

**How to apply:** run `pnpm --filter @workspace/flow-planner run test:e2e`.
Tests hit the running app via `http://localhost:80` (path-based proxy;
flow-planner is at "/"). Servers must be running. The dev DB is shared and
not reset, so generate unique routine titles per run.
