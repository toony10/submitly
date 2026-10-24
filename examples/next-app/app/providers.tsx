"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { NextCrudProvider } from "submitly/next";

import { FeedbackProvider, useFeedback } from "./ui/feedback";

/**
 * Functions (notify handlers, onMutated) can't be passed from a Server
 * Component, so the provider is wired in this client component.
 */
function CrudWiring({ children }: { children: ReactNode }) {
  const { toast, log } = useFeedback();
  const router = useRouter();

  return (
    <NextCrudProvider
      notify={{
        success: (result) => {
          toast("success", result.message ?? "Done");
          log("notify.success", result.message ?? "", "success");
        },
        error: (result) => {
          toast("error", result.message ?? "Something went wrong");
          log("notify.error", result.message ?? "", "error");
        },
      }}
      // runAction already revalidates in the same round trip, so no router.refresh() here.
      onMutated={() => log("onMutated", "mutation succeeded (server revalidated)")}
      navigate={(to) => {
        log("navigate", to);
        router.push(to);
      }}
    >
      {children}
    </NextCrudProvider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <FeedbackProvider>
      <CrudWiring>{children}</CrudWiring>
    </FeedbackProvider>
  );
}
