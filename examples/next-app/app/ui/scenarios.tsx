"use client";

import { useCrudAction } from "submitly";

import { brokenAction, expiredSessionAction, resetData, setLatency } from "@/app/actions";

import { ErrorPanel, Spinner } from "./fields";

const latencies = [
  { value: 0, label: "Off" },
  { value: 600, label: "600 ms" },
  { value: 2000, label: "2 s" },
] as const;

function ScenarioButton({
  title,
  description,
  action,
  tone = "ghost",
}: {
  title: string;
  description: string;
  action: () => Promise<unknown>;
  tone?: "ghost" | "danger";
}) {
  const { execute, isPending, serverErrors } = useCrudAction({ action });

  return (
    <div className="scenario">
      <div className="scenario-text">
        <strong>{title}</strong>
        <p>{description}</p>
        <ErrorPanel errors={serverErrors} />
      </div>
      <button
        type="button"
        className={`btn btn-sm ${tone === "danger" ? "btn-danger" : "btn-outline"}`}
        disabled={isPending}
        onClick={() => void execute()}
      >
        {isPending ? <Spinner /> : null}
        Run
      </button>
    </div>
  );
}

export function Scenarios({ latencyMs }: { latencyMs: number }) {
  const latency = useCrudAction({ action: setLatency });

  return (
    <div className="scenarios">
      <div className="scenario">
        <div className="scenario-text">
          <strong>Server latency</strong>
          <p>Slow the server down to watch pending states and the dialog lock.</p>
        </div>
        <div className="segmented" role="group" aria-label="Server latency">
          {latencies.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={latencyMs === option.value}
              disabled={latency.isPending}
              onClick={() => void latency.execute(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <ScenarioButton
        title="Handler throws"
        description="runAction catches it and returns a 500 result: toast + error panel, no crash."
        action={brokenAction}
        tone="danger"
      />
      <ScenarioButton
        title="Session expired"
        description="The action calls redirect('/login'). The hooks treat it as an interrupt, not a failure."
        action={expiredSessionAction}
      />
      <ScenarioButton title="Reset data" description="Restore the sample products." action={resetData} />
    </div>
  );
}
