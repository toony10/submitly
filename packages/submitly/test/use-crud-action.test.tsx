import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { CrudProvider, useCrudAction, type ActionResult } from "../src";
import { deferred } from "./helpers";

function providerWrapper() {
  const notify = { success: vi.fn(), error: vi.fn() };
  const onMutated = vi.fn();
  const navigate = vi.fn();

  const wrapper = ({ children }: { children: ReactNode }) => (
    <CrudProvider notify={notify} onMutated={onMutated} navigate={navigate}>
      {children}
    </CrudProvider>
  );

  return { wrapper, notify, onMutated, navigate };
}

describe("useCrudAction", () => {
  it("runs notify → onMutated → onSuccess → redirect on success", async () => {
    const { wrapper, notify, onMutated, navigate } = providerWrapper();
    const calls: string[] = [];
    notify.success.mockImplementation(() => calls.push("notify"));
    onMutated.mockImplementation(() => calls.push("onMutated"));
    navigate.mockImplementation(() => calls.push("navigate"));

    const { result } = renderHook(
      () =>
        useCrudAction({
          action: async (id: string) => ({ success: true, message: `Deleted ${id}` }),
          onSuccess: () => calls.push("onSuccess"),
          redirectTo: "/products",
        }),
      { wrapper },
    );

    let outcome: ActionResult | undefined;
    await act(async () => {
      outcome = await result.current.execute("p1");
    });

    expect(outcome).toEqual({ success: true, message: "Deleted p1" });
    expect(calls).toEqual(["notify", "onMutated", "onSuccess", "navigate"]);
    expect(navigate).toHaveBeenCalledWith("/products");
  });

  it("stores errors on failure and skips success side effects", async () => {
    const { wrapper, notify, onMutated, navigate } = providerWrapper();
    const onError = vi.fn();
    const { result } = renderHook(
      () =>
        useCrudAction({
          action: async () => ({ success: false, message: "Forbidden", errors: ["In use"] }),
          redirectTo: "/products",
          onError,
        }),
      { wrapper },
    );

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.serverErrors).toEqual(["In use"]);
    expect(notify.error).toHaveBeenCalledOnce();
    expect(onMutated).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledOnce();

    act(() => result.current.clearServerErrors());
    expect(result.current.serverErrors).toEqual([]);
  });

  it("never rejects: thrown errors go through mapError", async () => {
    const { wrapper } = providerWrapper();
    const { result } = renderHook(
      () =>
        useCrudAction({
          action: async () => {
            throw new Error("Offline");
          },
        }),
      { wrapper },
    );

    let outcome: ActionResult | undefined;
    await act(async () => {
      outcome = await result.current.execute();
    });

    expect(outcome).toEqual({ success: false, message: "Offline", errors: ["Offline"] });
    expect(result.current.serverErrors).toEqual(["Offline"]);
    expect(result.current.isPending).toBe(false);
  });

  it("guards against double execution while in flight", async () => {
    const { wrapper } = providerWrapper();
    const pending = deferred<ActionResult>();
    const action = vi.fn(() => pending.promise);
    const { result } = renderHook(() => useCrudAction({ action }), { wrapper });

    let first!: Promise<ActionResult>;
    let second!: Promise<ActionResult>;
    act(() => {
      first = result.current.execute();
      second = result.current.execute();
    });

    expect(result.current.isPending).toBe(true);
    expect(second).toBe(first);

    await act(async () => pending.resolve({ success: true }));

    expect(action).toHaveBeenCalledTimes(1);
    expect(result.current.isPending).toBe(false);
  });

  it("keeps execute stable across renders and uses the latest options", async () => {
    const { wrapper } = providerWrapper();
    const first = vi.fn(async () => ({ success: true }));
    const second = vi.fn(async () => ({ success: true }));
    const { result, rerender } = renderHook(({ action }) => useCrudAction({ action }), {
      wrapper,
      initialProps: { action: first },
    });

    const execute = result.current.execute;
    rerender({ action: second });

    expect(result.current.execute).toBe(execute);

    await act(async () => {
      await result.current.execute();
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });

  it("skips redirect when redirectTo returns nothing", async () => {
    const { wrapper, navigate } = providerWrapper();
    const { result } = renderHook(
      () => useCrudAction({ action: async () => ({ success: true }), redirectTo: () => null }),
      { wrapper },
    );

    await act(async () => {
      await result.current.execute();
    });

    expect(navigate).not.toHaveBeenCalled();
  });

  it("stops silently on an interrupt (e.g. a framework redirect)", async () => {
    const notify = { success: vi.fn(), error: vi.fn() };
    const onError = vi.fn();
    const redirect = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;push;/login" });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <CrudProvider
        notify={notify}
        isInterrupt={(error) => (error as { digest?: string }).digest?.startsWith("NEXT_REDIRECT") ?? false}
      >
        {children}
      </CrudProvider>
    );
    const { result } = renderHook(
      () =>
        useCrudAction({
          action: async () => {
            throw redirect;
          },
          onError,
        }),
      { wrapper },
    );

    let outcome: ActionResult | undefined;
    await act(async () => {
      outcome = await result.current.execute();
    });

    expect(outcome).toEqual({ success: false });
    expect(result.current.serverErrors).toEqual([]);
    expect(result.current.isPending).toBe(false);
    expect(notify.error).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});
