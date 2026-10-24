# submitly

Headless form submission for React and Next.js: Standard Schema validation, typed actions, server errors mapped to fields, pending and dialog locks, and post-mutation refresh. It renders nothing, so it works with any UI: plain elements, shadcn, Radix, Base UI, Headless UI, native `<dialog>`.

> Pre-release (`0.x`). Requires TypeScript >= 5.4 for consumers.

## Install

```bash
npm i submitly react-hook-form
```

Peer dependencies: `react >=18.2`, `react-hook-form ^7.55`, and `next >=15` (optional, only for the `submitly/next*` entry points). Use any schema library that implements [Standard Schema](https://standardschema.dev) (Zod 3.24+ / 4, Valibot 1, ArkType 2, ...).

## Entry points

| Import | Contents |
| --- | --- |
| `submitly` | `CrudProvider`, `useCrudForm`, `useCrudAction`, `useControllableDialog`, dialog lock helpers (`useDialogLockScope`, `DialogLockProvider`, `useDialogLock`, `useDialogLockHandle`). A client module (`"use client"`). Also re-exports everything in `submitly/core` |
| `submitly/core` | `isActionResult`, `defaultNormalize`, `defaultMapError`, `issuesToErrors`, `getDotPath`, `validate`, and the types (`ActionResult`, `FieldErrorMap`, `Normalize`, `MapError`, `NotifyHandlers`, `InferResultData`). No `"use client"`, no React: import from Server Components, server actions and route handlers |
| `submitly/next` | `NextCrudProvider` (`router.refresh` / `router.push` preset, server-action redirects treated as interrupts), `isNextInterrupt` |
| `submitly/next/server` | `runAction`, `createRunAction` (server only) |

## Quick start

`useCrudForm` combines react-hook-form, schema validation and an action. Render it with plain elements:

```tsx
"use client";

import { useCrudForm } from "submitly";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  price: z.number().positive(),
});

export function ProductForm() {
  const { form, onSubmit, serverErrors, isSubmitting } = useCrudForm({
    schema,
    defaultValues: { name: "", price: 0 },
    action: async (values) => {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      return res.json(); // ideally an ActionResult, see below
    },
    onSuccess: (result) => console.log("saved", result.data),
  });

  const { errors } = form.formState;

  return (
    <form onSubmit={onSubmit} noValidate>
      {serverErrors.length > 0 && (
        <ul role="alert">
          {serverErrors.map((message, index) => (
            <li key={index}>{message}</li>
          ))}
        </ul>
      )}

      <label>
        Name
        <input {...form.register("name")} />
      </label>
      {errors.name && <p>{errors.name.message}</p>}

      <label>
        Price
        <input type="number" {...form.register("price", { valueAsNumber: true })} />
      </label>
      {errors.price && <p>{errors.price.message}</p>}

      <button type="submit" disabled={isSubmitting}>
        Save
      </button>
    </form>
  );
}
```

What happens on submit:

1. The schema validates the values (client side, through a built-in react-hook-form resolver for Standard Schema).
2. `action` receives the schema's parsed output. Its return value goes through `normalize`; a thrown error goes through `mapError`. The action's own errors and failures never reject the returned promise (see [What "never rejects" means](#what-never-rejects-means)).
3. On success: `notify.success` (when the result has a `message`), `onMutated`, form reset to `defaultValues` (`resetOnSuccess: false` to skip), `onSuccess`, then `redirectTo` via the provider's `navigate`.
4. On failure: `notify.error`, `serverErrors` is filled with `result.errors`, each `result.fieldErrors` entry is applied with `form.setError` (focusing the first), then the provider's `onError`, then the per-call `onError`.
5. Further submits are ignored while one is in flight.

Per-call options override the provider: `notify` (`false` or per-handler overrides), `onMutated` (`false` to skip), `normalize`, `mapError`, `lockDialog`.

`form` is the regular react-hook-form `UseFormReturn`; pass extra `useForm` options with `formOptions`.

## `useCrudAction`

For mutations that are not forms: delete, toggle, bulk actions. It has the same notify / refresh / redirect / error conventions.

```tsx
"use client";

import { useCrudAction } from "submitly";

export function DeleteButton({ id }: { id: number }) {
  const { execute, isPending, serverErrors } = useCrudAction({
    action: (productId: number) => deleteProduct(productId),
    notify: { success: (result) => console.log(result.message) }, // optional per-call override
  });

  return (
    <>
      <button type="button" disabled={isPending} onClick={() => execute(id)}>
        {isPending ? "Deleting..." : "Delete"}
      </button>
      {serverErrors.map((message, index) => (
        <p key={index} role="alert">
          {message}
        </p>
      ))}
    </>
  );
}
```

`execute` has a stable identity and returns the same promise while a call is in flight (double clicks fire once). The action's own errors and failures never reject it; errors thrown by your own callbacks do (see [What "never rejects" means](#what-never-rejects-means)).

## `CrudProvider`

All props are optional. The provider supplies what the hooks need and nothing else; the package depends on no toast library and no router. Wire your own:

```tsx
"use client";

import { CrudProvider } from "submitly";
import { toast } from "your-toast-library";
import { useRouter } from "your-router";

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <CrudProvider
      notify={{
        success: (result) => toast.success(result.message),
        error: (result) => toast.error(result.message),
      }}
      onMutated={() => router.refresh()} // refetch / invalidate queries / router.refresh()
      navigate={(to) => router.push(to)} // used by `redirectTo`
    >
      {children}
    </CrudProvider>
  );
}
```

| Prop | Purpose |
| --- | --- |
| `notify` | `{ success, error }` handlers, called with the `ActionResult` when it has a `message`. Merged per key with a parent provider. |
| `onMutated` | Called after every successful mutation. |
| `navigate` | Used for `redirectTo`. Default: `window.location.assign`. |
| `normalize` | Turns whatever an action returned into an `ActionResult`. Default: `ActionResult`-shaped values pass through, anything else becomes `{ success: true, data }`. |
| `mapError` | Turns a thrown error into an `ActionResult`. Default: a failed result carrying the error message. |
| `isInterrupt` | Identifies thrown values the framework is already handling (e.g. a Next.js `redirect()`); the hooks then stop silently. |
| `onError` | Called with the failed `ActionResult` for every non-interrupt failure from `useCrudForm` / `useCrudAction`, after `notify.error` and before the per-call `onError`. Default: no-op. Overrides a parent provider's `onError`. |

Resolution order everywhere: per-call option, then provider, then built-in default. The one exception is failure callbacks, which add up: the provider's `onError` runs first, then the per-call `onError`. Nested providers override their parent prop by prop. Use `normalize` and `mapError` to adapt an API with its own response shape (axios errors, `{ ok, error }` envelopes, ...) without reshaping each action.

### Failure handling in one place

Use the provider's `onError` for a reaction every failure should have, such as sending an expired session to a login page, instead of repeating a per-call `onError` on every form and button. It runs for returned `{ success: false }` results and mapped thrown errors alike, after `notify.error`, and never for interrupts:

```tsx
<CrudProvider
  notify={{
    // The navigation below is the feedback for a 401, so no error toast for it.
    error: (result) => {
      if (result.statusCode !== 401) toast.error(result.message);
    },
  }}
  onError={(result) => {
    if (result.statusCode === 401) router.push("/login");
  }}
>
  {children}
</CrudProvider>
```

Order on failure: `notify.error`, `serverErrors` / field errors, provider `onError`, per-call `onError`. Both `onError`s run; neither replaces the other.

### What "never rejects" means

The guarantee is about the action:

- **Never rejects:** a thrown error from the action (or `normalize`), a returned `{ success: false }`, a network failure, a 500. They all become an `ActionResult` and take the failure path, and `onSubmit` / `execute` resolve.
- **Does propagate:** an error thrown by your own code: the callbacks `onSuccess`, `onError` (per call or provider), `notify` handlers, `onMutated`, `navigate` or a `redirectTo` function, and also `mapError` (per call or provider; it runs for an action that throws) and `isInterrupt`. For `useCrudForm`, a schema whose own `validate()` throws (instead of returning issues) rejects `onSubmit` too, and the action is not called. submitly does not swallow them: `onSubmit` / `execute` reject with that error and the rest of the pipeline is skipped. The pending state and the dialog lock are still released.

So keep those callbacks safe, or catch inside them.

## Using with any dialog library

`useCrudForm` and `useCrudAction` lock the nearest dialog while pending, so it cannot be closed (escape, overlay click, close button) mid-save. The dialog helpers are library-agnostic; you connect them to your dialog's open-state API:

```tsx
"use client";

import {
  DialogLockProvider,
  useControllableDialog,
  useDialogLockScope,
} from "submitly";
// Any dialog with controlled `open` / `onOpenChange`: Radix, Base UI, Headless UI, ...
import { Dialog, DialogContent, DialogTrigger } from "your-dialog-library";

export function ProductDialog({
  open,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: (props: { formKey: number; onClose: () => void }) => React.ReactNode;
}) {
  const lock = useDialogLockScope();
  const dialog = useControllableDialog({
    open,
    onOpenChange,
    locked: lock.isLocked, // ignore open-state changes while a save is in flight
  });

  return (
    <Dialog open={dialog.open} onOpenChange={dialog.setOpen}>
      <DialogTrigger>Add product</DialogTrigger>
      <DialogContent>
        <DialogLockProvider scope={lock.scope}>
          {children({ formKey: dialog.openKey, onClose: () => dialog.setOpen(false) })}
        </DialogLockProvider>
      </DialogContent>
    </Dialog>
  );
}

// Usage: `formKey` changes on every closed -> open transition, so the form
// remounts with fresh default values each time the dialog opens.
//
// <ProductDialog>
//   {({ formKey, onClose }) => <ProductForm key={formKey} onDone={onClose} />}
// </ProductDialog>
```

- `useControllableDialog({ open, defaultOpen, onOpenChange, locked })` returns `{ open, setOpen, openKey, isControlled }`. It works controlled or uncontrolled, and ignores every change while `locked` (a boolean or a `() => boolean`) is true.
- `useDialogLockScope()` returns `{ locked, isLocked, scope }`. Use `locked` for rendering (e.g. disabling a close button) and `isLocked()` for guards, since the lock can be released and the dialog closed in the same tick.
- `DialogLockProvider` makes `scope` available to the hooks below it. Outside a provider the lock is a no-op.
- `useDialogLock(locked)` locks the nearest dialog manually, and `useDialogLockHandle()` returns an imperative setter, for custom pending states.

The same pieces work with a native `<dialog>`: drive `showModal()` / `close()` from `dialog.open`, and call `event.preventDefault()` in its `cancel` event while `lock.isLocked()` is true. Chrome still closes a modal dialog on a repeated Escape, so also listen for `close` and call `showModal()` again while `lock.isLocked()` is true.

## Next.js

Mount `NextCrudProvider` once (it is a client component and can be imported straight into a Server Component layout). It is a `CrudProvider` preset: `onMutated` calls `router.refresh()`, `navigate` calls `router.push()`, and `redirect()` / `notFound()` / `forbidden()` / `unauthorized()` thrown by a server action are treated as interrupts instead of failures. Any prop you pass wins over the preset.

Pass only serializable props (`refreshOnMutated`, ...) from a Server Component. To pass functions such as `notify` handlers, wrap `NextCrudProvider` in your own `"use client"` component.

```tsx
// app/layout.tsx
import { NextCrudProvider } from "submitly/next";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* runAction revalidates in the same round trip, so skip the extra client refresh */}
        <NextCrudProvider refreshOnMutated={false}>{children}</NextCrudProvider>
      </body>
    </html>
  );
}
```

On the server, `runAction` validates the input with the same schema, runs your handler, normalizes the result, revalidates on success and turns thrown errors into a failed `ActionResult`:

```ts
"use server";

import { runAction } from "submitly/next/server";

export async function saveProduct(input: unknown) {
  return runAction({
    schema, // any Standard Schema
    input,
    handler: (data) => db.products.save(data), // receives the parsed output
    revalidate: { paths: ["/products"], tags: ["products"] },
  });
}
```

- Validation failures resolve to `{ success: false, statusCode: 422, message, errors, fieldErrors }`, with `fieldErrors` keyed by dotted path (`items.0.name`), so the client applies them with `form.setError`.
- Unexpected handler errors resolve to `{ success: false, statusCode: 500, message, errors }`. Customize with `mapError`, log with `onError`.
- Next.js control-flow errors are re-thrown untouched.
- `messages` overrides the `validation` / `unexpected` strings. Pass an object or a function resolving them per request (e.g. from your i18n). `createRunAction({ messages, mapError, onError })` creates a `runAction` with app-wide defaults. A `"use server"` file may only export async functions, so create that configured `runAction` in a regular server-only module (no `"use server"`; `import "server-only"` is fine) and import it into your actions file.
- Errors thrown by the handler (or `normalize` / `revalidate`) never reject: they become a failed result. Errors thrown by your own `mapError`, `onError` or `messages` function are not caught.
- `revalidate` takes `paths` and `tags` (or a function of the parsed data and result) and runs only for successful results.

Then use the action directly from the client hooks: `useCrudForm({ schema, action: saveProduct, ... })`.

> **Share schemas carefully.** `useCrudForm` passes the schema's *parsed output* to the action, and `runAction` validates it again with the same schema. The schema must therefore accept its own output. For example, a field that turns `""` into `undefined` needs `.optional()` before the transform, and a `z.coerce.number()` field already accepts the number it produces.

## The `ActionResult` contract

The type and its helpers live in `submitly/core` (also re-exported by `submitly`). Server code must import them from `submitly/core`: functions imported from the client `submitly` entry cannot be called in a Server Component or server action.

```ts
import { defaultMapError, type ActionResult } from "submitly/core";
```

Every action resolves to this shape (after `normalize`). Only `success` is required, so `{ success: true }` is a valid result.

```ts
type ActionResult<TData = unknown> = {
  success: boolean;
  message?: string; // passed to notify.success / notify.error when present
  data?: TData;
  errors?: string[]; // form-level errors, exposed as `serverErrors`
  fieldErrors?: Record<string, string[]>; // keyed by dotted path, applied with form.setError
  statusCode?: number;
};
```

With the default `normalize`, an action can also return a plain value (an entity, or nothing): that counts as `{ success: true, data }`. An action that throws is mapped through `mapError`. `useCrudAction` exposes `result.errors` as `serverErrors`; `useCrudForm` also folds any `fieldErrors` without a usable key into `serverErrors`.

## License

MIT
