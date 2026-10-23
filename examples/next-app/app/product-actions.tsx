"use client";

import { useCrudAction } from "submitly";

import { deleteProduct, expiredSessionAction } from "./actions";

export function DeleteButton({ id }: { id: number }) {
  const { execute, isPending } = useCrudAction({ action: deleteProduct });

  return (
    <button type="button" disabled={isPending} onClick={() => void execute(id)}>
      Delete
    </button>
  );
}

export function ExpiredSessionButton() {
  const { execute, serverErrors } = useCrudAction({ action: expiredSessionAction });

  return (
    <>
      <button type="button" onClick={() => void execute()}>
        Simulate expired session
      </button>
      {serverErrors.length > 0 ? <p role="alert">{serverErrors.join(", ")}</p> : null}
    </>
  );
}
