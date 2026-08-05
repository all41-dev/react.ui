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

  const form = useForm<Record<string, unknown>>({
    defaultValues: { [key]: (state.row as any)[key] ?? "" },
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
        className="fixed z-[1000] flex flex-col gap-2 rounded-lg border border-border-default bg-surface-card p-3 shadow-2xl outline-none animate-pop-in"
      >
        <form onSubmit={submit} className="flex flex-col gap-2">
          {renderEditor({ column: column as any, control: form.control as any })}
          {error && (
            <p className="rounded border border-danger/30 bg-danger/10 p-2 text-xs text-danger">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="cursor-pointer rounded-control border border-border-default px-2.5 py-1 text-xs text-body hover:bg-surface-inset disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="cursor-pointer rounded-control bg-accent px-2.5 py-1 text-xs font-medium text-accent-contrast hover:bg-accent-hover disabled:opacity-50"
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
