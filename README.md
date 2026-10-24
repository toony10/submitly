<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./brand/logo-dark.svg">
    <img src="./brand/logo.svg" alt="submitly" height="64">
  </picture>
</p>

# submitly

Headless form submission for React and Next.js: Standard Schema validation, typed actions, server errors mapped to fields, pending and dialog locks, and post-mutation refresh. Bring your own UI.

> Status: pre-release (`0.x`). See [docs/PLAN.md](docs/PLAN.md).

## Packages

| Path | What |
| --- | --- |
| `packages/submitly` | npm package: hooks, provider, types, `runAction` |
| `apps/docs` | docs site |
| `examples/*` | Next.js and Vite example apps |

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## License

MIT
