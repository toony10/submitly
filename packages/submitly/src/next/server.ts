import "server-only";

import type { StandardSchemaV1 } from "@standard-schema/spec";
import * as nextCache from "next/cache";
import { unstable_rethrow } from "next/navigation";

import { issuesToErrors } from "../core/errors";
import { defaultNormalize } from "../core/normalize";
import type { ActionResult } from "../core/types";

/** Cache invalidation to run after a successful handler. */
export type RevalidateTargets = {
  /** `revalidatePath`. A route pattern with dynamic segments needs `type`. */
  paths?: Array<string | { path: string; type: "page" | "layout" }>;
  /**
   * Cache tags. A plain string expires the tag immediately (read-your-own-writes:
   * `updateTag` on Next 16+, `revalidateTag(tag)` on Next 15). Pass
   * `{ tag, profile }` for stale-while-revalidate via `revalidateTag(tag, profile)`.
   */
  tags?: Array<string | { tag: string; profile: string | { expire?: number } }>;
};

export type RunActionMessages = {
  /** `message` of a result that failed schema validation. */
  validation: string;
  /** `message` of a result whose handler threw. */
  unexpected: string;
};

type MaybePromise<T> = T | Promise<T>;

type MessagesOption = Partial<RunActionMessages> | (() => MaybePromise<Partial<RunActionMessages>>);

/** `TData` of a handler's return value when no `normalize` is given. */
export type DefaultResultData<TRaw> = [TRaw] extends [ActionResult<infer TData>]
  ? TData
  : [TRaw] extends [void]
    ? undefined
    : TRaw;

export type RunActionDefaults = {
  /** Strings, or a function resolving them per request (e.g. from your i18n). */
  messages?: MessagesOption;
  /** Maps a thrown handler error. Next.js control-flow errors never reach it. */
  mapError?: (error: unknown) => ActionResult;
  /** Called with every unexpected handler error, e.g. for logging. */
  onError?: (error: unknown) => void;
};

export type RunActionOptions<TSchema extends StandardSchemaV1, TRaw, TData> = Omit<
  RunActionDefaults,
  "mapError"
> & {
  /** Any Standard Schema. The handler receives its parsed output. */
  schema: TSchema;
  /** Untrusted input, typically the server action's argument. */
  input: unknown;
  handler: (data: StandardSchemaV1.InferOutput<TSchema>) => MaybePromise<TRaw>;
  /** Maps the handler's return value. Default: `ActionResult`s pass through, anything else becomes `data`. */
  normalize?: (raw: TRaw) => ActionResult<TData>;
  mapError?: (error: unknown) => ActionResult<TData>;
  /** Runs only when the result is successful. */
  revalidate?:
    | RevalidateTargets
    | ((data: StandardSchemaV1.InferOutput<TSchema>, result: ActionResult<TData>) => RevalidateTargets);
};

const defaultMessages: RunActionMessages = {
  validation: "Validation failed",
  unexpected: "Unexpected error",
};

/**
 * Server-side wrapper for a server action: validates `input` with `schema`,
 * runs `handler`, normalizes its result, revalidates on success, and turns
 * thrown errors into a failed `ActionResult`. Next.js `redirect()`,
 * `notFound()`, `forbidden()` and `unauthorized()` are re-thrown untouched.
 */
export function runAction<TSchema extends StandardSchemaV1, TRaw, TData = DefaultResultData<TRaw>>(
  options: RunActionOptions<TSchema, TRaw, TData>,
): Promise<ActionResult<TData>> {
  return run(options, {});
}

/**
 * Creates a `runAction` with app-wide defaults (messages, error mapping,
 * logging). Per-call options win.
 *
 * ```ts
 * export const runAction = createRunAction({
 *   messages: async () => {
 *     const t = await getTranslations("Crud");
 *     return { validation: t("validation"), unexpected: t("unexpected") };
 *   },
 *   onError: (error) => logger.error(error),
 * });
 * ```
 */
export function createRunAction(defaults: RunActionDefaults) {
  return function runActionWithDefaults<
    TSchema extends StandardSchemaV1,
    TRaw,
    TData = DefaultResultData<TRaw>,
  >(options: RunActionOptions<TSchema, TRaw, TData>): Promise<ActionResult<TData>> {
    return run(options, defaults);
  };
}

async function run<TSchema extends StandardSchemaV1, TRaw, TData>(
  options: RunActionOptions<TSchema, TRaw, TData>,
  defaults: RunActionDefaults,
): Promise<ActionResult<TData>> {
  try {
    const parsed = await options.schema["~standard"].validate(options.input);

    if (parsed.issues) {
      const messages = await resolveMessages(defaults.messages, options.messages);
      const { fieldErrors, errors } = issuesToErrors(parsed.issues);

      return {
        success: false,
        statusCode: 422,
        message: messages.validation,
        errors,
        fieldErrors,
      };
    }

    const raw = await options.handler(parsed.value);
    const result = options.normalize
      ? options.normalize(raw)
      : (defaultNormalize(raw) as ActionResult<TData>);

    if (result.success && options.revalidate) {
      const targets =
        typeof options.revalidate === "function"
          ? options.revalidate(parsed.value, result)
          : options.revalidate;

      revalidate(targets);
    }

    return result;
  } catch (error) {
    unstable_rethrow(error);

    (options.onError ?? defaults.onError)?.(error);

    const mapError = options.mapError ?? defaults.mapError;

    if (mapError) {
      return mapError(error) as ActionResult<TData>;
    }

    const messages = await resolveMessages(defaults.messages, options.messages);

    return {
      success: false,
      statusCode: 500,
      message: messages.unexpected,
      errors: [messages.unexpected],
    };
  }
}

async function resolveMessages(
  ...layers: Array<MessagesOption | undefined>
): Promise<RunActionMessages> {
  let messages = defaultMessages;

  for (const layer of layers) {
    const resolved = typeof layer === "function" ? await layer() : layer;
    messages = { ...messages, ...resolved };
  }

  return messages;
}

function revalidate({ paths = [], tags = [] }: RevalidateTargets) {
  for (const entry of paths) {
    if (typeof entry === "string") {
      nextCache.revalidatePath(entry);
    } else {
      nextCache.revalidatePath(entry.path, entry.type);
    }
  }

  for (const entry of tags) {
    if (typeof entry !== "string") {
      nextCache.revalidateTag(entry.tag, entry.profile);
    } else if (typeof nextCache.updateTag === "function") {
      nextCache.updateTag(entry);
    } else {
      // Next 15: the one-argument form expires the tag immediately.
      (nextCache.revalidateTag as (tag: string) => void)(entry);
    }
  }
}
