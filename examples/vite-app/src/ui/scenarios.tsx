import { useCrudAction } from "submitly";

import { api } from "../lib/api";
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

export function Scenarios({ latencyMs }: { latencyMs: number | undefined }) {
  const latency = useCrudAction({ action: api.setLatency });

  return (
    <div className="scenarios">
      <div className="scenario">
        <div className="scenario-text">
          <strong>Server latency</strong>
          <p>Slow the fake API down to watch pending states and the dialog lock.</p>
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
        description="The API answers 500 and the client throws: mapError turns it into a failed result, toast + error panel, no crash."
        action={api.broken}
        tone="danger"
      />
      <ScenarioButton
        title="Session expired"
        description="The API answers 401. The provider's onError sends you to /login instead of toasting."
        action={api.expired}
      />
      <ScenarioButton title="Reset data" description="Restore the sample products." action={api.reset} />
    </div>
  );
}
