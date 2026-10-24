"use client";

import { useFeedback } from "./feedback";

export function EventLog() {
  const { entries, clearLog } = useFeedback();

  return (
    <section className="card log">
      <header className="card-header">
        <div>
          <h2>Event log</h2>
          <p>Provider and hook callbacks, newest first.</p>
        </div>
        <button type="button" className="btn btn-sm btn-ghost" onClick={clearLog} disabled={!entries.length}>
          Clear
        </button>
      </header>
      {entries.length ? (
        <ol className="log-list">
          {entries.map((entry) => (
            <li key={entry.id} className={`log-${entry.tone}`}>
              <time>{entry.time}</time>
              <code>{entry.source}</code>
              <span>{entry.text}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="empty">Submit a form or run a scenario to see callbacks fire.</p>
      )}
    </section>
  );
}
