/*
 * Public contract of the code editor. Deliberately free of CodeMirror types: the engine
 * is an implementation detail, and leaking its types here would freeze the library to it
 * and pull @codemirror/* into every consumer's type graph.
 */

export type CodeCompletion = {
  /** Inserted text, and what the user sees when `displayLabel` is absent. */
  label: string;
  /** Right-hand hint in the popup — a type, a sample value. */
  detail?: string;
  /** Longer text shown in the side panel of the popup. */
  info?: string;
  /** Groups and orders entries; unknown values sort last. */
  kind?: "property" | "variable" | "function" | "keyword" | "constant";
};

export type CodeDiagnosticSeverity = "error" | "warning" | "info";

export type CodeDiagnostic = {
  /** Character offsets into the whole document. */
  from: number;
  to: number;
  severity: CodeDiagnosticSeverity;
  message: string;
};

/**
 * What the editor knows about the cursor when asking for completions.
 *
 * `path` is the member chain already typed, so a source resolving nested objects never
 * has to tokenize: `context.obj.address.ci|` arrives as
 * `{ path: ["context", "obj", "address"], word: "ci" }`.
 */
export type CodeCompletionContext = {
  path: string[];
  word: string;
  /** Full document text and the cursor offset, for sources needing more than the path. */
  text: string;
  pos: number;
  /** True when the user asked for completions explicitly (Ctrl-Space). */
  explicit: boolean;
};

export type CodeCompletionSource = (
  context: CodeCompletionContext
) => CodeCompletion[] | Promise<CodeCompletion[]>;

export type CodeDiagnosticSource = (
  text: string
) => CodeDiagnostic[] | Promise<CodeDiagnostic[]>;

export type CodeEditorLanguage = "javascript" | "json" | "text";

/**
 * `inline` rejects newlines outright and drops all chrome — for a grid cell popover.
 * The rest differ only in height and whether the gutter is shown.
 */
export type CodeEditorMode = "full" | "modal" | "small" | "inline";
