import type { Cell } from "@tanstack/react-table";
import { useContext, useId, useState } from "react";
import { toast } from "sonner";

import { getApiMessage } from "../../../../api/errors";
import { DataGridContext } from "../../DataGridContext";
import { SwitchTrack } from "../editors/SwitchTrack";

/**
 * A switch column with `cellEdit`: the track in the cell, toggled and persisted in one
 * click through `onPersist("cell")`, with no popover. The track shows the row's stored
 * value, so a refused write leaves it where it was once the toast has said why.
 */
export function SwitchCell<TRow extends object>({
  c,
  toForm,
  label,
}: {
  c: Cell<TRow, unknown>;
  /** The column's `meta.toForm`, when it has one. */
  toForm?: (value: unknown, row: TRow) => unknown;
  label: string;
}) {
  const ctx = useContext(DataGridContext);
  const id = useId().replace(/:/g, "_");
  const [saving, setSaving] = useState(false);

  const row = c.row.original;
  const raw = c.getValue();
  /* Through `toForm`, like every editor: the stored shape may not be the boolean. */
  const checked = Boolean(toForm ? toForm(raw, row) : raw);

  const toggle = async (next: boolean) => {
    if (!ctx || saving) return;
    setSaving(true);
    try {
      await ctx.saveCell(row, c.column.id, next);
    } catch (e) {
      toast.error(getApiMessage(e, "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    /* The row's own click (select, open) must not fire alongside the toggle. */
    <span className="inline-flex" onClick={(e) => e.stopPropagation()}>
      <SwitchTrack
        id={id}
        checked={checked}
        onChange={(next) => void toggle(next)}
        hasError={false}
        ariaLabel={label}
        inputProps={saving ? { disabled: true } : undefined}
        variant="cell"
      />
    </span>
  );
}
