import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import type { WithMeta } from "../../types/column";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { renderEditor } from "../editors/EditorRegistry";

export type CellEditState<TRow> = {
  row: TRow;
  columnId: string;
  anchor: { top: number; bottom: number; left: number; width: number };
};

type Props<TRow extends object, TForm extends object> = {
  state: CellEditState<TRow>;
  column: WithMeta<TRow, TForm>;
  onCancel: () => void;
  /** Persists the single changed value; throw to surface an error in the popover. */
  onSave: (value: unknown) => Promise<void>;
};

const POPOVER_WIDTH = 320;
const EST_HEIGHT = 220;

/**
 * Single-field editor anchored to a cell (`cellEdit: true` meta). Esc or any
 * scroll closes it per spec; clicking outside cancels via the transparent
 * backdrop. Reuses renderEditor so the field looks exactly like it does in the
 * full form — including markdown/code.
 */
export function CellEditPopover<TRow extends object, TForm extends object>({
  state,
  column,
  onCancel,
  onSave,
}: Props<TRow, TForm>) {
  const key = (column as any).accessorKey as string;
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const trapRef = useFocusTrap<HTMLDivElement>(true);

  /*
   * Seeded through `toForm`, the same hook `computeDefaults` uses for the full form.
   * Reading the row value directly meant the popover showed the STORED shape while the
   * cell behind it showed the formatted one, and the editor for a value the consumer
   * stores in cents opened on "1250" instead of "12.50".
   */
  const form = useForm<Record<string, unknown>>({
    defaultValues: {
      [key]: (() => {
        const raw = (state.row as Record<string, unknown>)[key];
        const seeded = column.meta?.toForm
          ? column.meta.toForm(raw, state.row)
          : raw;
        return seeded ?? "";
      })(),
    },
  });

  // Spec: Esc or scroll closes. Scroll uses capture so the grid's own scroll
  // container triggers it too — the anchor rect is stale the moment anything moves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onCancel();
    };
    const onScroll = () => {
      if (!saving) onCancel();
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [onCancel, saving]);

  const pos = useMemo(() => {
    const { anchor } = state;
    const width = Math.max(POPOVER_WIDTH, Math.min(anchor.width, 480));
    const left = Math.min(Math.max(8, anchor.left), window.innerWidth - width - 8);
    const openUp = anchor.bottom + EST_HEIGHT > window.innerHeight;
    return openUp
      ? { left, width, bottom: window.innerHeight - anchor.top + 4 }
      : { left, width, top: anchor.bottom + 4 };
  }, [state]);

  const submit = form.handleSubmit(async (values) => {
    setError(null);
    setSaving(true);
    try {
      await onSave(values[key]);
    } catch (e: any) {
      setError(e?.message ?? "Save failed");
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
        aria-label={`Edit ${String((column as any).meta?.label ?? column.header ?? key)}`}
        tabIndex={-1}
        style={pos}
        /* `.og-pop`. Portaled, so it restates the type stack like the overlay shell. */
        className="fixed z-[1000] flex flex-col gap-2.5 rounded-surface border border-border-default bg-surface-card p-3 font-sans text-[.8125rem] text-body shadow-[var(--elev-3)] outline-none animate-pop-in"
      >
        <form onSubmit={submit} className="flex flex-col gap-2">
          {renderEditor({ column: column as any, control: form.control as any })}
          {error && (
            <p className="rounded-control border border-[color-mix(in_srgb,var(--rui-danger)_38%,transparent)] bg-[color-mix(in_srgb,var(--rui-danger)_12%,transparent)] px-[11px] py-[9px] text-[.75rem] text-danger">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="cursor-pointer rounded-control border border-border-default px-2.5 py-1 text-[.75rem] text-body transition-colors hover:border-border-translucent hover:bg-surface-raised disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="cursor-pointer rounded-control bg-accent px-2.5 py-1 text-[.75rem] font-semibold text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </>,
    document.body
  );
}
