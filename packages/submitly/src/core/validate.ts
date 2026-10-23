import type { StandardSchemaV1 } from "@standard-schema/spec";

/** Runs any Standard Schema (sync or async) and returns its result. */
export async function validate<TSchema extends StandardSchemaV1>(
  schema: TSchema,
  input: unknown,
): Promise<StandardSchemaV1.Result<StandardSchemaV1.InferOutput<TSchema>>> {
  return schema["~standard"].validate(input);
}
