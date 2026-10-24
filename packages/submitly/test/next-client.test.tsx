import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as Navigation from "next/navigation";

import { useCrudAction, useCrudConfig } from "../src";
import { isNextInterrupt, NextCrudProvider, type NextCrudProviderProps } from "../src/next";

const router = { refresh: vi.fn(), push: vi.fn() };

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof Navigation>()),
  useRouter: () => router,
}));

function wrapperWith(props: Omit<NextCrudProviderProps, "children"> = {}) {
  return ({ children }: { children: ReactNode }) => (
    <NextCrudProvider {...props}>{children}</NextCrudProvider>
  );
}

function catchError(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }

  throw new Error("expected a throw");
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("NextCrudProvider", () => {
  it("refreshes the router after success and pushes redirects", async () => {
    const { result } = renderHook(
      () => useCrudAction({ action: async () => ({ success: true }), redirectTo: "/products" }),
      { wrapper: wrapperWith() },
    );

    await act(async () => {
      await result.current.execute();
    });

    expect(router.refresh).toHaveBeenCalledOnce();
    expect(router.push).toHaveBeenCalledWith("/products");
  });

  it("skips router.refresh() when refreshOnMutated is false", async () => {
    const { result } = renderHook(() => useCrudAction({ action: async () => ({ success: true }) }), {
      wrapper: wrapperWith({ refreshOnMutated: false }),
    });

    await act(async () => {
      await result.current.execute();
    });

    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("lets explicit props win over the preset", () => {
    const navigate = vi.fn();
    const { result } = renderHook(() => useCrudConfig(), { wrapper: wrapperWith({ navigate }) });

    result.current.navigate("/x");

    expect(navigate).toHaveBeenCalledWith("/x");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("treats a server-action redirect as an interrupt, not a failure", async () => {
    const { redirect } = await import("next/navigation");
    const redirectError = catchError(() => redirect("/login"));
    const notify = { error: vi.fn() };
    const { result } = renderHook(
      () =>
        useCrudAction({
          action: async () => {
            throw redirectError;
          },
        }),
      { wrapper: wrapperWith({ notify }) },
    );

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.serverErrors).toEqual([]);
    expect(notify.error).not.toHaveBeenCalled();
  });
});

describe("NextCrudProvider onError", () => {
  it("passes the provider-level onError through", async () => {
    const onError = vi.fn();
    const { result } = renderHook(
      () => useCrudAction({ action: async () => ({ success: false, statusCode: 401 }) }),
      { wrapper: wrapperWith({ onError }) },
    );

    await act(async () => {
      await result.current.execute();
    });

    expect(onError).toHaveBeenCalledWith({ success: false, statusCode: 401 });
  });
});

describe("isNextInterrupt", () => {
  it("detects Next control-flow errors only", async () => {
    const { notFound, redirect } = await import("next/navigation");

    expect(isNextInterrupt(catchError(() => redirect("/login")))).toBe(true);
    expect(isNextInterrupt(catchError(() => notFound()))).toBe(true);
    expect(isNextInterrupt(new Error("boom"))).toBe(false);
    expect(isNextInterrupt("boom")).toBe(false);
  });
});
