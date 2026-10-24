# docs

Documentation site for [`submitly`](../../packages/submitly), built with [Fumadocs](https://fumadocs.dev) on Next.js.
The content is static MDX; the site does not import `submitly`.

## Run it

From the repo root:

```bash
pnpm install
pnpm --filter docs dev        # http://localhost:3300
```

Production build and server:

```bash
pnpm --filter docs build
pnpm --filter docs start      # http://localhost:3300
```

Other scripts:

```bash
pnpm --filter docs typecheck  # next typegen + tsc --noEmit
pnpm --filter docs lint
```

`pnpm build` at the repo root builds the site too. The dev and start servers use port 3300.

## Why `--webpack`

`dev` and `build` pass `--webpack`. Inside this pnpm workspace, Turbopack (Next 16.4) fails to resolve Fumadocs'
subpath exports (`fumadocs-core/source`, `fumadocs-ui/provider/next`, ...) from the linked `node_modules`, while webpack
resolves them fine. The same problem is described in `examples/next-app`. The webpack build prints two upstream
warnings (lightningcss does not know the `::highlight` pseudo-element, and webpack cannot trace Fumadocs' dynamic
`import()` for its build cache); both are harmless.

## Layout

```
content/docs/            the pages (MDX) and meta.json files that order the sidebar
  concepts/              result contract, provider, lifecycle, dialog lock, schema idempotency
  recipes/               add / edit / delete, shared dialog, bulk delete, i18n, axios, dialog libraries, ...
  reference/             one page per entry point: submitly, submitly/next, submitly/next/server
  migration.mdx          from the tona-dashboard forms kit
app/                     Next.js routes (home, /docs, search API)
lib/source.ts            Fumadocs content source
components/mdx.tsx       MDX components (Tabs, Steps, ...)
```

## Writing docs

- Add a `.mdx` file under `content/docs/` with `title` and `description` front matter, and list it in the folder's
  `meta.json` if the folder lists pages explicitly.
- Fence a package-install command as ` ```npm ` and Fumadocs renders npm / pnpm / yarn / bun tabs.
- Give a code fence `title="path/to/file.tsx"` when it is a complete file. The quick starts are written so that every
  titled fence can be pasted as-is into a fresh Next.js or Vite project.
- The API reference is hand-written. When a public export, option, type or default changes in
  `packages/submitly/src`, update the matching page in `content/docs/reference/` in the same change.
