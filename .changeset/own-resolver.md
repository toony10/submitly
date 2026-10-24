---
"submitly": minor
---

Removed the `@hookform/resolvers` peer dependency. Validation now uses a small built-in Standard Schema resolver for react-hook-form, so the install line is `npm i submitly react-hook-form`. This also avoids the `ERESOLVE` failure npm hit with `@hookform/resolvers@6.0.0`. If your code imports `@hookform/resolvers` itself, keep it in your own dependencies.
