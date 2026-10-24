# submitly

## 0.1.0

Initial release.

- `useCrudForm`: react-hook-form + Standard Schema validation (Zod 3/4, Valibot, ArkType, ...) + your action in one hook. Server `fieldErrors` (dotted paths) are applied to the fields, form-level errors are exposed as `serverErrors`, double submits are ignored, and the form resets on success.
- `useCrudAction`: the same conventions for non-form mutations (delete, toggle, bulk). Stable `execute`, de-duplicated while in flight.
- `CrudProvider`: plug in your own `notify`, `onMutated`, `navigate`, `normalize`, `mapError`, `isInterrupt` and `onError`. Per-call options override the provider; nested providers override per prop.
- Headless dialog helpers: `useControllableDialog`, `useDialogLockScope`, `DialogLockProvider`, `useDialogLock`, `useDialogLockHandle`. The dialog stays open while a save is in flight.
- `submitly/core`: server-safe helpers and types (`ActionResult`, `isActionResult`, `defaultNormalize`, `defaultMapError`, `issuesToErrors`, `getDotPath`, `validate`).
- `submitly/next`: `NextCrudProvider` (`router.refresh` / `router.push` preset; `redirect()`, `notFound()` and friends from server actions are treated as interrupts) and `isNextInterrupt`.
- `submitly/next/server`: `runAction` (validate, run, normalize, revalidate on success, map thrown errors to a 500 result) and `createRunAction` for app-wide defaults.
- Built-in Standard Schema resolver: no `@hookform/resolvers` peer needed.
- ESM only, `"sideEffects": false`, about 3 kB gzipped. Peers: `react >=18.2`, `react-hook-form ^7.55`, `next >=15` (optional).
