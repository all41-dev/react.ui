import { useEffect, useState } from "react";
import type { AriaRole, KeyboardEvent, RefObject } from "react";
import type { EditorView } from "@codemirror/view";
import { useFocusTrap } from "../../hooks/useFocusTrap";

type FrameProps = {
  ref: RefObject<HTMLDivElement | null>;
  tabIndex: number;
  role: AriaRole | undefined;
  "aria-modal": true | undefined;
  "aria-label": string | undefined;
  onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
};

/**
 * Full-screen state for the editor frame, plus everything a modal surface owes its
 * users: dialog semantics, a focus trap, a body scroll lock and Escape to collapse.
 *
 * The frame element itself is never remounted — the props below are applied to the same
 * div in both states, because replacing it would destroy the CodeMirror view inside.
 */
export function useExpandableEditor(opts: {
  viewRef: RefObject<EditorView | null>;
  label?: string;
}): { expanded: boolean; toggle: () => void; collapse: () => void; frameProps: FrameProps } {
  const { viewRef, label } = opts;
  const [expanded, setExpanded] = useState(false);
  const trapRef = useFocusTrap<HTMLDivElement>(expanded);

  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // The trap lands on the first button; the point of full screen is the editor.
    viewRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [expanded, viewRef]);

  /*
   * Escape is handled on the frame rather than through the editor keymap so it also
   * works from the toolbar buttons. `defaultPrevented` means the editor already consumed
   * the key — a completion popup or the search panel closing — and preventing it in turn
   * is what stops the surrounding dialog from cancelling the edit.
   */
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Escape" || e.defaultPrevented || !expanded) return;
    e.preventDefault();
    setExpanded(false);
  };

  return {
    expanded,
    toggle: () => setExpanded((open) => !open),
    collapse: () => setExpanded(false),
    frameProps: {
      ref: trapRef,
      tabIndex: -1,
      role: expanded ? "dialog" : undefined,
      "aria-modal": expanded || undefined,
      "aria-label": expanded ? `${label ?? "Code"} — full screen editor` : undefined,
      onKeyDown,
    },
  };
}
