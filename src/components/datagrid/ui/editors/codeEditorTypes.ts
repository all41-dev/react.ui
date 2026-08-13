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
  /**
   * True when the query was started deliberately rather than by ordinary typing:
   * Ctrl-Space, or the editor reacting to a member separator (`.`, `[`, a quote). It is
   * not a reliable "the user pressed a shortcut" flag — a decimal point in `1.5` also
   * raises it, with an empty `path`, so a source should answer from `path`/`word` and
   * treat `explicit` only as permission to answer a query it would otherwise skip.
   */
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
 * `inline` is one line with no chrome, for a grid cell popover: an edit that would
 * introduce a newline is rejected, and a `value` that already contains one is flattened
 * to spaces when seeded. The rest differ only in height and whether the gutter is shown.
 */
export type CodeEditorMode = "full" | "modal" | "small" | "inline";

export type CodeEditorProps = {
  value: string;
  onChange: (value: string) => void;
  language?: CodeEditorLanguage;
  /** Height preset. `inline` is one line with no chrome, for a cell popover. */
  mode?: CodeEditorMode;
  /** Visible lines before the editor scrolls. Defaults per mode. */
  rows?: number;
  placeholder?: string;
  readOnly?: boolean;
  /** Domain-specific suggestions. Receives the member path already parsed. */
  completions?: CodeCompletionSource;
  /** Domain-specific problems, merged with the parser's own syntax errors. */
  diagnostics?: CodeDiagnosticSource;
  id?: string;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  "aria-required"?: boolean;
  "aria-label"?: string;
};
