/* One button style across all four containers. Note the explicit border colour — a bare
   `border` in Tailwind 4 resolves to `currentColor`. */
const cancelBtnClass =
  "cursor-pointer rounded-control border border-border-default bg-surface-card px-3 py-1.5 text-[.8125rem] text-body transition-colors hover:border-border-translucent hover:bg-surface-raised disabled:opacity-50";

const submitBtnClass =
  "cursor-pointer rounded-control bg-accent px-3 py-1.5 text-[.8125rem] font-semibold text-accent-contrast transition-colors hover:bg-accent-hover disabled:opacity-50";

/** Cancel + Save. Same in every variant; only the band around them differs. */
export function FormActions({
  onCancel,
  isSubmitting,
}: {
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        className={cancelBtnClass}
      >
        Cancel
      </button>
      <button type="submit" disabled={isSubmitting} className={submitBtnClass}>
        {isSubmitting ? <SavingLabel /> : "Save"}
      </button>
    </>
  );
}

/** Spinner + label for the pending Save button, shared by every container. */
function SavingLabel() {
  return (
    <span className="flex items-center gap-2">
      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" aria-hidden>
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
        />
        <path
          className="opacity-75"
          d="M4 12a8 8 0 018-8"
          stroke="currentColor"
          strokeWidth="3"
          fill="none"
        />
      </svg>
      Saving…
    </span>
  );
}
