# submitly

shadcn-native CRUD dialogs and form submission for React and Next.js: add / edit / delete flows with validation, pending locks, server errors and post-mutation refresh, in a few lines per entity.

> Pre-release (`0.x`). Requires TypeScript ≥ 5.4 for consumers.

```bash
npm i submitly react-hook-form @hookform/resolvers
```

## Entry points

| Import | Contents |
| --- | --- |
| `submitly` | `CrudProvider`, `useCrudForm`, `useCrudAction`, `useControllableDialog`, dialog lock hooks, `ActionResult` types |
| `submitly/next` | `NextCrudProvider` (`router.refresh` / `router.push` preset, server-action redirects as interrupts) |
| `submitly/next/server` | `runAction`, `createRunAction` |

## Quick look

```tsx
const { form, onSubmit, serverErrors, isSubmitting } = useCrudForm({
  schema,                       // any Standard Schema (Zod, Valibot, ArkType)
  defaultValues: { name: "" },
  action: saveProduct,          // any async function
  onSuccess: onClose,
  redirectTo: (result) => `/products/${result.data?.id}`,
});
```

```ts
"use server";
export async function saveProduct(input: unknown) {
  return runAction({
    schema,
    input,
    handler: (data) => db.products.save(data),
    revalidate: { paths: ["/products"], tags: ["products"] },
  });
}
```

Toasts, refresh, navigation, error mapping and labels are injected through `CrudProvider`; the package ships no i18n, toast or router dependency.

MIT
