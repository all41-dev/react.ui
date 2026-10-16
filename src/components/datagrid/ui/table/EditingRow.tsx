import type { Cell, Column, Row } from "@tanstack/react-table";
import {
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Check, X } from "lucide-react";
import type { Path } from "react-hook-form";
import type { ZodType } from "zod";

import { DataGridContext } from "../../DataGridContext";
import { getColId } from "../../hooks/useGridColumns";
import { useRowEditForm } from "../../hooks/useRowEditForm";
import type { WithMeta } from "../../types/column";
import { getAccessorKey } from "../../utils/getAccessorKey";
import { renderEditor } from "../editors/EditorRegistry";
import { BodyDataCell } from "./BodyDataCell";
import { toLabelText } from "./CellWithTooltip";
import { editsInPopover, RichEditorCell } from "./RichEditorCell";
import { TreeCell, type TreeNodeState } from "./TreeCell";

/** What the body hands the row editor for the row in session, or for a draft. */
export type EditingRowArgs<TRow extends object> = {
  /** The row being edited. Absent for a draft. */
  row?: Row<TRow>;
  leafCols: Column<TRow, unknown>[];
  /** Tree mode: the row's node. A draft with none is drawn as a root. */
  node?: TreeNodeState;
  ariaRowIndex?: number;
};

export type RenderEditingRow<TRow extends object> = (
  args: EditingRowArgs<TRow>
) => ReactNode;

type EditingRowProps<TRow extends object, TForm extends object> = EditingRowArgs<TRow> & {
  /** Create mode: values the draft starts from, over the column defaults. */
  seed?: object;
  /** The column whose editor takes focus on open; the first editor when absent. */
  focusColumnId?: string;
  /** Changes when another session was refused because this row is dirty: focus comes back. */
  refocusSignal?: number;
  columns: WithMeta<TRow, TForm>[];
  zodSchema: ZodType<TForm>;
  /** `next` is set when Enter saves a draft: the grid opens another one in its place. */
  onSubmit: (values: TForm, opts: { next: boolean }) => void | Promise<void>;
  onCancel: () => void;
  /** Reports whether the row holds unsaved changes, on every change of that fact. */
  onDirtyChange?: (dirty: boolean) => void;
};

const CELL_BORDER =
  "border-b border-[color-mix(in_srgb,var(--rui-border-default)_65%,transparent)]";

/* The editor's own `px-1.5` brings its text to the same 12px the display cells use. */
const EDITOR_CELL = `h-10 align-middle px-1.5 ${CELL_BORDER}`;
const BLANK_CELL = `h-10 align-middle px-3 ${CELL_BORDER}`;
const SELECT_CELL = `h-10 w-[36px] px-2.5 ${CELL_BORDER}`;

/* The Save/Cancel pill floats over the right end of the row; the last data column keeps
   that much room so the pill never covers its editor. */
const PILL_ROOM = "!pr-[76px]";

const ROOT_DRAFT: TreeNodeState = { depth: 0, hasChildren: false, isOpen: false };

/* The pencil of a popover-edited field stands for its control in the row. */
const FOCUSABLE_EDITOR =
  "input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button[data-rich-editor]:not([disabled])";

/**
 * Enter saves the row, except where the key belongs to the control: a textarea takes a
 * newline, a code editor its own bindings, and a button fires its click on Enter.
 */
function entersSubmit(target: HTMLElement): boolean {
  const tag = target.tagName;
  if (tag === "TEXTAREA" || tag === "BUTTON") return false;
  return !target.closest(".cm-editor");
}

/** The editor inside the cell of `columnId`, else the row's first editor. */
function editorToFocus(row: HTMLElement, columnId: string | undefined) {
  if (columnId !== undefined) {
    for (const cell of row.querySelectorAll<HTMLElement>("[data-col-id]")) {
      if (cell.dataset.colId !== columnId) continue;
      const own = cell.querySelector<HTMLElement>(FOCUSABLE_EDITOR);
      if (own) return own;
    }
  }
  return row.querySelector<HTMLElement>(FOCUSABLE_EDITOR);
}

/**
 * The row in session, drawn in its own cells: a compact editor for every visible column
 * with an editor, the value read-only (or blank on a draft) for the rest, Save and
 * Cancel in the actions cell. Enter saves and Esc cancels from any cell; Tab walks the
 * editors and reaches Save after the last one. A server error is a strip under the row,
 * cleared on the next change.
 *
 * Rendered beside `DataRowFragment`, never inside its memo: the editors re-render on
 * every keystroke, and the other rows must not.
 */
export function EditingRow<TRow extends object, TForm extends object>({
  row,
  seed,
  leafCols,
  node: nodeProp,
  ariaRowIndex,
  focusColumnId,
  refocusSignal,
  columns,
  zodSchema,
  onSubmit,
  onCancel,
  onDirtyChange,
}: EditingRowProps<TRow, TForm>) {
  const tree = useContext(DataGridContext)?.tree;
  const idPrefix = useId().replace(/:/g, "_");
  const rowRef = useRef<HTMLTableRowElement>(null);

  /* Read when the submit handler runs, after validation: Enter on a draft chains another. */
  const nextRef = useRef(false);

  const visibleColumnIds = useMemo(() => leafCols.map((c) => c.id), [leafCols]);

  const { form, submit, isSubmitting, isDirty, formError, editable } = useRowEditForm<
    TRow,
    TForm
  >({
    row: row?.original,
    seed,
    columns,
    zodSchema,
    visibleColumnIds,
    onSubmit: (values) => onSubmit(values, { next: nextRef.current }),
  });

  /* Editor columns by table id: the leaf columns are addressed by id, the form by
     accessor key, and `getColId` is the one bridge between them. */
  const editorById = useMemo(
    () => new Map(editable.map((c) => [getColId(c), c] as const)),
    [editable]
  );

  const cellById = useMemo(() => {
    const out = new Map<string, Cell<TRow, unknown>>();
    for (const c of row?.getVisibleCells() ?? []) out.set(c.column.id, c);
    return out;
  }, [row]);

  /* A draft handed no node is drawn as a root. */
  const node = nodeProp ?? (tree ? ROOT_DRAFT : undefined);

  /* The strip says what the server refused; the next edit is an answer to it. */
  useEffect(
    () =>
      form.subscribe({
        formState: { values: true },
        callback: () => {
          if (form.formState.errors.root?.server) form.clearErrors("root.server");
        },
      }),
    [form]
  );

  /* The session reads the flag when another one is asked for; a row leaving the screen
     leaves it clear. */
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  /* Opened by a double-click on a cell: that editor's value starts selected, so the
     gesture people use to copy a value still copies it. */
  const selectOnOpen =
    useContext(DataGridContext)?.rowEditTrigger === "doubleClick" &&
    focusColumnId !== undefined;

  useEffect(() => {
    const target = rowRef.current && editorToFocus(rowRef.current, focusColumnId);
    target?.focus();
    if (selectOnOpen && target instanceof HTMLInputElement) target.select();
    // The focus target is fixed at open; a later change of the prop is not a new session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* A refused session leaves focus on what was clicked; the open row takes it back. */
  const seenRefusals = useRef(refocusSignal);
  useEffect(() => {
    if (refocusSignal === seenRefusals.current) return;
    seenRefusals.current = refocusSignal;
    const root = rowRef.current;
    if (!root || root.contains(document.activeElement)) return;
    (root.querySelector<HTMLElement>("[aria-invalid=true]") ?? editorToFocus(root, undefined))?.focus();
  }, [refocusSignal]);

  /*
   * A submit that fails validation puts focus on the first invalid control, in table
   * order. The editors do not forward `field.ref`, so react-hook-form's own
   * `shouldFocusError` has nothing to focus. `submitCount` and the errors land in the
   * same render, so the rings are in the DOM when this runs.
   */
  const { submitCount } = form.formState;
  const seenSubmits = useRef(submitCount);
  useEffect(() => {
    if (submitCount === seenSubmits.current) return;
    seenSubmits.current = submitCount;
    rowRef.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [submitCount]);

  const save = (next: boolean) => {
    if (isSubmitting) return;
    nextRef.current = next;
    void submit();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTableRowElement>) => {
    if (e.defaultPrevented) return;
    /* A key pressed in a portaled popover bubbles here through React; the popover owns
       its own Escape and Enter. */
    if (!rowRef.current?.contains(e.target as Node)) return;
    if (e.key === "Escape") {
      e.preventDefault();
      if (!isSubmitting) onCancel();
      return;
    }
    if (e.key !== "Enter" || !entersSubmit(e.target as HTMLElement)) return;
    e.preventDefault();
    /* A draft saved from Enter chains a sibling; an edited row returns to display. */
    save(!row);
  };

  const hasActions = leafCols.some((c) => c.id === "__actions__");
  const lastDataId = hasActions
    ? leafCols.filter((c) => c.id !== "__actions__" && c.id !== "__select__").at(-1)?.id
    : undefined;

  const renderCell = (col: Column<TRow, unknown>) => {
    if (col.id === "__select__") {
      /* Selection is suppressed on the row in session. */
      return <td key={col.id} className={SELECT_CELL} />;
    }
    if (col.id === "__actions__") {
      return (
        <RowEditActionsCell
          key={col.id}
          isSubmitting={isSubmitting}
          onSave={() => save(false)}
          onCancel={onCancel}
        />
      );
    }

    const isTreeCell = !!tree && !!node && tree.columnId === col.id;
    const cell = cellById.get(col.id);
    const editorCol = editorById.get(col.id);
    const room = col.id === lastDataId ? PILL_ROOM : "";

    if (!editorCol) {
      /* Edit: the value as the table shows it, tree chrome included. Draft: blank, with
         the indent and the level icon on the tree column. */
      if (cell) return <BodyDataCell key={col.id} c={cell} node={node} className={room} />;
      return (
        <td key={col.id} data-col-id={col.id} className={`${BLANK_CELL} ${room}`}>
          {isTreeCell && (
            <TreeCell rowId="" row={seed ?? {}} node={node} tree={tree} label="new row">
              {null}
            </TreeCell>
          )}
        </td>
      );
    }

    const editor = editsInPopover(editorCol.meta?.editor) ? (
      <RichEditorCell
        column={editorCol}
        name={getAccessorKey(editorCol) as Path<TForm>}
        form={form}
        fieldId={`${idPrefix}-${getAccessorKey(editorCol)}`}
        label={String(editorCol.meta?.label ?? editorCol.header ?? col.id)}
        row={(row?.original ?? seed ?? {}) as TRow}
      />
    ) : (
      renderEditor({
        column: editorCol,
        control: form.control,
        idPrefix,
        variant: "cell",
      })
    );

    return (
      <td key={col.id} data-col-id={col.id} className={`${EDITOR_CELL} ${room}`}>
        {isTreeCell ? (
          <TreeCell
            rowId={row?.id ?? ""}
            row={row?.original ?? seed ?? {}}
            node={node}
            tree={tree}
            label={toLabelText(cell?.getValue()) || "new row"}
            fill
          >
            {editor}
          </TreeCell>
        ) : (
          editor
        )}
      </td>
    );
  };

  return (
    <>
      <tr
        ref={rowRef}
        data-editing
        className="bg-accent-subtle"
        style={{ boxShadow: "inset 3px 0 0 0 var(--rui-accent)" }}
        onKeyDown={onKeyDown}
        aria-rowindex={ariaRowIndex}
        aria-level={node ? node.depth + 1 : undefined}
        aria-expanded={node?.hasChildren ? node.isOpen : undefined}
      >
        {leafCols.map(renderCell)}
      </tr>

      {formError && (
        <tr>
          <td colSpan={leafCols.length} className={`h-auto p-0 ${CELL_BORDER}`}>
            <div
              role="alert"
              className="bg-[color-mix(in_srgb,var(--rui-danger)_10%,transparent)] px-3 py-1.5 text-[.75rem] text-danger"
            >
              {formError}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

const ACTION_BTN =
  "inline-flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-control border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)] disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Save and Cancel where the row's action pill sits, on the same floating surface, shown
 * for as long as the row is in session rather than on hover. Save comes first in the DOM
 * so Tab from the last editor lands on it; Esc is Cancel's key.
 */
function RowEditActionsCell({
  isSubmitting,
  onSave,
  onCancel,
}: {
  isSubmitting: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <td
      className="sticky right-0 z-3 !w-0 !p-0 overflow-visible border-0 bg-transparent"
      style={{ width: 0, minWidth: 0 }}
    >
      <div className="absolute right-2 top-1/2 z-20 flex -translate-y-1/2 items-center gap-[3px] rounded-lg border border-border-default bg-surface-card p-[3px] shadow-[-10px_0_18px_-12px_rgba(0,0,0,.7),0_2px_6px_-3px_rgba(0,0,0,.5)]">
        <button
          type="button"
          aria-label="Save"
          title="Save (Enter)"
          aria-busy={isSubmitting || undefined}
          onClick={onSave}
          disabled={isSubmitting}
          className={`${ACTION_BTN} border-transparent bg-accent text-accent-contrast hover:bg-accent-hover`}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Cancel"
          title="Cancel (Esc)"
          onClick={onCancel}
          disabled={isSubmitting}
          className={`${ACTION_BTN} border-transparent text-muted hover:border-border-default hover:bg-surface-raised hover:text-body`}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </td>
  );
}
