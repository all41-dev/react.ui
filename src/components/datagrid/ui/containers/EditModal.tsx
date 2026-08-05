import type { ZodTypeAny } from "zod";
import type { WithMeta } from "../../types/column";
import { EditFormBody, getRowId, type FormLayoutConfig } from "./EditFormBody";
import { useEffect } from "react";
import { createPortal } from "react-dom";

function ModalShell({
  onCancel,
  isSubmitting,
  children,
}: {
  onCancel: () => void;
  isSubmitting: boolean;
  children: React.ReactNode;
}) {
  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        onCancel();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onCancel, isSubmitting]);

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] grid place-items-center bg-black/40 p-4"
      onClick={(e) => {
        // Close modal when clicking backdrop
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-surface-card rounded-lg shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

export function EditModal<TRow extends object, TForm extends object>({
  open,
  mode,
  row,
  columns,
  zodSchema,
  formLayout,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  mode: "create" | "edit";
  row?: TRow;
  columns: WithMeta<TRow, TForm>[];
  zodSchema: ZodTypeAny;
  formLayout?: FormLayoutConfig;
  onCancel: () => void;
  onSubmit: (values: TForm) => void | Promise<void>;
}) {
  const formKey = mode === "edit" ? `edit-${getRowId(row)}` : "create";

  if (!open) return null;

  return (
    <ModalShell onCancel={onCancel} isSubmitting={false}>
      <EditFormBody<TRow, TForm>
        key={formKey}
        mode={mode}
        row={row}
        columns={columns}
        zodSchema={zodSchema}
        formLayout={formLayout}
        onCancel={onCancel}
        onSubmit={onSubmit}
        variant="modal"
      />
    </ModalShell>
  );
}
