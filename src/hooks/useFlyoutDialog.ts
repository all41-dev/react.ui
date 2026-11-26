import { useEffect, useRef } from "react";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Dialog behaviour for a floating panel (a flyout, a popover): remembered focus, initial focus, a Tab
 * trap that wraps at both ends, Escape, and close-on-outside-pointerdown. The
 * panel declares `aria-modal`, so focus containment is required, not optional.
 */
export function useFlyoutDialog(isOpen: boolean, onClose: () => void) {
  const slotRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      const slot = slotRef.current;
      if (!slot) return;
      if (!slot.contains(e.target as Node)) onClose();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", handlePointerDown, true);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    returnFocusRef.current = document.activeElement as HTMLElement | null;
    // A `data-autofocus` element wins over DOM order (a filter field below the
    // panel's header); otherwise the first focusable.
    const panel = panelRef.current;
    (
      panel?.querySelector<HTMLElement>("[data-autofocus]:not([disabled])") ??
      panel?.querySelector<HTMLElement>(FOCUSABLE)
    )?.focus();

    return () => {
      // Skip restoring when the element has left the document — focus has
      // already moved on, e.g. the page navigated.
      const target = returnFocusRef.current;
      if (target?.isConnected) target.focus();
    };
  }, [isOpen]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab") return;

    const nodes = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!nodes || nodes.length === 0) return;

    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;

    // Wrap at both ends so focus cannot leave the panel.
    if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    }
  };

  return { slotRef, panelRef, onKeyDown };
}
