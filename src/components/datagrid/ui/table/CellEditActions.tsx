/** Error line and the Cancel / Save pair at the foot of the cell-edit popover. */
export function CellEditActions({
  error,
  saving,
  onCancel,
}: {
  error: string | null;
  saving: boolean;
  onCancel: () => void;
}) {
  return (
    <>
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
    </>
  );
}
