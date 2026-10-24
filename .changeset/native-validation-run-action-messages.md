---
"submitly": patch
---

`shouldUseNativeValidation` now reaches nested fields (`user.name`): the resolver walks the registered field names instead of only the top-level keys of react-hook-form's `fields`. The built-in resolver's source carries the upstream MIT notice as a legal comment, so it survives in `dist`.

`runAction`: a throwing `messages()` function now rejects consistently. Previously it rejected on the unexpected-error path but, on the validation path, was routed through `onError` / `mapError`, which discarded the 422 result.
