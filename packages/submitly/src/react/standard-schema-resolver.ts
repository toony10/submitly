"use client";

import type { StandardSchemaV1 } from "@standard-schema/spec";
import {
  get,
  set,
  type FieldError,
  type FieldErrors,
  type FieldValues,
  type Resolver,
  type ResolverOptions,
} from "react-hook-form";

import { getDotPath } from "../core/errors";

/*!
 * Ported from `standardSchemaResolver`, `toNestErrors` and `validateFieldsNatively`
 * in @hookform/resolvers (https://github.com/react-hook-form/resolvers).
 * Owning this avoids a peer dependency that only existed for a ~60 line function.
 *
 * MIT License
 *
 * Copyright (c) 2019-present Beier(Bill) Luo
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

const schemaRootKey = Symbol("schema root");

type NativeRef = { reportValidity?: () => boolean; setCustomValidity?: (message: string) => void };

/**
 * react-hook-form `Resolver` for any Standard Schema. Supports async
 * validation, `criteriaMode: "all"`, `shouldUseNativeValidation`, nested
 * paths and field-array root errors.
 */
export function standardSchemaResolver<TFieldValues extends FieldValues, TContext, TOutput>(
  schema: StandardSchemaV1<TFieldValues, TOutput>,
): Resolver<TFieldValues, TContext, TOutput> {
  return async (values, _context, options) => {
    const result = await schema["~standard"].validate(values);

    if (result.issues) {
      const errors = parseIssues(result.issues, !options.shouldUseNativeValidation && options.criteriaMode === "all");

      return { values: {}, errors: toNestErrors(errors, options) };
    }

    if (options.shouldUseNativeValidation) {
      validateFieldsNatively({}, options);
    }

    return { values: result.value, errors: {} };
  };
}

function appendMessage(error: FieldError, message: string | undefined) {
  if (message) {
    error.message = error.message ? `${error.message}\n${message}` : message;
  }
}

function appendTypes(error: FieldError, types: FieldError["types"]) {
  if (!types) {
    return;
  }

  const next = error.types ?? {};

  for (const message of Object.values(types)) {
    next[Object.keys(next).length] = message;
  }

  error.types = next;
}

function parseIssues(issues: readonly StandardSchemaV1.Issue[], allCriteria: boolean) {
  const errors = new Map<string | typeof schemaRootKey, FieldError>();

  for (const issue of issues) {
    const path = getDotPath(issue) || schemaRootKey;
    const existing = errors.get(path);

    if (!existing) {
      errors.set(path, { message: issue.message, type: "" });
    } else if (path === schemaRootKey) {
      // Root issues have no natural "first" message: keep all of them.
      appendMessage(existing, issue.message);
    }

    if (allCriteria) {
      const current = errors.get(path)!;
      const types = current.types ?? {};

      current.types = { ...types, [Object.keys(types).length]: issue.message };
    }
  }

  const fieldErrors: Record<string, FieldError> = {};

  for (const [path, error] of errors) {
    if (path !== schemaRootKey) {
      fieldErrors[path] = error;
    }
  }

  const rootError = errors.get(schemaRootKey);

  if (rootError) {
    if (fieldErrors.root) {
      appendMessage(fieldErrors.root, rootError.message);
      appendTypes(fieldErrors.root, rootError.types);
    } else {
      fieldErrors.root = rootError;
    }
  }

  return fieldErrors;
}

function normalizePath(path: string) {
  return path.replace(/\[(\d+)]/g, ".$1").replace(/[[\]]/g, "");
}

/** True when `path` is a field array (some registered name looks like `path.<index>...`). */
function isFieldArray(names: Iterable<string>, path: string) {
  const escaped = normalizePath(path).replace(/[.*+?^${}()|\\]/g, "\\$&");
  const pattern = new RegExp(`^${escaped}\\.\\d+`);

  for (const name of names) {
    if (pattern.test(normalizePath(name))) {
      return true;
    }
  }

  return false;
}

function toNestErrors<TFieldValues extends FieldValues>(
  errors: Record<string, FieldError>,
  options: ResolverOptions<TFieldValues>,
): FieldErrors<TFieldValues> {
  if (options.shouldUseNativeValidation) {
    validateFieldsNatively(errors, options);
  }

  const fieldErrors: Record<string, unknown> = {};

  for (const path in errors) {
    const field = get(options.fields, path) as { ref?: unknown; refs?: unknown[] } | undefined;
    const error = Object.assign(errors[path] ?? {}, { ref: field?.refs ? field.refs[0] : field?.ref });

    if (isFieldArray(options.names ?? Object.keys(errors), path)) {
      // Errors on the array itself live under `.root`, beside the item errors.
      const nested = Object.assign({}, get(fieldErrors, path));

      set(nested, "root", error);
      set(fieldErrors, path, nested);
    } else {
      set(fieldErrors, path, error);
    }
  }

  return fieldErrors as FieldErrors<TFieldValues>;
}

function setNativeValidity(ref: NativeRef | undefined, path: string, errors: object) {
  if (ref && typeof ref.reportValidity === "function") {
    const error = get(errors, path) as FieldError | undefined;

    ref.setCustomValidity?.(error?.message ?? "");
    ref.reportValidity();
  }
}

/** Registered field names found in react-hook-form's nested `fields` tree (used when `names` is absent). */
function collectFieldNames(fields: unknown, prefix = ""): string[] {
  if (!fields || typeof fields !== "object") {
    return [];
  }

  const node = fields as Record<string, unknown>;

  if (prefix && ((typeof node.ref === "object" && node.ref !== null) || Array.isArray(node.refs))) {
    return [prefix];
  }

  return Object.keys(node).flatMap((key) => collectFieldNames(node[key], prefix ? `${prefix}.${key}` : key));
}

function validateFieldsNatively<TFieldValues extends FieldValues>(
  errors: object,
  options: ResolverOptions<TFieldValues>,
) {
  // `fields` is nested (`{ user: { name } }`), so walk registered names rather than top-level keys.
  for (const name of options.names?.length ? options.names : collectFieldNames(options.fields)) {
    const field = get(options.fields, name) as { ref?: NativeRef; refs?: NativeRef[] } | undefined;

    if (field?.ref && typeof field.ref.reportValidity === "function") {
      setNativeValidity(field.ref, name, errors);
    } else {
      field?.refs?.forEach((ref) => setNativeValidity(ref, name, errors));
    }
  }
}
