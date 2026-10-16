import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

/*
 * Where focus goes when the surface opens. A narrower set than FOCUSABLE, which also
 * matches label-level affordances — an editor's description icon precedes its control
 * in the DOM, so seeding from the first focusable node lands on an info icon rather
 * than in the field the user came to fill in.
 */
const CONTROL =
  'textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [contenteditable="true"]';

/** The keys that mean the user is driving by keyboard; typing in a field does not. */
const NAVIGATION_KEYS = new Set([
  "Tab",
  "Escape",
  "Enter",
  " ",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
]);

/**
 * Keyboard focus containment for modal surfaces (dialogs, drawers, sheets).
 *
 * While `active`: moves focus to the first control inside the container, keeps Tab /
 * Shift+Tab cycling inside it, and on deactivate/unmount returns focus to whatever
 * had it before — so a keyboard user closing the editor lands back on the button that
 * opened it instead of at the top of the page.
 *
 * A close driven by the pointer (a click on Cancel, Save or the scrim) returns focus
 * to the opener and releases it at once. A text field inside the surface always
 * matches `:focus-visible`, and a programmatic move inherits that state, so leaving
 * focus on the opener after a mouse interaction would draw its focus ring and keep a
 * row's action pill revealed. The opener stays the sequential focus start, so a Tab
 * afterwards continues from it.
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

    const initial = focusables();
    (initial.find((el) => el.matches(CONTROL)) ?? initial[0] ?? container).focus();

    /* Which input last drove the page; decides how focus is handed back on close. */
    let viaKeyboard = false;
    const onPointerDown = () => {
      viaKeyboard = false;
    };
    const onNavKey = (e: KeyboardEvent) => {
      if (NAVIGATION_KEYS.has(e.key)) viaKeyboard = true;
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onNavKey, true);

    const onKeyDown = (e: KeyboardEvent) => {
      // A field that consumed Tab keeps it — a code editor indents with it rather than
      // moving focus, and cycling on top of that would eject the user mid-line.
      if (e.key !== "Tab" || e.defaultPrevented) return;
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
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onNavKey, true);
      previous?.focus?.();
      if (!viaKeyboard) previous?.blur?.();
    };
  }, [active]);

  return ref;
}
