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
  describe("provider onError", () => {
    it("runs after notify.error and before the per-call onError, for returned and thrown failures", async () => {
      const calls: string[] = [];
      const notify = { success: vi.fn(), error: vi.fn(() => calls.push("notify")) };
      const providerOnError = vi.fn(() => calls.push("provider"));
      const wrapper = ({ children }: { children: ReactNode }) => (
        <CrudProvider notify={notify} onError={providerOnError}>
          {children}
        </CrudProvider>
      );
      const { result } = renderHook(
        () =>
          useCrudAction({
            action: async (fail: "returned" | "thrown") => {
              if (fail === "thrown") {
                throw new Error("Offline");
              }

              return { success: false, statusCode: 401, message: "Expired" };
            },
            onError: () => calls.push("call"),
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.execute("returned");
      });

      expect(calls).toEqual(["notify", "provider", "call"]);
      expect(providerOnError).toHaveBeenLastCalledWith({
        success: false,
        statusCode: 401,
        message: "Expired",
      });

      await act(async () => {
        await result.current.execute("thrown");
      });

      expect(providerOnError).toHaveBeenLastCalledWith({
        success: false,
        message: "Offline",
        errors: ["Offline"],
      });
      expect(providerOnError).toHaveBeenCalledTimes(2);
    });

    it("is not called on success", async () => {
      const onError = vi.fn();
      const wrapper = ({ children }: { children: ReactNode }) => (
        <CrudProvider onError={onError}>{children}</CrudProvider>
      );
      const { result } = renderHook(() => useCrudAction({ action: async () => ({ success: true }) }), {
        wrapper,
      });

      await act(async () => {
        await result.current.execute();
      });

      expect(onError).not.toHaveBeenCalled();
    });

    it("is overridden by a nested provider and inherited otherwise", async () => {
      const outer = vi.fn();
      const inner = vi.fn();
      const fail = async () => ({ success: false });
      const wrapper = ({ children }: { children: ReactNode }) => (
        <CrudProvider onError={outer}>
          <CrudProvider onError={inner}>{children}</CrudProvider>
        </CrudProvider>
      );
      const inheriting = ({ children }: { children: ReactNode }) => (
        <CrudProvider onError={outer}>
          <CrudProvider>{children}</CrudProvider>
        </CrudProvider>
      );

      const nested = renderHook(() => useCrudAction({ action: fail }), { wrapper });
      await act(async () => {
        await nested.result.current.execute();
      });

      expect(inner).toHaveBeenCalledOnce();
      expect(outer).not.toHaveBeenCalled();

      const inherited = renderHook(() => useCrudAction({ action: fail }), { wrapper: inheriting });
      await act(async () => {
        await inherited.result.current.execute();
      });

      expect(outer).toHaveBeenCalledOnce();
    });

    it("is skipped for interrupts", async () => {
      const onError = vi.fn();
      const wrapper = ({ children }: { children: ReactNode }) => (
        <CrudProvider onError={onError} isInterrupt={() => true}>
          {children}
        </CrudProvider>
      );
      const { result } = renderHook(
        () =>
          useCrudAction({
            action: async () => {
              throw new Error("NEXT_REDIRECT");
            },
          }),
        { wrapper },
      );

      await act(async () => {
        await result.current.execute();
      });

      expect(onError).not.toHaveBeenCalled();
    });
  });

  describe("errors thrown by your own callbacks", () => {
    it("propagate: execute rejects and the hook settles", async () => {
      const boom = new Error("onSuccess blew up");
      const { wrapper } = providerWrapper();
      const { result } = renderHook(
        () =>
          useCrudAction({
            action: async () => ({ success: true }),
            onSuccess: () => {
              throw boom;
            },
          }),
        { wrapper },
      );

      await act(async () => {
        await expect(result.current.execute()).rejects.toBe(boom);
      });

      expect(result.current.isPending).toBe(false);
    });

    const throws = () => {
      throw new Error("cb");
    };

    it.each([
      ["a notify handler", { provider: { notify: { error: throws } }, call: {} }],
      ["the provider onError", { provider: { onError: throws }, call: {} }],
      ["the per-call onError", { provider: {}, call: { onError: throws } }],
    ])("propagate from %s", async (_name, { provider, call }) => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <CrudProvider {...provider}>{children}</CrudProvider>
      );
      const { result } = renderHook(
        () => useCrudAction({ action: async () => ({ success: false, message: "No" }), ...call }),
        { wrapper },
      );

      await act(async () => {
        await expect(result.current.execute()).rejects.toThrow("cb");
      });

      expect(result.current.isPending).toBe(false);
    });

    it.each([
      ["onMutated", { onMutated: throws }, {}],
      ["navigate", { navigate: throws }, { redirectTo: "/next" }],
    ])("propagate from %s", async (_name, provider, call) => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <CrudProvider {...provider}>{children}</CrudProvider>
      );
      const { result } = renderHook(
        () => useCrudAction({ action: async () => ({ success: true }), ...call }),
        { wrapper },
      );

      await act(async () => {
        await expect(result.current.execute()).rejects.toThrow("cb");
      });
    });

    it("still maps errors thrown by the action itself", async () => {
      const { wrapper } = providerWrapper();
      const { result } = renderHook(
        () =>
          useCrudAction({
            action: async () => {
              throw new Error("from the action");
            },
          }),
        { wrapper },
      );

      await act(async () => {
        await expect(result.current.execute()).resolves.toMatchObject({ success: false });
      });
    });
  });
});
