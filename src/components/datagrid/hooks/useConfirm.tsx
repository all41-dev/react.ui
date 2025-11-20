import { useCallback, useState } from "react";
import { createPortal } from "react-dom";

type ConfirmState = {
  open: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  resolve?: (v: boolean) => void;
  isDestructive?: boolean;
};

export function useConfirm() {
  const [s, setS] = useState<ConfirmState>({
    open: false,
    title: "",
  });

  const confirm = useCallback(
    (
      opts:
        | string
        | {
            title: React.ReactNode;
            description?: React.ReactNode;
            confirmText?: string;
            cancelText?: string;
            isDestructive?: boolean;
          }
    ) =>
      new Promise<boolean>((resolve) => {
        if (typeof opts === "string") {
          setS({ open: true, title: opts, resolve });
        } else {
          setS({
            open: true,
            title: opts.title,
            description: opts.description,
            confirmText: opts.confirmText ?? "Confirm",
            cancelText: opts.cancelText ?? "Cancel",
            isDestructive: opts.isDestructive ?? true,
            resolve,
          });
        }
      }),
    []
  );

  const close = (v: boolean) => {
    s.resolve?.(v);
    setS((prev) => ({ ...prev, open: false, resolve: undefined }));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") close(false);
  };

  const Dialog = s.open
    ? createPortal(
        <div
          className="fixed inset-0 z-1000 grid place-items-center bg-black/40"
          onKeyDown={onKeyDown}
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-4 shadow-2xl outline-none">
            <h3 className="text-base font-semibold">{s.title}</h3>
            {s.description && (
              <p className="mt-1 text-sm text-gray-600">{s.description}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border px-3 py-1.5 text-sm"
                onClick={() => close(false)}
                autoFocus
              >
                {s.cancelText ?? "Cancel"}
              </button>
              <button
                type="button"
                className={
                  "rounded-md px-3 py-1.5 text-sm text-white " +
                  (s.isDestructive
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-black hover:bg-zinc-900")
                }
                onClick={() => close(true)}
              >
                {s.confirmText ?? "Confirm"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return { confirm, ConfirmDialog: Dialog };
}
