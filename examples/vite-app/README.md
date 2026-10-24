# vite-app example: forms & actions playground

The same playground as [`next-app`](../next-app), on React + Vite + React Router
+ TanStack Query, with a REST-style client instead of server actions. Plain HTML
and CSS only, since the package renders nothing.

```bash
pnpm build                              # builds submitly first
pnpm --filter example-vite-app dev      # http://localhost:5173
# or, the production build:
pnpm --filter example-vite-app build
pnpm --filter example-vite-app preview  # http://localhost:4173
```

## What's on the page

| Area | Exercises |
| --- | --- |
| **Create product** | `useCrudForm` with Zod: client validation, server re-validation (422), server field errors (duplicate name → 409), reset on success |
| **Products** | **Edit** opens a native `<dialog>` wired with `useControllableDialog` + `useDialogLockScope` + `DialogLockProvider` (remounts on open, locked while saving). **Delete** uses `useCrudAction` with an inline confirm |
| **Scenarios** | API latency (off / 600 ms / 2 s) to see pending states and the dialog lock; an endpoint that answers 500; an endpoint that answers 401 (→ `/login`); reset data |
| **Event log** | The provider's `notify`, `onMutated`, `navigate` and the hooks' `onSuccess` / `onError`, in firing order |

## The adapter story

The backend is fake (`src/lib/fake-server.ts`: routes, status codes, JSON
bodies, latency, in memory) and the client (`src/lib/api.ts`) behaves like a
typical REST client. It **does not return `ActionResult`**: successful calls
resolve to the response body (`{ data, message }` for mutations) and failures
throw an `ApiError { status, message, fieldErrors? }`.
`src/lib/crud-adapter.ts` holds the only glue, passed to `CrudProvider`:

- `normalize` turns a `{ data, message }` body into `{ success: true, data, message }`
  (anything else falls through to `defaultNormalize`).
- `mapError` turns an `ApiError` into a failed result: `fieldErrors` go to the
  form fields, other errors to `errors` (the error panel), `status` to `statusCode`.

So the actions stay one-liners: `action: (values) => api.createProduct(values)`.

## Provider wiring (`src/providers.tsx`)

| Provider prop | Wired to |
| --- | --- |
| `notify` | the app's own toast + the event log |
| `onError` | sends a `401` to `/login` (see below) |
| `onMutated` | `queryClient.invalidateQueries()` (products and settings refetch) |
| `navigate` | React Router's `navigate` (also logged) |
| `normalize` / `mapError` | `src/lib/crud-adapter.ts` |

### Expired session → `/login`

The `401` endpoint throws `ApiError(401)` and `mapError` makes it a failed result
with `statusCode: 401`. The provider's `onError` runs for every failed action in
the app (after `notify.error`, before any per-call `onError`), so one check there
navigates to `/login` for all of them. `notify.error` only skips the toast for
that status, since the page change is the feedback.

Why not the alternatives in the package's API?

- `redirectTo` only runs after a **success**.
- `isInterrupt` makes the hooks stop silently, but it is a predicate: it must not
  navigate itself, so something else would still have to. It fits errors that a
  framework already handles (Next's `redirect()`), which is what `next-app` does.
- A per-call `onError` would have to be repeated on every form and action. The
  provider-level `onError` is the cross-cutting hook.

## Notes

- Data lives in the browser's memory (module state), so a reload restores the
  sample data. Only mutations are delayed by the latency setting; reads answer
  immediately so the table does not flicker after every save.
- Pressing Escape twice closes a native modal `<dialog>` in Chrome even when
  `cancel` was prevented. `src/ui/dialog.tsx` therefore re-opens the dialog from
  its `close` event while the lock is held.
- End-to-end tests for this app and `next-app` live in [`/e2e`](../../e2e).
