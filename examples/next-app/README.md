# next-app example

Next.js App Router + server actions with `submitly`:

- `app/actions.ts` — `runAction` with schema validation, server field errors and `revalidate: { paths: ["/"] }`.
- `app/layout.tsx` — `NextCrudProvider` imported straight into a Server Component (checks the `"use client"` boundary survives the build), with `refreshOnMutated={false}` since actions already revalidate.
- `app/product-form.tsx` / `app/product-actions.tsx` — `useCrudForm` and `useCrudAction`, plus a "session expired" action whose `redirect()` is treated as an interrupt, not a failure.

```bash
pnpm --filter example-next-app build
pnpm --filter example-next-app start
```

## Why `--webpack`

Inside this pnpm workspace, Turbopack (Next 16.4) fails to resolve
`@hookform/resolvers/standard-schema` from the linked `submitly` package, while
webpack and Node resolve it fine. A packed `submitly` tarball installed into a
standalone Next 16 app builds and prerenders with Turbopack, so this only
affects the workspace link. Switch back to Turbopack once that is resolved.
