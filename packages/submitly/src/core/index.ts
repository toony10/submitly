// Entry point `submitly/core`: pure helpers and types, no React, no "use client".
// Safe to import from Server Components, server actions and route handlers.
// The root `submitly` entry re-exports everything here for backwards compatibility.
export type {
  ActionResult,
  FieldErrorMap,
  InferResultData,
  MapError,
  Normalize,
  NotifyHandlers,
} from "./types";
export { defaultMapError, defaultNormalize, isActionResult } from "./normalize";
export { getDotPath, issuesToErrors } from "./errors";
export { validate } from "./validate";
