# submitly

shadcn-native CRUD dialogs and form submission for React and Next.js: add / edit / delete flows with validation, pending locks, server errors and post-mutation refresh, in a few lines per entity.

> Status: pre-release (`0.x`). See [docs/PLAN.md](docs/PLAN.md).

## Packages

| Path | What |
| --- | --- |
| `packages/submitly` | npm package: hooks, provider, types, `runAction` |
| `registry` | shadcn registry items (dialogs, `Form*` fields, `FormErrors`, `SubmitButton`) |
| `apps/docs` | docs site + hosted registry (`/r/*.json`) |
| `examples/*` | Next.js and Vite example apps |

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## License

MIT
