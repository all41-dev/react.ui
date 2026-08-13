import { EditorState, type Extension } from "@codemirror/state";
import { linter, type Diagnostic } from "@codemirror/lint";
import { syntaxTree } from "@codemirror/language";
import type { CodeDiagnosticSource } from "./codeEditorTypes";

/** Error nodes in the parse tree — free syntax checking, no extra dependency. */
function syntaxDiagnostics(state: EditorState): Diagnostic[] {
  const out: Diagnostic[] = [];
  const docLength = state.doc.length;
  const seen = new Set<number>();
  syntaxTree(state).iterate({
    enter: (node) => {
      if (!node.type.isError) return;
      if (seen.has(node.from)) return;
      seen.add(node.from);
      // Zero-width error nodes render no mark at all; widen them by one character.
      const to = node.to > node.from ? node.to : Math.min(node.from + 1, docLength);
      if (node.from >= to) return;
      out.push({ from: node.from, to, severity: "error", message: "Syntax error" });
    },
  });
  // A broken document produces error nodes in bulk; a wall of marks helps nobody.
  return out.slice(0, 20);
}

export function lintExtension(
  getSource: () => CodeDiagnosticSource | undefined,
  hasLanguage: boolean
): Extension {
  return linter(async (view) => {
    const state = view.state;
    const diagnostics: Diagnostic[] = hasLanguage ? syntaxDiagnostics(state) : [];

    const provide = getSource();
    if (provide) {
      const docLength = state.doc.length;
      const extra = await provide(state.doc.toString());
      for (const d of extra) {
        // Offsets come from outside; an out-of-range one throws inside CodeMirror.
        const from = Math.max(0, Math.min(d.from, docLength));
        const to = Math.max(from, Math.min(d.to, docLength));
        diagnostics.push({ from, to, severity: d.severity, message: d.message });
      }
    }
    return diagnostics;
  });
}
