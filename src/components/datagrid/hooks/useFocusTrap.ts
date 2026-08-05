import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keyboard focus containment for modal surfaces (dialogs, drawers, sheets).
 *
 * While `active`: moves focus into the container, keeps Tab / Shift+Tab cycling
 * inside it, and on deactivate/unmount returns focus to whatever had it before —
 * so a keyboard user closing the editor lands back on the button that opened it
 * instead of at the top of the page.
 *
 * Attach the returned ref to the container element and give it `tabIndex={-1}`
 * so it can take focus itself when it holds no focusable children.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    if (!container) return;

    const previous = document.activeElement as HTMLElement | null;

    const focusables = () =>
      [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        // getClientRects is the visibility check that also works inside
        // position:fixed ancestors, where offsetParent is unreliable.
        (el) => el.getClientRects().length > 0
      );

    (focusables()[0] ?? container).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const els = focusables();
      if (els.length === 0) {
        e.preventDefault();
        return;
      }
      const first = els[0];
      const last = els[els.length - 1];
      const current = document.activeElement;
      if (e.shiftKey) {
        if (current === first || !container.contains(current)) {
          e.preventDefault();
          last.focus();
        }
      } else if (current === last || !container.contains(current)) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener("keydown", onKeyDown);
    return () => {
      container.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [active]);

  return ref;
}
