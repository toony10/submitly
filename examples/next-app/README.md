# next-app example: forms & actions playground

A Next.js App Router app for testing `submitly` by hand. Plain HTML and CSS
only, since the package renders nothing.

```bash
pnpm build
pnpm --filter example-next-app start   # http://localhost:3000
```

## What's on the page

| Area | Exercises |
| --- | --- |
| **Create product** | `useCrudForm` with Zod: client validation, server re-validation in `runAction`, server field errors (duplicate name), reset on success |
| **Products** | **Edit** opens a native `<dialog>` wired with `useControllableDialog` + `useDialogLockScope` + `DialogLockProvider` (remounts on open, locked while saving). **Delete** uses `useCrudAction` with an inline confirm |
| **Scenarios** | Server latency (off / 600 ms / 2 s / 5 s) to see pending states and the dialog lock; a handler that throws (→ 500 result); a `redirect("/login")` interrupt; reset data |
| **Event log** | The provider's `notify`, `onMutated`, `navigate` and the hooks' `onSuccess` / `onError`, in firing order |

Wiring lives in `app/providers.tsx`: `NextCrudProvider` with toast + log
handlers. Functions can't be passed from a Server Component, so it is wrapped in
a client component. `app/login/page.tsx` imports `NextCrudProvider` directly into
a Server Component to check that the `"use client"` boundary survives the
build.

Data is kept in memory (`lib/store.ts`) and resets when the server restarts.

## Why `--webpack`

Inside this pnpm workspace, Turbopack (Next 16.4) intermittently fails to
resolve packages through pnpm's virtual-store symlinks (most recently
`Could not find the Next.js package (next/package.json)`), while
webpack and Node resolve them fine. A packed `submitly` tarball installed into a
standalone Next 16 app builds with Turbopack, so this only affects the workspace.
