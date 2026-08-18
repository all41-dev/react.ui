import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import type { WithMeta } from "../../types/column";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { useAnchoredPosition, type Anchor } from "../../hooks/useAnchoredPosition";
import { getAccessorKey } from "../../utils/getAccessorKey";
import { getPath, setPath } from "../../utils/objectPath";
import { renderEditor } from "../editors/EditorRegistry";
import { CellEditActions } from "./CellEditActions";

/** One field, keyed by the column's accessor — the shape is only known at runtime. */
type CellForm = Record<string, unknown>;

export type CellEditState<TRow> = {
  row: TRow;
  columnId: string;
  anchor: Anchor;
};

type Props<TRow extends object, TForm extends object> = {
  state: CellEditState<TRow>;
  column: WithMeta<TRow, TForm>;
  onCancel: () => void;
  /** Persists the single changed value; throw to surface an error in the popover. */
  onSave: (value: unknown) => Promise<void>;
};

const EST_HEIGHT = 220;

/**
 * Single-field editor anchored to a cell (`cellEdit: true` in the column meta). Esc or any
 * scroll closes it, and clicking outside cancels through the transparent backdrop. Reuses
 * `renderEditor`, so the field looks the same as it does in the full form — markdown and
 * code included.
 */
export function CellEditPopover<TRow extends object, TForm extends object>({
  state,
  column,
  onCancel,
  onSave,
}: Props<TRow, TForm>) {
  const key = getAccessorKey(column) ?? "";
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const trapRef = useFocusTrap<HTMLDivElement>(true);
  const idPrefix = useId().replace(/:/g, "_");

  /*
   * Seeded through `toForm`, the same hook `computeDefaults` uses for the full form.
   * Reading the row value directly meant the popover showed the STORED shape while the
   * cell behind it showed the formatted one, and the editor for a value the consumer
   * stores in cents opened on "1250" instead of "12.50".
   */
  const raw = getPath(state.row, key);
  const seeded = column.meta?.toForm ? column.meta.toForm(raw, state.row) : raw;
  const defaultValues: CellForm = {};
  // Through `setPath`, so a nested accessor key seeds the field react-hook-form actually
  // reads rather than a flat `"user.name"` key it never looks at.
  setPath(defaultValues, key, seeded ?? "");

  const form = useForm<CellForm>({ defaultValues });

  // Spec: Esc or scroll closes. Scroll uses capture so the grid's own scroll
  // container triggers it too — the anchor rect is stale the moment anything moves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // A field that already used Escape — a code editor closing its completion popup or
      // its search panel — calls preventDefault, and cancelling on top of that would
      // throw the edit away instead.
      if (e.key === "Escape" && !e.defaultPrevented && !saving) onCancel();
    };
    const onScroll = (e: Event) => {
      if (saving) return;
      // Capture phase reaches every descendant scroll, the popover's own included —
      // scrolling a code editor or a textarea inside it must not discard the edit.
      if (trapRef.current?.contains(e.target as Node)) return;
      onCancel();
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [onCancel, saving, trapRef]);

  const pos = useAnchoredPosition(state.anchor, EST_HEIGHT);

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    setSaving(true);
    try {
      await onSave(getPath(values, key));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  });

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[999]"
        onClick={() => !saving && onCancel()}
        aria-hidden
      />
      <div
        ref={trapRef}
        role="dialog"
        aria-label={`Edit ${String(column.meta?.label ?? column.header ?? key)}`}
        tabIndex={-1}
        style={pos}
        /* Portaled, so it restates the type stack the same way the overlay shell does. */
        className="fixed z-[1000] flex flex-col gap-2.5 rounded-surface border border-border-default bg-surface-card p-3 font-sans text-[.8125rem] text-body shadow-[var(--elev-3)] outline-none animate-pop-in"
      >
        <form onSubmit={submit} className="flex flex-col gap-2">
          {/* The popover edits one field of an unknown shape, so the column's TForm is
              restated as the loose record this local form is keyed by. */}
          {renderEditor<TRow, CellForm>({
            column: column as unknown as WithMeta<TRow, CellForm>,
            control: form.control,
            idPrefix,
            /* There is no section here to take a variant from. A switch gets the same
               stacked chrome as every other editor the popover opens. */
            variant: "grid",
          })}
          <CellEditActions error={error} saving={saving} onCancel={onCancel} />
        </form>
      </div>
    </>,
    document.body
  );
}
