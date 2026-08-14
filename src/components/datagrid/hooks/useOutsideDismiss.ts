import { useEffect, useEffectEvent, type RefObject } from "react";

/**
 * Closes a toolbar panel on Escape or a pointerdown outside `ref`.
 *
 * Containment-based on purpose: a click anywhere inside the wrapper — including a
 * nested panel that is a DOM child of it — does not dismiss. That is what lets the
 * Columns popover open *inside* the overflow menu without closing it, and it is why
 * the panels are `fixed` rather than portaled (see `useAnchoredPanel`).
 */
export function useOutsideDismiss(
  open: boolean,
  ref: RefObject<HTMLElement | null>,
  onDismiss: () => void
): void {
  /* Every call site passes an inline arrow, so listing `onDismiss` as a dependency tore
     both document listeners down and re-subscribed them on every render of an open
     panel. `useEffectEvent` keeps the callback fresh without restarting the effect. */
  const dismiss = useEffectEvent(() => onDismiss());

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) dismiss();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, ref]);
}
