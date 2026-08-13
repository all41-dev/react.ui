import type { EditorView } from "@codemirror/view";
import type { CodeEditorLanguage } from "./codeEditorTypes";

/**
 * Reformats the document with Prettier, imported on demand so it never lands in the
 * initial bundle. `semi: false` keeps a stored expression an expression — a trailing
 * semicolon would break a caller that wraps the string in parentheses.
 */
export async function formatDocument(
  view: EditorView,
  language: CodeEditorLanguage
): Promise<boolean> {
  // Only the two languages with a parser here; anything else is displayed, not parsed.
  if (language !== "javascript" && language !== "json") return false;
  const source = view.state.doc.toString();
  if (!source.trim()) return false;

  const [standalone, babel, estree] = await Promise.all([
    import("prettier/standalone"),
    import("prettier/plugins/babel"),
    import("prettier/plugins/estree"),
  ]);

  const formatted = await standalone.format(source, {
    parser: language === "json" ? "json" : "babel",
    plugins: [babel.default ?? babel, estree.default ?? estree],
    semi: false,
    singleQuote: false,
    printWidth: 100,
  });

  const next = formatted.replace(/\n+$/, "");
  if (next === source) return true;
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: next },
    selection: { anchor: Math.min(view.state.selection.main.anchor, next.length) },
  });
  return true;
}
