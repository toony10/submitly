"use client";

import { useCrudConfig } from "submitly";

import { cn } from "@/lib/utils";

type FormErrorsProps = {
  errors?: string[];
  /** Heading above the list. Defaults to the provider's `labels.errorsTitle`; `null` hides it. */
  title?: string | null;
  className?: string;
};

function FormErrors({ errors, title, className }: FormErrorsProps) {
  const { labels } = useCrudConfig();

  if (!errors?.length) {
    return null;
  }

  const heading = title === undefined ? labels.errorsTitle : title;

  return (
    <div
      role="alert"
      data-slot="form-errors"
      className={cn(
        "border-destructive/30 bg-destructive/5 text-destructive rounded-lg border px-3 py-2 text-sm",
        className,
      )}
    >
      {heading ? <p className="mb-1 font-medium">{heading}</p> : null}
      <ul className="text-foreground/90 list-disc space-y-0.5 ps-4">
        {errors.map((error, index) => (
          // Messages can repeat, so keys are positional.
          <li key={index}>{error}</li>
        ))}
      </ul>
    </div>
  );
}

export { FormErrors };
export type { FormErrorsProps };
