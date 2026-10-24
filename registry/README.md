# submitly registry

shadcn registry items built on the `submitly` npm package:

| Item | Depends on |
| --- | --- |
| `form` | shadcn `label`, `react-hook-form`, `radix-ui` |
| `form-errors` | `submitly` |
| `submit-button` | shadcn `button`, `lucide-react` |
| `form-dialog` | shadcn `dialog`, `submitly` |
| `confirm-dialog` | shadcn `button` + `dialog`, `form-errors`, `submit-button`, `submitly` |

```bash
npx shadcn add <REGISTRY_URL>/r/form-dialog.json
```

## Build

```bash
REGISTRY_URL=https://your-docs-host pnpm --filter submitly-registry build
```

Writes `apps/docs/public/r/*.json`. `registry.json` references sibling items by
URL (`{{REGISTRY_URL}}/r/form-errors.json`), so the build stamps in the origin
the files will be served from (default `http://localhost:3000`).

`shadcn/` holds local copies of the shadcn primitives used only to typecheck
and test `items/`.

## Compatibility

The dialog items use Radix-style `DialogTrigger asChild` and `DialogContent
showCloseButton`, i.e. shadcn's Radix bases (`radix-*` styles). shadcn 4's
default `base-*` (Base UI) styles are not supported yet.
