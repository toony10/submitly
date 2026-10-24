import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { CrudProvider, useCrudForm, type ActionResult, type MutationOptions } from "../src";
import { deferred } from "./helpers";

const schema = z.object({
  name: z.string().trim().min(2, "Too short"),
});

type Values = z.input<typeof schema>;

function ProductForm({
  action,
  defaultValues = { name: "" },
  ...options
}: MutationOptions<unknown> & {
  action: (values: z.output<typeof schema>) => Promise<unknown>;
  defaultValues?: Values;
  resetOnSuccess?: boolean;
}) {
  const { form, onSubmit, serverErrors, isSubmitting } = useCrudForm({
    schema,
    defaultValues,
    action,
    ...options,
  });

  return (
    <form onSubmit={onSubmit} aria-label="product">
      <input aria-label="name" {...form.register("name")} />
      <span data-testid="field-error">{form.formState.errors.name?.message}</span>
      <ul data-testid="server-errors">
        {serverErrors.map((error, index) => (
          <li key={index}>{error}</li>
        ))}
      </ul>
      <span data-testid="submitting">{String(isSubmitting)}</span>
      <button type="submit">Save</button>
    </form>
  );
}

function setup(ui: ReactNode, provider: Parameters<typeof CrudProvider>[0] = {}) {
  const notify = { success: vi.fn(), error: vi.fn() };
  const onMutated = vi.fn();
  const navigate = vi.fn();

  render(
    <CrudProvider notify={notify} onMutated={onMutated} navigate={navigate} {...provider}>
      {ui}
    </CrudProvider>,
  );

  return { notify, onMutated, navigate };
}

function typeName(value: string) {
  fireEvent.change(screen.getByLabelText("name"), { target: { value } });
}

async function submit() {
  await act(async () => {
    fireEvent.submit(screen.getByRole("form", { name: "product" }));
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useCrudForm", () => {
  it("runs the success pipeline in order: notify → onMutated → reset → onSuccess → redirect", async () => {
    const calls: string[] = [];
    const action = vi.fn(async () => ({ success: true, message: "Saved", data: { id: 7 } }));

    const { notify, onMutated, navigate } = setup(
      <ProductForm
        action={action}
        onSuccess={(result) => calls.push(`onSuccess:${JSON.stringify(result.data)}`)}
        redirectTo={(result) => `/products/${(result.data as { id: number }).id}`}
      />,
    );
    notify.success.mockImplementation(() => calls.push("notify"));
    onMutated.mockImplementation(() => {
      calls.push(`onMutated:${(screen.getByLabelText("name") as HTMLInputElement).value}`);
    });
    navigate.mockImplementation((to: string) => calls.push(`navigate:${to}`));

    typeName("  Lamp  ");
    await submit();

    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(action).toHaveBeenCalledWith({ name: "Lamp" });
    expect(calls).toEqual([
      "notify",
      "onMutated:  Lamp  ",
      'onSuccess:{"id":7}',
      "navigate:/products/7",
    ]);
    expect(notify.success).toHaveBeenCalledWith(expect.objectContaining({ message: "Saved" }));
    expect((screen.getByLabelText("name") as HTMLInputElement).value).toBe("");
  });

  it("does not call the action when client validation fails", async () => {
    const action = vi.fn(async () => ({ success: true }));
    setup(<ProductForm action={action} />);

    typeName("a");
    await submit();

    await waitFor(() => expect(screen.getByTestId("field-error").textContent).toBe("Too short"));
    expect(action).not.toHaveBeenCalled();
  });

  it("keeps values when resetOnSuccess is false", async () => {
    setup(<ProductForm action={async () => ({ success: true })} resetOnSuccess={false} />);

    typeName("Lamp");
    await submit();

    expect((screen.getByLabelText("name") as HTMLInputElement).value).toBe("Lamp");
  });

  it("shows form errors and field errors from a failed result", async () => {
    const onError = vi.fn();
    const { notify, onMutated } = setup(
      <ProductForm
        onError={onError}
        action={async () => ({
          success: false,
          message: "Could not save",
          errors: ["Duplicate SKU"],
          fieldErrors: { name: ["Name taken", "Second"], "": ["Root issue"] },
        })}
      />,
    );

    typeName("Lamp");
    await submit();

    await waitFor(() => expect(screen.getByTestId("field-error").textContent).toBe("Name taken"));
    expect(screen.getByTestId("server-errors").textContent).toBe("Duplicate SKURoot issue");
    expect(notify.error).toHaveBeenCalledWith(expect.objectContaining({ message: "Could not save" }));
    expect(notify.success).not.toHaveBeenCalled();
    expect(onMutated).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledOnce();
    expect((screen.getByLabelText("name") as HTMLInputElement).value).toBe("Lamp");
  });

  it("maps a thrown error instead of leaving an unhandled rejection", async () => {
    const { notify } = setup(
      <ProductForm
        action={async () => {
          throw new Error("Network down");
        }}
      />,
    );

    typeName("Lamp");
    await submit();

    await waitFor(() => expect(screen.getByTestId("server-errors").textContent).toBe("Network down"));
    expect(notify.error).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: "Network down" }),
    );
    expect(screen.getByTestId("submitting").textContent).toBe("false");
  });

  it("uses the provider mapError and normalize", async () => {
    setup(
      <ProductForm
        action={async () => {
          throw { response: { status: 409 } };
        }}
      />,
      {
        mapError: (error) => ({
          success: false,
          errors: [`HTTP ${(error as { response: { status: number } }).response.status}`],
        }),
      },
    );

    typeName("Lamp");
    await submit();

    await waitFor(() => expect(screen.getByTestId("server-errors").textContent).toBe("HTTP 409"));
  });

  it("per-call normalize wins over the provider", async () => {
    const onSuccess = vi.fn();
    setup(
      <ProductForm
        action={async () => ({ ok: true, payload: 1 })}
        normalize={(raw) => ({ success: (raw as { ok: boolean }).ok, data: "per-call" })}
        onSuccess={onSuccess}
      />,
      { normalize: () => ({ success: false }) },
    );

    typeName("Lamp");
    await submit();

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ success: true, data: "per-call" }));
  });

  it("ignores a second submit while the first is in flight", async () => {
    const pending = deferred<ActionResult>();
    const action = vi.fn(() => pending.promise);
    setup(<ProductForm action={action} />);

    typeName("Lamp");
    await submit();
    await submit();
    await submit();

    expect(screen.getByTestId("submitting").textContent).toBe("true");
    await act(async () => pending.resolve({ success: true }));

    expect(action).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("submitting").textContent).toBe("false");
  });

  it("per-call notify overrides the provider handler", async () => {
    const success = vi.fn();
    const { notify } = setup(
      <ProductForm action={async () => ({ success: true, message: "Saved" })} notify={{ success }} />,
    );

    typeName("Lamp");
    await submit();

    await waitFor(() => expect(success).toHaveBeenCalledOnce());
    expect(notify.success).not.toHaveBeenCalled();
  });

  it("notify: false silences notifications", async () => {
    const { notify } = setup(
      <ProductForm action={async () => ({ success: false, message: "Nope" })} notify={false} />,
    );

    typeName("Lamp");
    await submit();

    expect(notify.error).not.toHaveBeenCalled();
  });

  it("skips notify when the result has no message", async () => {
    const { notify } = setup(<ProductForm action={async () => ({ success: true })} />);

    typeName("Lamp");
    await submit();

    expect(notify.success).not.toHaveBeenCalled();
  });

  it("onMutated: false skips the provider refresh", async () => {
    const onSuccess = vi.fn();
    const { onMutated } = setup(
      <ProductForm action={async () => ({ success: true })} onMutated={false} onSuccess={onSuccess} />,
    );

    typeName("Lamp");
    await submit();

    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onMutated).not.toHaveBeenCalled();
  });

  it("works without a provider", async () => {
    const onSuccess = vi.fn();
    render(<ProductForm action={async () => undefined} onSuccess={onSuccess} />);

    typeName("Lamp");
    await submit();

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith({ success: true }));
  });
  describe("provider onError", () => {
    it("runs after notify.error and before the per-call onError", async () => {
      const calls: string[] = [];
      const providerOnError = vi.fn(() => calls.push("provider"));
      const { notify } = setup(
        <ProductForm
          action={async () => ({ success: false, statusCode: 401, message: "Expired" })}
          onError={() => calls.push("call")}
        />,
        { onError: providerOnError },
      );
      notify.error.mockImplementation(() => calls.push("notify"));

      typeName("Lamp");
      await submit();

      await waitFor(() => expect(calls).toEqual(["notify", "provider", "call"]));
      expect(providerOnError).toHaveBeenCalledWith({
        success: false,
        statusCode: 401,
        message: "Expired",
      });
    });

    it("also runs for a mapped thrown error, not for success or client validation failures", async () => {
      const onError = vi.fn();
      const action = vi
        .fn<(values: { name: string }) => Promise<ActionResult>>()
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error("Network down"));
      setup(<ProductForm action={action} />, { onError });

      typeName("x");
      await submit();
      expect(action).not.toHaveBeenCalled();

      typeName("Lamp");
      await submit();
      await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
      expect(onError).not.toHaveBeenCalled();

      typeName("Lamp 2");
      await submit();
      await waitFor(() => expect(onError).toHaveBeenCalledOnce());
      expect(onError).toHaveBeenCalledWith({
        success: false,
        message: "Network down",
        errors: ["Network down"],
      });
    });

    it("is overridden by a nested provider", async () => {
      const outer = vi.fn();
      const inner = vi.fn();
      render(
        <CrudProvider onError={outer}>
          <CrudProvider onError={inner}>
            <ProductForm action={async () => ({ success: false })} />
          </CrudProvider>
        </CrudProvider>,
      );

      typeName("Lamp");
      await submit();

      await waitFor(() => expect(inner).toHaveBeenCalledOnce());
      expect(outer).not.toHaveBeenCalled();
    });

    it("is skipped for interrupts", async () => {
      const onError = vi.fn();
      const onCallError = vi.fn();
      const { notify } = setup(
        <ProductForm
          action={async () => {
            throw new Error("NEXT_REDIRECT");
          }}
          onError={onCallError}
        />,
        { onError, isInterrupt: () => true },
      );

      typeName("Lamp");
      await submit();

      await waitFor(() => expect(screen.getByTestId("submitting").textContent).toBe("false"));
      expect(onError).not.toHaveBeenCalled();
      expect(onCallError).not.toHaveBeenCalled();
      expect(notify.error).not.toHaveBeenCalled();
    });
  });

  describe("errors thrown by your own callbacks", () => {
    function renderForm(
      provider: Parameters<typeof CrudProvider>[0],
      options: Partial<MutationOptions<unknown>> & {
        action: () => Promise<ActionResult>;
      },
    ) {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <CrudProvider {...provider}>{children}</CrudProvider>
      );

      return renderHook(
        () => useCrudForm({ schema, defaultValues: { name: "Lamp" }, ...options }),
        { wrapper },
      );
    }

    const throws = () => {
      throw new Error("cb");
    };

    it.each([
      ["onSuccess", {}, { action: async () => ({ success: true }), onSuccess: throws }],
      ["onMutated", { onMutated: throws }, { action: async () => ({ success: true }) }],
      [
        "navigate",
        { navigate: throws },
        { action: async () => ({ success: true }), redirectTo: "/next" },
      ],
      [
        "a notify handler",
        { notify: { error: throws } },
        { action: async () => ({ success: false, message: "No" }) },
      ],
      ["the provider onError", { onError: throws }, { action: async () => ({ success: false }) }],
      ["the per-call onError", {}, { action: async () => ({ success: false }), onError: throws }],
    ])("propagate from %s: onSubmit rejects and the form settles", async (_name, provider, options) => {
      const { result } = renderForm(provider, options);

      await act(async () => {
        await expect(result.current.onSubmit()).rejects.toThrow("cb");
      });

      expect(result.current.form.formState.isSubmitting).toBe(false);

      // The in-flight guard is released: a later submit runs again.
      await act(async () => {
        await expect(result.current.onSubmit()).rejects.toThrow("cb");
      });
    });

    it("never rejects because of the action itself", async () => {
      const { result } = renderForm(
        {},
        {
          action: async () => {
            throw new Error("from the action");
          },
        },
      );

      await act(async () => {
        await expect(result.current.onSubmit()).resolves.toBeUndefined();
      });

      expect(result.current.serverErrors).toEqual(["from the action"]);
    });
  });
});
