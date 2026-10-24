---
"submitly": minor
---

New `submitly/core` entry point with the pure helpers (`isActionResult`, `defaultNormalize`, `defaultMapError`, `issuesToErrors`, `getDotPath`, `validate`) and all types. It carries no `"use client"` directive and imports no React, so Server Components, server actions and route handlers can use it. The root `submitly` entry still re-exports everything.

New provider-level `onError` on `CrudProvider` / `NextCrudProvider` (and `CrudConfig`): called for every non-interrupt failure from `useCrudForm` and `useCrudAction`, after `notify.error` and before the per-call `onError`. Nested providers override it like the other props.

Docs now state the "never rejects" guarantee precisely: the action's own errors and failures never reject, but errors thrown by your own callbacks (`onSuccess`, `onError`, `notify` handlers, `onMutated`, `navigate`) propagate. `createRunAction` documents that the configured `runAction` must live in a regular server-only module, not a `"use server"` file.
