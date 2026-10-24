import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { CrudProvider } from "submitly";

import { mapError, normalize } from "./lib/crud-adapter";
import { useFeedback } from "./ui/feedback";

/**
 * The whole integration: submitly knows nothing about the toast, the query
 * cache or the router, they are plugged in here.
 */
export function Providers({ children }: { children: ReactNode }) {
  const { toast, log } = useFeedback();
  const queryClient = useQueryClient();
  const routerNavigate = useNavigate();

  const navigate = (to: string) => {
    log("navigate", to);
    void routerNavigate(to);
  };

  return (
    <CrudProvider
      // The API client returns `{ data, message }` envelopes and throws `ApiError`;
      // these two turn them into `ActionResult`s so no action is reshaped by hand.
      normalize={normalize}
      mapError={mapError}
      notify={{
        success: (result) => {
          toast("success", result.message ?? "Done");
          log("notify.success", result.message ?? "", "success");
        },
        error: (result) => {
          log("notify.error", `${result.statusCode ?? ""} ${result.message ?? ""}`.trim(), "error");

          // Expired session: every failed action funnels through here, so one
          // check covers the whole app. Skip the toast and go to the login page.
          if (result.statusCode === 401) {
            navigate("/login");
            return;
          }

          toast("error", result.message ?? "Something went wrong");
        },
      }}
      onMutated={() => {
        log("onMutated", "queryClient.invalidateQueries()");
        void queryClient.invalidateQueries();
      }}
      navigate={navigate}
    >
      {children}
    </CrudProvider>
  );
}
