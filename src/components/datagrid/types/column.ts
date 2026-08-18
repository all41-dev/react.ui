import type { ColumnDef } from "@tanstack/react-table";
import type { ReactNode } from "react";
import type { FormColSpan } from "./formLayout";

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
  /**
   * `false` keeps the column out of the table by default — the field still reaches the
   * edit form, and the Columns popover can still reveal it. A stored preference wins,
   * so a revealed column stays revealed.
   */
  visibleInTable?: boolean;
  /**
   * For markdown: `rows` and `preview` (`"tab"` | `"split"`; a split field that is too
   * narrow for two panes falls back to the tabs). For code: `language`, `mode`, `rows`,
   * plus `completions` and
   * `diagnostics` — the domain-aware sources typed as `CodeCompletionSource` and
   * `CodeDiagnosticSource`. Anything else is forwarded untouched.
   */
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

  /**
   * Text under the field's control, derived from the value being edited — a humanised
   * echo of a machine value, so a cron expression or a timestamp can be checked as it is
   * typed. Runs on every keystroke anywhere in the form; keep it cheap and pure.
   * Returning `null` renders nothing, and an error on the field replaces it.
   *
   * `formValues` holds the fields of the form the hint is rendered in, which is not
   * always the whole row: a cell-edit popover is a one-field form, so a hint that reads a
   * sibling field must tolerate `undefined` there. The result is rendered inside a `<p>`
   * — inline content only.
   */
  hint?: (value: unknown, formValues: TForm) => ReactNode;

  filter?: ColumnFilterMeta;
  headerClassName?: string;
  cellClassName?: string;
  /** Drops the column out of the table below `md`. Driven through column visibility, so
      the colgroup, the filter row and the group headers all agree with the data rows. */
  hideOnMobile?: boolean;
  tooltip?: boolean;
  tooltipContent?: (args: { value: unknown; row: TRow }) => string;
  
  // Form layout control
  formLayout?: {
    /** Columns spanned inside the field's group, or inside the form grid when ungrouped. */
    colSpan?: FormColSpan;
    /** Display order, lower first. Also positions the field's group. */
    order?: number;
    /** Additional CSS classes for the field wrapper. */
    className?: string;
    /**
     * Id of the section the field belongs to. An id with no matching entry in the form's
     * `groups` still renders as a section, headed by the id.
     */
    group?: string;
  };
};

export type WithMeta<TRow extends object, TForm extends object = TRow> =
  ColumnDef<TRow, unknown> & {
    meta?: ColumnMeta<TRow, TForm>;
  };
