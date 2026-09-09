import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { RecordForm } from "./RecordForm";
import type { WithMeta } from "./datagrid/types/column";

type Row = { id: string; name: string; tier: string; enabled: boolean; note: string };

const ROW: Row = { id: "r1", name: "Ada", tier: "gold", enabled: true, note: "" };

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  tier: z.string(),
  enabled: z.boolean(),
  note: z.string(),
});
type Form = z.infer<typeof schema>;

const COLUMNS: WithMeta<Row, Form>[] = [
  { accessorKey: "name", header: "Name", meta: { label: "Name", editor: "text" } },
  {
    accessorKey: "tier",
    header: "Tier",
    meta: {
      label: "Tier",
      editor: "select",
      options: [
        { value: "gold", label: "Gold" },
        { value: "silver", label: "Silver" },
      ],
      description: "Billing tier of the account.",
    },
  },
  {
    accessorKey: "enabled",
    header: "Enabled",
    meta: { label: "Enabled", editor: "switch" },
  },
  { accessorKey: "note", header: "Note", meta: { label: "Note", editor: "text" } },
];

function renderForm(over: Partial<React.ComponentProps<typeof RecordForm<Row, Form>>> = {}) {
  const onSubmit = vi.fn(async () => {});
  const onCancel = vi.fn();
  const onDirtyChange = vi.fn();
  const utils = render(
    <RecordForm<Row, Form>
      row={ROW}
      columns={COLUMNS}
      zodSchema={schema}
      onSubmit={onSubmit}
      onCancel={onCancel}
      onDirtyChange={onDirtyChange}
      {...over}
    />
  );
  return { ...utils, onSubmit, onCancel, onDirtyChange };
}

const save = () => screen.getByRole("button", { name: "Save" });

describe("RecordForm — on its own", () => {
  it("renders the columns' fields, seeded from the row, with no grid around it", () => {
    renderForm();

    expect(screen.getByLabelText("Name")).toHaveValue("Ada");
    expect(screen.getByLabelText("Tier")).toHaveValue("gold");
    expect(screen.getByLabelText("Enabled")).toBeChecked();
  });

  it("carries a field description without a grid to borrow the tooltip from", () => {
    renderForm();

    expect(screen.getByLabelText("Tier")).toHaveAccessibleDescription(
      "Billing tier of the account."
    );
  });

  it("is named by its title, and the form element carries the given id", () => {
    renderForm({ title: "Record", id: "rec-r1" });

    const form = screen.getByRole("form", { name: "Record" });
    expect(form).toHaveAttribute("id", "rec-r1");
  });

  it("says Edit for a row and Create without one", () => {
    const { unmount } = renderForm();
    expect(screen.getByRole("heading", { name: "Edit" })).toBeInTheDocument();
    unmount();

    renderForm({ row: undefined });
    expect(screen.getByRole("heading", { name: "Create" })).toBeInTheDocument();
  });

  it("renders the intro above the fields", () => {
    renderForm({ intro: <p>uuid r1</p> });

    const intro = screen.getByText("uuid r1");
    expect(
      intro.compareDocumentPosition(screen.getByLabelText("Name")) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("focuses the first editable control when asked to", () => {
    renderForm({ autoFocus: true });

    expect(screen.getByLabelText("Name")).toHaveFocus();
  });
});

describe("RecordForm — submit and cancel", () => {
  it("hands the schema's output and the keys the user changed to onSubmit", async () => {
    const user = userEvent.setup({ delay: null });
    const { onSubmit } = renderForm();

    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Bo");
    await user.click(save());

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const [values, meta] = onSubmit.mock.calls[0] as unknown as [
      Form,
      { dirtyKeys: ReadonlySet<string> },
    ];
    expect(values).toEqual({ name: "Bo", tier: "gold", enabled: true, note: "" });
    expect([...meta.dirtyKeys]).toEqual(["name"]);
  });

  it("submits with no dirty keys when nothing was touched", async () => {
    const user = userEvent.setup({ delay: null });
    const { onSubmit } = renderForm();

    await user.click(save());

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const meta = onSubmit.mock.calls[0][1] as { dirtyKeys: ReadonlySet<string> };
    expect(meta.dirtyKeys.size).toBe(0);
  });

  it("shows the message and keeps the draft when onSubmit throws", async () => {
    const user = userEvent.setup({ delay: null });
    const { onSubmit } = renderForm();
    onSubmit.mockRejectedValueOnce(new Error("409 conflict"));

    await user.clear(screen.getByLabelText("Name"));
    await user.type(screen.getByLabelText("Name"), "Bo");
    await user.click(save());

    expect(await screen.findByRole("alert")).toHaveTextContent("409 conflict");
    expect(screen.getByLabelText("Name")).toHaveValue("Bo");
  });

  it("names the invalid field on submit rather than sending it", async () => {
    const user = userEvent.setup({ delay: null });
    const { onSubmit } = renderForm();

    await user.clear(screen.getByLabelText("Name"));
    await user.click(save());

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("cancels from the button", async () => {
    const user = userEvent.setup({ delay: null });
    const { onCancel } = renderForm();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe("RecordForm — dirty state", () => {
  it("reports dirty once a field differs, and clean again when it is put back", async () => {
    const user = userEvent.setup({ delay: null });
    const { onDirtyChange } = renderForm();

    expect(onDirtyChange).toHaveBeenLastCalledWith(false);

    await user.type(screen.getByLabelText("Name"), "!");
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true));

    await user.type(screen.getByLabelText("Name"), "{Backspace}");
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(false));
  });

  it("reports clean when it unmounts with a draft", async () => {
    const user = userEvent.setup({ delay: null });
    const { onDirtyChange, unmount } = renderForm();

    await user.type(screen.getByLabelText("Name"), "!");
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true));

    unmount();

    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });
});

describe("RecordForm — keyboard", () => {
  it("cancels on Escape inside the form", async () => {
    const user = userEvent.setup({ delay: null });
    const { onCancel } = renderForm();

    screen.getByLabelText("Name").focus();
    await user.keyboard("{Escape}");

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("saves on Ctrl+S inside the form", async () => {
    const user = userEvent.setup({ delay: null });
    const { onSubmit } = renderForm();

    screen.getByLabelText("Name").focus();
    await user.keyboard("{Control>}s{/Control}");

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  });
});
