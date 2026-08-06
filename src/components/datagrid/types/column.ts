import type { ColumnDef } from "@tanstack/react-table";

export type Option = { value: string; label: string };

export type EditorKind =
  | "text"
  | "number"
  | "select"
  | "switch"
  | "date"
  | "time"
  | "textarea"
  | "markdown"
  | "code";

// TRow = what the table displays
// TForm = what the form edits (editable-only zod shape)
export type SelectOption = { value: string; label: string };
export type ColumnFilterMeta =
  | { type: "text"; placeholder?: string; debounceMs?: number }
  | { type: "select"; placeholder?: string; options: SelectOption[]; multi?: boolean }
  | { type: "boolean"; labels?: { any?: string; true?: string; false?: string } }
  | { type: "dateRange"; placeholders?: { from?: string; to?: string } };
export type ColumnMeta<TRow extends object, TForm extends object = TRow> = {
  label?: string;
  description?: string;

  editor?: EditorKind;
  required?: boolean;
  visibleInForm?: boolean;
  /** For markdown/code: `language`, `rows` are understood; the rest is forwarded. */
  editorProps?: Record<string, unknown>;
  options?: Option[];
  /** Click-to-edit popover on the cell itself; needs `editor` to be set too. */
  cellEdit?: boolean;
  /** Aggregate shown on group header rows (and as subtree roll-ups in tree mode). */
  agg?: "sum";
  /** Render the cell in the mono font — IDs, numbers. */
  mono?: boolean;
  align?: "left" | "center" | "right";
  /** Seed value when creating a new row (defaults to "" / false for switches). */
  default?: unknown;

  /*
   * Three hooks, one caller each, so the round-trip stays symmetric: `format` is display
   * only, `toForm` seeds the editor, `fromForm` converts back on submit. Keep them
   * separate — sharing one between display and editing means a column rendering 1234 as
   * "1 234 €" puts that string into the input and submits it.
   */

  /** Cell display only. Never reaches the edit form. */
  format?: (value: unknown, row: TRow) => unknown;
  /** Stored value → form field value. Seeds the editor; defaults to the raw value. */
  toForm?: (value: unknown, row: TRow) => unknown;
  /** Form field value → stored value. Applied on submit and on a cell-edit save. */
  fromForm?: (value: unknown, formValues: TForm) => unknown;

  filter?: ColumnFilterMeta;
  headerClassName?: string;
  cellClassName?: string;
  hideOnMobile?: boolean;
  tooltip?: boolean;
  tooltipContent?: (args: { value: unknown; row: TRow }) => string;
  
  // Form layout control
  formLayout?: {
    colSpan?: 1 | 2 | 3 | 4 | "full"; // Number of columns to span, or "full" for full width
    order?: number; // Display order (lower numbers first)
    className?: string; // Additional CSS classes for the field wrapper
  };
};

export type WithMeta<TRow extends object, TForm extends object = TRow> =
  ColumnDef<TRow, unknown> & {
    meta?: ColumnMeta<TRow, TForm>;
  };
