# submitly — Package Plan

Extract `src/lib/forms` from tona-dashboard into a standalone, framework-agnostic package for **React + Vite** and **Next.js** users.

> **2026-10-24: pivoted to headless; shadcn registry removed.** `submitly` ships no UI components; the `labels` provider option and `CrudLabels` type were dropped with them. Sections below reflect the headless scope.

> Name: **submitly** — free on npm (incl. `submit-ly`) as of 2026-10-24. Still check GitHub, the domain, and reserve the `@submitly` npm org.

---

## 1. Positioning

**One line:** headless form submission for React and Next.js — Standard Schema validation, typed actions, server errors mapped to fields, pending and dialog locks, and post-mutation refresh. Works with any UI.

**Not** another form library. It sits on top of `react-hook-form` and adds the submission layer that existing tools leave to the app:

| Concern | react-hook-form | next-safe-action / zsa | TanStack Query | **This kit** |
| --- | --- | --- | --- | --- |
| Field state + validation | ✅ | — | — | uses RHF |
| Typed server action | — | ✅ | — | optional `/next` helper |
| Mutation state | — | ✅ | ✅ | ✅ |
| Headless dialog hook that remounts form on open | — | — | — | ✅ (`useControllableDialog`) |
| Dialog locked while saving | — | — | — | ✅ (automatic, any dialog library) |
| Non-form mutation (delete, toggle) + redirect | — | — | — | ✅ (`useCrudAction`) |
| Server errors → fields + `serverErrors` list | partial | partial | — | ✅ |
| Toast + refresh conventions | — | — | partial | ✅ (pluggable) |

### Goals
- Works in Next.js (App Router, server actions) **and** plain React (Vite, React Router, TanStack Router).
- Zero opinions about transport: an action is any `(input) => Promise<result>`.
- Zero i18n and zero UI: the package renders nothing; every visible string is the developer's own.
- Zero toast/router/loader lock-in: injected through a provider.
- Any schema library via Standard Schema (Zod 3.24+, Zod 4, Valibot, ArkType).
- Any UI: plain elements, shadcn, Radix, Base UI, Headless UI, native `<dialog>`.

### Non-goals (v1)
- Localization, API client, auth, token refresh.
- UI components of any kind (dialogs, fields, buttons, error panels): bring your own.
- Data tables, filters, file upload, rich text.
- No-JS progressive enhancement (`<form action>` + `useActionState`) — revisit post-1.0.
- Multi-step wizards.

---

## 2. Distribution model

A single channel: the **npm package**.

| Part | Channel | Why |
| --- | --- | --- |
| Hooks, provider, headless dialog helpers, types, `runAction` | **npm package** (`submitly`) | Logic users should upgrade, not fork. |

UI is out of scope: bring your own components. The package renders nothing, so it works with plain elements or any component library.

---

## 3. Repository layout

pnpm workspaces + Turborepo.

```
submitly/
├─ packages/
│  └─ submitly/                 # the npm package
│     ├─ src/
│     │  ├─ core/               # types, normalize, errors — no React
│     │  ├─ react/              # provider, hooks, dialog-lock context ("use client")
│     │  └─ next/               # runAction + Next preset
│     └─ package.json           # exports: ".", "./next", "./next/server"
├─ apps/
│  └─ docs/                     # Next.js docs site
├─ examples/
│  ├─ next-app/                 # server actions + revalidatePath
│  └─ vite-app/                 # fetch + React Router + TanStack Query
└─ .changeset/
```

### Package entry points

| Import | Contents | Runtime |
| --- | --- | --- |
| `submitly` | `CrudProvider`, `useCrudForm`, `useCrudAction`, `useControllableDialog`, dialog lock hooks, types | client (`"use client"` preserved) |
| `submitly/next` | `NextCrudProvider` (router.refresh + router.push preset) | client |
| `submitly/next/server` | `runAction` | server (`import "server-only"`) |

---

## 4. Public API design

### 4.1 Result contract

```ts
type ActionResult<TData = unknown> = {
  success: boolean;
  message?: string;                         // shown in toast if present
  data?: TData;
  errors?: string[];                        // form-level errors → serverErrors
  fieldErrors?: Record<string, string[]>;   // NEW → form.setError per field
  statusCode?: number;                      // now optional (Vite users rarely have one)
};
```

Apps whose API returns another shape plug in a mapper instead of reshaping every action:

```ts
normalize?: (raw: unknown) => ActionResult;      // successful return values
mapError?: (error: unknown) => ActionResult;     // thrown errors (network, 500, axios)
```

### 4.2 Provider (all optional, sensible no-op defaults)

```tsx
<CrudProvider
  notify={{
    success: (result) => toast.success(result.message),
    error: (result) => toast.error(result.message),
  }}
  onMutated={() => queryClient.invalidateQueries()}   // Next preset: router.refresh()
  navigate={(to) => navigate(to)}                     // Next preset: router.push(to)
  normalize={fromMyApi}
  mapError={fromAxiosError}
>
```

Resolution order everywhere: **per-call option → provider → built-in default**.

The package has no visible strings of its own. Multi-language apps localize messages in their own components and in `runAction`'s `messages` option; the package never imports an i18n library.

### 4.3 `useCrudForm`

```ts
const { form, onSubmit, serverErrors, clearServerErrors, isSubmitting } = useCrudForm({
  schema,                      // any Standard Schema
  defaultValues,
  action: (values) => saveProduct(values),
  onSuccess, onError,
  resetOnSuccess: true,
  redirectTo,                  // uses provider.navigate
  notify,                      // false | partial override
});
```

Behaviour:
1. Validate on the client via `standardSchemaResolver`.
2. Call `action`; `normalize` the result; `mapError` on throw (**fixes review issue #3**).
3. On success: notify → `onMutated` → reset → `onSuccess` → `redirectTo`.
4. On failure: notify, set `serverErrors`, apply `fieldErrors` with `form.setError`.
5. Locks the nearest dialog scope (`DialogLockProvider`) while submitting, automatically (**fixes the dead `isPending` prop**).

### 4.4 `useCrudAction` (renamed from `useConfirmAction`)

General non-form mutation: delete, toggle, bulk actions.

```ts
const { execute, isPending, serverErrors, clearServerErrors } = useCrudAction({ action, onSuccess, redirectTo, notify });
```

- try/catch with `mapError` (**fixes #3**).
- In-flight guard via ref: double clicks never fire twice.
- `execute` identity stable (latest-ref pattern) — the current version re-creates it every render because the router wrapper returns a new object.

### 4.5 Headless dialog helpers

No dialog component ships. Three small, library-agnostic helpers work with any dialog (Radix, Base UI, Headless UI, native `<dialog>`):

**`useControllableDialog({ open, defaultOpen, onOpenChange, locked })`**
- Returns `{ open, setOpen, openKey, isControlled }`.
- `openKey` bumps on every false→true `open` transition — including **controlled** opens, which today don't remount. Use it as the `key` of the form.
- While `locked` (boolean or `() => boolean`), every open-state change is ignored.

**`useDialogLockScope()` + `DialogLockProvider`**
- The dialog owner calls `useDialogLockScope()` and wraps its content in `<DialogLockProvider scope={scope}>`. The inner `useCrudForm` / `useCrudAction` lock close / escape / overlay automatically while pending. Pass `isLocked` to `useControllableDialog`'s `locked`.

**`useDialogLock(locked)` / `useDialogLockHandle()`**
- Manual lock for custom pending states. No-ops outside a dialog.

### 4.6 `runAction` (`/next/server`)

```ts
export async function saveProduct(input: unknown) {
  return runAction({
    schema,
    input,
    handler: (data) => api.products.save(data),
    revalidate: { paths: ["/products"], tags: ["products"] },   // or (data) => ({ … })
    messages: { validation: "Validation failed", unexpected: "Unexpected error" },
  });
}
```

- Re-throws Next control-flow errors (`redirect`, `notFound`, auth interrupts) via `unstable_rethrow` (**fixes review issue #1**).
- Validation failures return `fieldErrors` keyed by path, not just a flat list.
- `messages` overridable (**fixes #2** without adding i18n).
- `handler` may return anything; passed through `normalize` if provided.
- Verify `revalidatePath` / `revalidateTag` signatures against the installed Next 16 docs before implementing.
- Option to skip the client `router.refresh()` when the action already revalidated (removes the double refresh).

---

## 5. Compatibility matrix

| Dependency | Range | Notes |
| --- | --- | --- |
| `react` | `>=18.2` | `useId`, `useSyncExternalStore` |
| `react-hook-form` | `^7.55` | peer |
| `@hookform/resolvers` | `^5` | `standardSchemaResolver` |
| Schema libs | Zod 3.24+, Zod 4, Valibot 1, ArkType 2 | via Standard Schema, no direct dependency |
| `next` | `>=15` | optional peer, only for `/next*` entries |

ESM-only output, `"sideEffects": false`, `"use client"` banners preserved per file (tsdown, or tsup + a directives plugin).

---

## 6. Migration from the current kit

| Current (tona-dashboard) | Package |
| --- | --- |
| `next/navigation` `useRouter` in hooks | `provider.onMutated` / `provider.navigate` |
| `useRouterWithTopLoader` | removed (app wires the loader inside `navigate`) |
| `sonner` imports | `provider.notify` |
| `useTranslations("Crud")` | the app's own components; `runAction` `messages` |
| `ApiResponse` import in `runAction` | generic `ActionResult` + `normalize` |
| `z.ZodType<…, z.ZodTypeDef, …>` | Standard Schema generics |
| `useConfirmAction` | `useCrudAction` |
| `optionalString` (zod-only) | docs recipe, or `submitly/zod` sub-entry later |

The dashboard becomes the first consumer: replace `src/lib/forms` with the package plus a `CrudProvider` wired to `next-intl`, `sonner` and `nextjs-toploader`.

---

## 7. Quality bar

**Tests (Vitest + Testing Library + happy-dom)**
- Hooks: success / failure / throw / double-submit / fieldErrors / reset / redirect / notify override / `notify: false`.
- Dialog helpers: remount on uncontrolled and controlled open; lock while pending; a confirm flow built on `useCrudAction` closes on success only.
- `runAction`: validation, handler error, redirect re-thrown, revalidate called only on success.
- Schema matrix: same suite against Zod 3, Zod 4, Valibot.
- Type tests (`expectTypeOf`): inferred values/output types, `TData` flows to `onSuccess`.

**E2E (Playwright)** against `examples/next-app` and `examples/vite-app`: add → edit → delete happy path, server error, session-expiry redirect.

**CI (GitHub Actions):** lint · typecheck · test · build · `publint` · `@arethetypeswrong/cli` · `size-limit` (budget: core < 4 kB gzip).

**Release:** Changesets, semver, `0.x` until the API settles, provenance-signed npm publishes.

---

## 8. Documentation

Docs site in `apps/docs` (Fumadocs or Nextra).

1. Introduction & comparison table (section 1).
2. Install — npm.
3. Quick start — Next.js.
4. Quick start — Vite + React Router + TanStack Query.
5. Concepts: result contract, provider, resolution order, dialog lock.
6. Recipes: add/edit/delete entity (ported from `crud-setup.md`), single shared edit dialog for tables, bulk delete, detail page with redirect, full-page form, i18n with next-intl / react-i18next, axios `mapError`, custom API shape `normalize`.
7. API reference (generated from TSDoc).
8. Migration from the tona-dashboard kit.

---

## 9. Phases

| # | Phase | Deliverables | Exit criteria |
| --- | --- | --- | --- |
| 0 | Decisions & scaffold | MIT license, monorepo, tooling, CI skeleton | `pnpm build` + CI green on an empty package |
| 1 | Core extraction | `core/` + `react/`: types, provider, `useCrudForm`, `useCrudAction`, `useControllableDialog`, dialog lock; all review fixes | Unit + type tests pass; no `next`, `sonner`, `next-intl` imports in `react/` |
| 2 | Next adapter | `/next` provider preset, `/next/server` `runAction` | Redirect re-throw test passes; Next example works |
| 3 | ~~UI registry~~ | removed (headless pivot) | — |
| 4 | Examples & E2E | `next-app`, `vite-app`, Playwright suites | E2E green in CI |
| 5 | Docs | Site with sections 1–8 | Every public export documented; both quick starts copy-paste runnable |
| 6 | Dogfood | tona-dashboard switched to the package | Dashboard CRUD + login unchanged in behaviour |
| 7 | Release | `0.1.0` on npm, announce | publint / attw clean; size budget met |
| 8 | Toward 1.0 | Feedback, API freeze, optional `useActionState` support | Two external projects using it without forking hooks |

Phase 2 follows Phase 1.

---

## 10. Open decisions

1. ~~**Name**~~ — decided: `submitly`.
2. **React 18 support** — costs little now; drop it if it blocks anything.
3. ~~**Ship UI?**~~ — decided: no UI shipped. The package is headless and UI-agnostic; the shadcn registry was removed.
4. **`fieldErrors` key format** — dotted paths (`items.0.name`) to match RHF.
5. **Default `notify`** — no-op (recommended) vs `console`.
6. **Keep `statusCode` in the contract?** Optional for now; drop it in 1.0 if nobody uses it.

---

## 11. Risks

| Risk | Mitigation |
| --- | --- |
| Overlap with next-safe-action | Position on the submission layer (forms, dialog locks, result contract); document using both together (their action, our hooks). |
| `"use client"` stripped by bundler | Build check that greps output for directives; test import from a Server Component in the Next example. |
| Standard Schema typing gaps for transforms | Type tests on Zod `transform` / `pipe` (e.g. `optionalString`) in Phase 1. |
| Scope creep (UI components, tables, uploads, i18n) | Non-goals list above; separate packages later if wanted. |

