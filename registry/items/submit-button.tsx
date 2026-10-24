"use client";

import { LoaderCircleIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SubmitButtonProps = React.ComponentProps<typeof Button> & {
  loading?: boolean;
  /** Shown instead of `children` while loading. */
  loadingLabel?: React.ReactNode;
};

function SubmitButton({
  loading = false,
  loadingLabel,
  disabled,
  children,
  className,
  type = "submit",
  ...props
}: SubmitButtonProps) {
  return (
    <Button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      className={cn("group", className)}
      {...props}
    >
      {loading ? (
        <>
          <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
          {loadingLabel ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export { SubmitButton };
export type { SubmitButtonProps };
