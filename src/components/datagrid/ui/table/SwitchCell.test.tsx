import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { DataGrid, type DataGridProps } from "../../DataGrid";
import type { WithMeta } from "../../types/column";

type Row = { id: number; name: string; active: boolean };

const ROWS: Row[] = [
  { id: 1, name: "Leanne", active: false },
  { id: 2, name: "Ervin", active: true },
];

const schema = z.object({ name: z.string(), active: z.boolean() });

const COLUMNS: WithMeta<Row, any>[] = [
  { accessorKey: "name", header: "Name", meta: { label: "Name", editor: "text" } },
  {
    accessorKey: "active",
    header: "Active",
    meta: { label: "Active", editor: "switch", cellEdit: true },
  },
];

function renderGrid(props: Partial<DataGridProps<Row, any>> = {}) {
  const onPersist = vi.fn(
    async (_m: string, v: unknown, prev?: Row): Promise<Row> =>
      ({ ...prev!, ...(v as object) }) as Row
  );
  const utils = render(
    <DataGrid<Row, any>
      title="People"
      columns={COLUMNS}
      zodSchema={schema as never}
      initialData={ROWS}
      onPersist={onPersist}
      {...props}
    />
  );
  return { ...utils, onPersist };
}

const switches = () => screen.getAllByRole("checkbox", { name: "Active" });

describe("a switch column with cellEdit", () => {
  it("renders the track in the cell, showing the stored value", async () => {
    renderGrid();
    await waitFor(() => expect(switches()).toHaveLength(2));
    expect(switches()[0]).not.toBeChecked();
    expect(switches()[1]).toBeChecked();
    // No popover trigger: the click is the edit.
    expect(screen.queryByTitle("Click to edit")).toBeNull();
  });

  it("toggles and persists one value through onPersist('cell'), with no popover", async () => {
    const user = userEvent.setup({ delay: null });
    const { onPersist } = renderGrid();
    await waitFor(() => expect(switches()).toHaveLength(2));

    await user.click(switches()[0]);

    await waitFor(() => expect(onPersist).toHaveBeenCalledTimes(1));
    const [mode, values, prev] = onPersist.mock.calls[0];
    expect(mode).toBe("cell");
    expect(values).toEqual({ name: "Leanne", active: true });
    expect(prev).toBe(ROWS[0]);
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(switches()[0]).toBeChecked());
  });

  it("does not fire the row click", async () => {
    const user = userEvent.setup({ delay: null });
    const onRowClick = vi.fn();
    renderGrid({ onRowClick });
    await waitFor(() => expect(switches()).toHaveLength(2));

    await user.click(switches()[1]);

    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("leaves the track where it was when the write is refused", async () => {
    const user = userEvent.setup({ delay: null });
    const onPersist = vi.fn(async () => {
      throw new Error("Locked");
    });
    renderGrid({ onPersist });
    await waitFor(() => expect(switches()).toHaveLength(2));

    await user.click(switches()[0]);

    await waitFor(() => expect(onPersist).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(switches()[0]).not.toBeDisabled());
    expect(switches()[0]).not.toBeChecked();
  });

  it("is a plain form switch inside a row session", async () => {
    const user = userEvent.setup({ delay: null });
    const { onPersist } = renderGrid({ editContainer: "row" });
    await waitFor(() => expect(switches()).toHaveLength(2));

    await user.click(screen.getByText("Leanne").closest("td")!);
    await waitFor(() =>
      expect(document.querySelector("tr[data-editing]")).not.toBeNull()
    );
    const editing = document.querySelector<HTMLElement>("tr[data-editing]")!;

    // The in-session switch belongs to the row form: toggling it persists nothing yet.
    await user.click(within(editing).getByRole("checkbox", { name: "Active" }));
    expect(onPersist).not.toHaveBeenCalled();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(onPersist).toHaveBeenCalledTimes(1));
    expect(onPersist.mock.calls[0][0]).toBe("edit");
    expect(onPersist.mock.calls[0][1]).toEqual({ name: "Leanne", active: true });
  });
});
