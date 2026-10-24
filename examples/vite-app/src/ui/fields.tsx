import type { ReactNode } from "react";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="field" data-invalid={error ? true : undefined}>
      <span className="field-label">{label}</span>
      {children}
      {error ? (
        <span className="field-error" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="field-hint">{hint}</span>
      ) : null}
    </label>
  );
}

export function ErrorPanel({ errors, title = "The server rejected this request" }: { errors: string[]; title?: string }) {
  if (!errors.length) {
    return null;
  }

  return (
    <div className="error-panel" role="alert">
      <strong>{title}</strong>
      <ul>
        {errors.map((error, index) => (
          <li key={index}>{error}</li>
        ))}
      </ul>
    </div>
  );
}

export function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}
