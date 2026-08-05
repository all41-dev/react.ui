import type { ZodType } from "zod";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import type { WithMeta } from "../../types/column";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { EditFormBody, getRowId, type FormLayoutConfig } from "./EditFormBody";

export type OverlayPosition = "center" | "right" | "bottom";

export type OverlayEditContainerProps<TRow extends object, TForm extends object> = {
  open: boolean;
  mode: "create" | "edit";
  row?: TRow;
  columns: WithMeta<TRow, TForm>[];
  zodSchema: ZodType<TForm>;
  formLayout?: FormLayoutConfig;
  onCancel: () => void;
  onSubmit: (values: TForm) => void | Promise<void>;
};

/* Sizes per the design spec: modal min(640px, vw−32px) centered; right drawer
   min(460px, 100%); bottom sheet max 82vh with a rounded top. */
const PANEL: Record<OverlayPosition, string> = {
  center:
    "w-[min(640px,calc(100vw-32px))] max-h-[90vh] rounded-lg animate-pop-in",
  right:
    "absolute right-0 top-0 h-full w-full max-w-[460px] animate-drawer-in",
  bottom:
    "absolute bottom-0 left-0 right-0 max-h-[82vh] rounded-t-xl animate-sheet-in",
};

/**
 * The one overlay shell behind modal / right drawer / bottom sheet. Owns
 * everything a modal surface owes its users: portal + scrim, Escape and
 * scrim-click to cancel (both refused mid-submit), focus trap with focus
 * return, aria-labelledby wired to the real form heading, and a body scroll
 * lock while open.
 */
export function OverlayEditContainer<TRow extends object, TForm extends object>({
  position,
  open,
  mode,
  row,
  columns,
  zodSchema,
  formLayout,
  onCancel,
  onSubmit,
}: OverlayEditContainerProps<TRow, TForm> & { position: OverlayPosition }) {
  // The submit flag lives in react-hook-form inside EditFormBody; it reports up so
  // the shell can refuse Escape/scrim dismissal mid-save. (#17 hardcoded this false.)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const titleId = useId();
  const trapRef = useFocusTrap<HTMLDivElement>(open);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, isSubmitting, onCancel]);

  if (!open) return null;

  const formKey = mode === "edit" ? `edit-${getRowId(row)}` : "create";

  return createPortal(
    <div
      className={[
        "fixed inset-0 z-[1000] bg-black/40 animate-backdrop-in",
        position === "center" ? "grid place-items-center p-4" : "",
      ].join(" ")}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onCancel();
      }}
    >
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`${PANEL[position]} flex flex-col overflow-hidden bg-surface-card shadow-2xl outline-none`}
      >
        <EditFormBody<TRow, TForm>
          key={formKey}
          mode={mode}
          row={row}
          columns={columns}
          zodSchema={zodSchema}
          formLayout={formLayout}
          onCancel={onCancel}
          onSubmit={onSubmit}
          variant={position === "center" ? "modal" : "drawer"}
          titleId={titleId}
          onSubmittingChange={setIsSubmitting}
        />
      </div>
    </div>,
    document.body
  );
}
