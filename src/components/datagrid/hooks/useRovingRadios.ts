import type { KeyboardEvent } from "react";

/**
 * The radiogroup keyboard contract for a list of sibling `role="radio"` buttons:
 * one tab stop (the checked option carries `tabIndex` 0, the rest -1), arrow keys —
 * all four — move the selection with wrap-around, and selection follows focus, as in
 * a native radio group.
 *
 * Expects the radios to be the direct children of one parent, in `keys` order —
 * focus is moved by indexing into `parentElement.children`.
 */
export function useRovingRadios(
  keys: readonly string[],
  selected: string,
  onSelect: (key: string) => void
): {
  tabStopIndex: number;
  handleArrowKey: (e: KeyboardEvent<HTMLButtonElement>) => void;
} {
  const tabStopIndex = Math.max(0, keys.indexOf(selected));

  const handleArrowKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const forward = e.key === "ArrowDown" || e.key === "ArrowRight";
    const back = e.key === "ArrowUp" || e.key === "ArrowLeft";
    if (!forward && !back) return;
    e.preventDefault();
    const next = (tabStopIndex + (forward ? 1 : -1) + keys.length) % keys.length;
    onSelect(keys[next]);
    (e.currentTarget.parentElement?.children[next] as HTMLElement | undefined)?.focus();
  };

  return { tabStopIndex, handleArrowKey };
}
