import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "./useFocusTrap";

type ConfirmState = {
  open: boolean;
  title: React.ReactNode;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
};

export function useConfirm() {
  const [s, setS] = useState<ConfirmState>({
    open: false,
    title: "",
  });

  /*
   * The pending resolver lives in a ref rather than in state so every exit path can
   * settle it. Previously a second confirm() while one was open replaced the stored
   * resolver and the first promise never settled — the awaiting caller hung forever.
   * Unmounting mid-prompt had the same effect.
   */
  const pendingResolve = useRef<((v: boolean) => void) | null>(null);

  const settle = useCallback((v: boolean) => {
    pendingResolve.current?.(v);
    pendingResolve.current = null;
  }, []);

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
        settle(false); // superseded prompt resolves rather than hanging
        pendingResolve.current = resolve;
        if (typeof opts === "string") {
          setS({ open: true, title: opts });
        } else {
          setS({
            open: true,
            title: opts.title,
            description: opts.description,
            confirmText: opts.confirmText ?? "Confirm",
            cancelText: opts.cancelText ?? "Cancel",
            isDestructive: opts.isDestructive ?? true,
          });
        }
      }),
    [settle]
  );

  useEffect(() => () => settle(false), [settle]);

  const close = useCallback(
    (v: boolean) => {
      settle(v);
      setS((prev) => ({ ...prev, open: false }));
    },
    [settle]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") close(false);
  };

  // Same trap as the edit overlays: focus moves in on open (Cancel first) and
  // returns to the triggering control on close.
  const trapRef = useFocusTrap<HTMLDivElement>(s.open);

  const Dialog = s.open
    ? createPortal(
        <div
          className="fixed inset-0 z-1000 grid place-items-center bg-black/40 animate-backdrop-in"
          onKeyDown={onKeyDown}
          role="dialog"
          aria-modal="true"
        >
          <div
            ref={trapRef}
            tabIndex={-1}
            className="w-full max-w-sm rounded-xl bg-surface-card p-4 shadow-2xl outline-none animate-pop-in"
          >
            <h3 className="text-base font-semibold">{s.title}</h3>
            {s.description && (
              <p className="mt-1 text-sm text-muted">{s.description}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-border-default px-3 py-1.5 text-sm text-body hover:bg-surface-inset"
                onClick={() => close(false)}
                autoFocus
              >
                {s.cancelText ?? "Cancel"}
              </button>
              <button
                type="button"
                className={
                  "rounded-md px-3 py-1.5 text-sm text-accent-contrast transition-colors " +
                  (s.isDestructive
                    ? "bg-danger hover:opacity-90"
                    : "bg-accent hover:bg-accent-hover")
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
