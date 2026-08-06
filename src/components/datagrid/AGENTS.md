# DataGrid — agent reference

Machine-oriented reference for `src/components/datagrid`. Human-oriented guide with
worked examples: `./README.md`.

**What it is:** a declarative data table. The caller supplies a TanStack Table column array
carrying a `meta` block plus a zod schema; the grid derives the table, the toolbar, the
filter row, the edit form and its validation from those two inputs. Sorting, filtering,
search, pagination, grouping, cards/kanban views, row virtualization, column persistence
and create/edit/delete flows are built in.

**Published as:** `@all41-dev/react.ui` (v0.1.1). Consumers import from the package root.
In-repo code imports relative paths. Entry: `src/index.ts`.

---

## 1. Invariants — violating these produces silent misbehaviour, not errors

1. **`initialData` must be referentially stable.** The grid holds rows in local state and
   re-syncs during render whenever `initialData` changes identity. A new array each render
   discards pending local mutations. Wrap derived arrays in `useMemo`. Same contract
   TanStack Table places on its `data` prop.
2. **Row identity resolves as `idAccessor(row) ?? row.id ?? row.uuid`**
   (`utils/getRowKey.ts`). Everything downstream compares `String(key)`. If a row resolves
   to `undefined`, every row keys to `"undefined"` — one checkbox selects all rows and no
   edit or delete matches its row. Pass `idAccessor` for any other shape.
3. **Controlled pagination requires both `state` and `onChange`.** `state` alone leaves the
   pager writing to an unused internal atom while rendering the parent's frozen state. The
   grid `console.warn`s in development.
4. **`meta.cellEdit: true` requires `meta.editor`.** Without an editor there is nothing to
   render in the popover.
5. **`format` must never be used to seed the form.** It is display-only. Use `toForm` /
   `fromForm`. See §4.
6. **`editContainer: "none"` removes the Add button and the Edit action** — there is no
   container to open.
7. **Cell edits validate one field only.** `useGridMutations` runs the full schema, then
   throws only if an issue's `path[0]` matches the edited column. A failure elsewhere in
   the schema must not block editing this field.
8. **Don't add a hidden mobile card list inside `TableView`.** Mapping every row into one
   defeats the virtualizer. Small screens scroll horizontally; `card` gives the real cards
   view.

---

## 2. `DataGridProps<TRow, TForm = TRow>`

Defined in `types/grid.ts`, re-exported from `DataGrid.tsx`.

### Required

| Prop | Type |
|---|---|
| `columns` | `WithMeta<TRow, TForm>[]` |
| `zodSchema` | `ZodType<TForm>` |
| `initialData` | `TRow[]` |

### Data & identity

| Prop | Type | Default |
|---|---|---|
| `idAccessor` | `(r: TRow) => string \| number \| undefined` | `row.id ?? row.uuid` |
| `onPersist` | `(mode: "create" \| "edit" \| "cell", values: TForm, prev?: TRow) => Promise<TRow> \| TRow` | — |
| `onDelete` | `(row: TRow) => Promise<void> \| void` | — |
| `isLoading` | `boolean` | — |
| `error` | `string \| Error \| null` | — |
| `onRetry` | `() => void \| Promise<void>` | — |

### Chrome

| Prop | Type | Default |
|---|---|---|
| `title` | `string` | `"Data"` |
| `subtitle` | `string` | — |
| `searchable` | `boolean` | `true` |
| `emptyLabel` | `string` | `"No data"` |
| `toolbar` | `ReactNode` | — |
| `className` | `string` | — |

### Views

| Prop | Type | Default |
|---|---|---|
| `card` | `(row: TRow) => ReactNode` | — (presence enables the list/cards toggle) |
| `defaultView` | `"list" \| "cards"` | `"list"` |
| `groupOptions` | `GroupOption[]` | — (presence enables the Group-by select) |
| `defaultGroupBy` | `string` | `""` |
| `onRowClick` | `(row: TRow) => void` | — |
| `expandedRowIds` | `ReadonlySet<string \| number>` | — (fully controlled) |
| `renderExpandedRow` | `(row: TRow) => ReactNode` | — |

### Selection

| Prop | Type | Default |
|---|---|---|
| `selectable` | `boolean` | `false` |
| `onSelectionChange` | `(rows: TRow[]) => void` | — |

### Editing

| Prop | Type | Default |
|---|---|---|
| `editContainer` | `"right" \| "bottom" \| "modal" \| "inline" \| "none"` | `"right"` |
| `formLayout` | `{ columns?: 1\|2\|3\|4; gap?: string; className?: string }` | `{ columns: 2 }` |
| `actionColumnOptions` | `Partial<ActionColumnOpts<TRow>>` | — |

### Table state

| Prop | Type | Default |
|---|---|---|
| `initialSorting` | `SortingState` | `[]` |
| `pagination` | `PaginationProp` | enabled, pageSize 10 |
| `storageKey` | `string` | `` `dg:${slug(title)}` `` |
| `ref` | `Ref<DataGridHandle<TRow>>` | — |

```ts
type PaginationProp = {
  enabled?: boolean;                      // default true
  pageSizeOptions?: number[];             // default [5, 10, 20, 50, 100]
  initialState?: Partial<PaginationState>; // uncontrolled seed
  state?: PaginationState;                // controlled — requires onChange
  onChange?: OnChangeFn<PaginationState>;
};
```

### `DataGridHandle<TRow>`

```ts
{
  startCreate(): void;
  startEdit(row: TRow): void;
  cancelEdit(): void;      // closes form or cell popover; no-op when idle
  isEditing(): boolean;
  clearSelection(): void;
}
```

---

## 3. `ColumnMeta<TRow, TForm>` — `types/column.ts`

A column is `ColumnDef<TRow, unknown> & { meta?: ColumnMeta }`, aliased as
`WithMeta<TRow, TForm>`. All of `accessorKey`, `header`, `cell`, `size`, `enableSorting`
behave as standard TanStack.

| Field | Type | Effect |
|---|---|---|
| `label` | `string` | Form field label (falls back to `header`) |
| `description` | `string` | Hint under the field; replaced by the error when invalid |
| `editor` | `EditorKind` | **Presence puts the column in the edit form.** Absent → display only |
| `required` | `boolean` | Asterisk + `aria-required`. Actual enforcement is the zod schema |
| `visibleInForm` | `boolean` | `false` excludes an editor-bearing column from the form |
| `editorProps` | `Record<string, unknown>` | Forwarded to the editor (`language`, `rows` understood) |
| `options` | `Option[]` | Choices for `editor: "select"` |
| `cellEdit` | `boolean` | Click-to-edit popover. Requires `editor` |
| `agg` | `"sum"` | Per-group total on group header rows |
| `mono` | `boolean` | Mono font in the cell |
| `align` | `"left" \| "center" \| "right"` | Cell + header alignment |
| `default` | `unknown` | Create-mode seed. Falls back to `false` for switches, else `""` |
| `format` | `(value, row) => unknown` | **Display only.** Never reaches the form |
| `toForm` | `(value, row) => unknown` | Stored → form value. Seeds the editor |
| `fromForm` | `(value, formValues) => unknown` | Form → stored value. Runs on submit and cell save |
| `filter` | `ColumnFilterMeta` | Adds a header filter and attaches the matching `filterFn` |
| `headerClassName` | `string` | |
| `cellClassName` | `string` | |
| `hideOnMobile` | `boolean` | |
| `tooltip` | `boolean` | Tooltips attach automatically when text is clipped (measured on pointer-enter). `true` forces one regardless of clipping, `false` disables it |
| `tooltipContent` | `({ value, row }) => string` | Custom tooltip text |
| `formLayout` | `{ colSpan?: 1\|2\|3\|4\|"full"; order?: number; className?: string }` | Field placement. Lower `order` first; markdown/code default to `"full"` |

```ts
type EditorKind =
  | "text" | "number" | "select" | "switch"
  | "date" | "time" | "textarea" | "markdown" | "code";

type ColumnFilterMeta =
  | { type: "text"; placeholder?: string; debounceMs?: number }
  | { type: "select"; placeholder?: string; options: SelectOption[]; multi?: boolean }
  | { type: "boolean"; labels?: { any?: string; true?: string; false?: string } }
  | { type: "dateRange"; placeholders?: { from?: string; to?: string } };
```

`GroupOption`: `{ key: string; label: string; values?: { value; label; color? }[] }`.
Supplying `values` fixes bucket order, labels and colours; omitting it derives buckets from
the data, sorted.

---

## 4. The three-hook round-trip

One caller each, so the round-trip is symmetric:

```
render cell   →  format(value, row)
open form     →  toForm(value, row)      [computeDefaults, utils/getAccessorKey.ts]
submit        →  fromForm(value, form)   [EditFormBody + useGridMutations]
```

Never share one hook across display and editing: a column rendering `1234` as `"1 234 €"`
would seed the input with that string and submit it back.

Cell-edit commit (`useGridMutations.handleCellSave`) reproduces the full form round-trip
for one field: `computeDefaults` over the row → overwrite the edited key → every column's
`fromForm` → `zodSchema.safeParse` → prefer zod's **output** over the raw draft (so
`z.string().transform(Number)` persists the transformed value).

---

## 5. Behaviour that is automatic

- **Global search**: `globalFilterFn: "includesString"` across all columns. The input is
  debounced 200ms locally and reconciled during render, so an external reset lands
  immediately (`ui/SearchBar.tsx`).
- **Search bar owns the criteria**: active column filters and the group-by render as pills
  *inside* the search field (`useGridFilters.buildFacetChips` → `DataGridToolbar.facets` →
  `SearchBar`), each with its own clear; Backspace in an empty input clears the last one.
  The global search term is deliberately **not** a pill — the input already shows it.
  There is no separate chip band under the toolbar.
- **Facet values read through the filter's vocabulary**: a `select` filter stores
  `option.value` but its pill shows `option.label`, and a `boolean` filter uses
  `meta.filter.labels`. A pill must name the criterion the way the control that set it does.
- **Dropdown welded to the field** (`ui/ToolbarOverflowMenu.tsx`): a **caret** trigger flush
  against the search field's right edge, carrying the active-filter count and rotating when
  open. Panel is laid out like Odoo's control panel — **Filter** and **Group by** as two
  headed columns (one column, 236px, when only one of them exists), then a rule, then the
  view commands (Columns, Refresh). It closes only on Escape, an outside click, or Refresh;
  applying a criterion keeps it open.
  - The trigger's wrapper must stay a **flex** container while `attached` — `self-stretch`
    does nothing outside one, which drew the button short against a field grown by pills.
  - When the grid has neither search nor facets the trigger stands alone;
    `hasOverflowItems()` is the single source of that decision, so the field only squares
    its right corners when a trigger is actually attached.
- **Column filters**: `useGridColumns` attaches a `filterFn` from `utils/filterFns.ts`
  (`filterFnFor`) per `meta.filter`, unless the column already declares its own `filterFn`.
  Never rely on TanStack's inference — it reads the first row's value type and knows
  nothing about what the filter UI writes.
- **Virtualization**: `@tanstack/react-virtual` in `TableView`; `estimateSize` 40px rows /
  36px group headers, `overscan: 10`.
- **Column prefs**: size / order / visibility persisted to `localStorage` under
  `storageKey`; Columns popover + Reset. Refuses to hide the last visible column.
- **Page reset**: a filter or sort change returns to page 1 (real changes only — never on
  mount, which would overwrite a controlled parent's initial `pageIndex`).
- **Delete confirmation**: `useConfirm` dialog, destructive styling.
- **Local reflection**: create/edit/delete update local rows immediately; a query adapter
  re-supplying `initialData` overwrites with server truth.
- **Empty states**: distinguishes no-data from no-results, the latter offering
  Clear filters.
- **Error banner**: under the toolbar, with Retry; disables Add while shown.
- **a11y**: grid semantics and accessible name from `title`; keyboard-operable rows;
  labelled pager region with arrow keys; focus trap + Escape + focus restore on overlays;
  `alertdialog` for confirms; `aria-invalid` / `aria-describedby` / `aria-required` wired
  from column meta.

---

## 6. Public exports (`src/index.ts`)

Values: `DataGrid`, `useCrudAdapter`, `useTanstackQueryAdapter`, `useColumnPrefs`,
`useConfirm`, `EmptyState`, `DataGridContext`, `Tooltip`, `LoadingScreen`, `toast`.

Types: `DataGridProps`, `DataGridHandle`, `WithMeta`, `ColumnMeta`, `EditorKind`, `Option`,
`SelectOption`, `ColumnFilterMeta`, `ActionColumnOpts`, `EditContainerKind`,
`FormLayoutConfig`, `CrudAdapter`, `IdLike`, `UseTQAdapterParams`, `LoadingScreenProps`.

Styles: `@all41-dev/react.ui/styles` → `dist/react.ui.css`. Nothing injects it at runtime;
consumers must import it.

**Do not export grid internals** (`EditFormBody`, `getRowId`, `FormLayout`,
`computeDefaults`, `toTooltipText`). Exporting freezes their signatures into the published
API.

### `useCrudAdapter(params: UseTQAdapterParams<TRow, TForm>)`

Returns props ready to spread: `{ rows, isLoading, error, refetch, loadRows, onPersist,
onDelete, getId, isMutating, mutationError }`. `onPersist` maps `"cell"` onto the same
update path as `"edit"` — its mode union must stay identical to `DataGridProps.onPersist`
or `strictFunctionTypes` breaks the library against itself.

Peers: `react` 19, `react-dom`, `zod` 4, `react-hook-form`, `@hookform/resolvers`,
`@tanstack/react-table`, `@tanstack/react-virtual`, `@tanstack/react-query`, `sonner`,
`react-tooltip`.

---

## 7. File map

```
DataGrid.tsx  (373)     Composition only. Add no logic here
DataGridContext.ts      tooltipId, canCellEdit, startCellEdit, getId, rowActions
types/grid.ts           DataGridProps, DataGridHandle
types/column.ts         ColumnMeta, WithMeta, EditorKind, ColumnFilterMeta
types/grouping.ts       GroupOption, GroupBucket
types/facets.ts         FacetChip — one active criterion, rendered as a pill
types/crud.ts           CrudAdapter, IdLike

hooks/
  useGridRows           Local rows + replaceRow / addRow / removeRow
  useRowSelection       Checkbox selection, page-scoped select-all
  useEditSession        Discriminated union: idle | create | edit | cell
  useGridMutations      All writes: submit, delete, cell commit
  useGridFilters        columnFilters, globalFilter, sorting, clearAllFilters,
                        facet chips
  useGridPagination     Controlled/uncontrolled paging
  useGridColumns        Assembles columns, attaches filterFns, injects select/action cols
  useGridGrouping       Group-by, collapse state, buckets
  useDataGridTable      The TanStack table instance
  useColumnPrefs        localStorage persistence
  useConfirm            Promise-based confirm dialog
  useCrudAdapter / useTanstackQueryAdapter

ui/
  DataGridToolbar, GridBody, GridFooter, ColumnsPopover
  SearchBar             Field + facet pills + attached trigger slot
  ToolbarOverflowMenu   The caret menu: Filter | Group by, then view commands.
                        Also exports hasOverflowItems()
  toolbarStyles.ts      BTN / BTN_ON / BTN_OFF / MENU_ITEM, shared by both
  TableView, CardsView, KanbanView, CardItem, GridStates, SelectionPill
  makeActionColumns     Row action buttons + column factory
  table/                Colgroup, HeaderCell, HeaderFilter, GroupHeaderRow,
                        DataRowFragment, BodyDataCell, SelectionCells,
                        CellEditPopover, CellWithTooltip, ActionsOverlayCell
  editors/              EditorRegistry, MarkdownEditor, CodeEditor
  inputs/               Text, Number, Select, TextArea, Date, Time
  containers/           EditContainers, OverlayEditContainer, EditInline,
                        EditFormBody (shared form), FormLayout, EditModal,
                        EditDrawerRight, EditDrawerBottom

utils/
  filterFns.ts          dgText, dgSelect, dgMultiSelect, dgBoolean, dgDateRange,
                        filterFnFor, toDayString
  getRowKey.ts          Row identity
  getAccessorKey.ts     getAccessorKey, computeDefaults
  markdown.tsx          safeHref, renderMarkdown (pure, no editor dependency)
```

---

## 8. Task recipes

**Add a column feature** → extend `ColumnMeta` in `types/column.ts`, then read it where it
applies (`ui/table/BodyDataCell.tsx` for cells, `ui/editors/EditorRegistry.tsx` for form
fields, `hooks/useGridColumns.ts` for column assembly).

**Add an editor kind** → add to the `EditorKind` union; build the component in
`ui/inputs/` (plain control) or `ui/editors/` (rich); add a branch to the `Comp` chain in
`EditorRegistry.tsx`. Rich editors need `isRich` handling so the plain input border/focus
classes aren't layered on top. `"switch"` is deliberately absent from that chain — it has
its own inline branch further down.

**Add a filter kind** → extend `ColumnFilterMeta`; write the `FilterFn` in
`utils/filterFns.ts` and map it in `filterFnFor`; add the control to
`ui/table/HeaderFilter.tsx`.

**Add a view** → build it in `ui/`, then branch in `ui/GridBody.tsx`. Don't branch in
`DataGrid.tsx`.

**Change what a write does** → `hooks/useGridMutations.ts`, not the component.

**Change grid state** → the owning hook in `hooks/`. Don't add `useState` to
`DataGrid.tsx`.

---

## 9. Conventions

- **Tests colocate** with their subject (`X.tsx` → `X.test.tsx`). Excluded from the
  published build by `tsconfig.build.json` and by never entering the import graph.
  `npm test` (110 tests, 9 files), `npm run test:coverage` (writes `coverage/`, gitignored).
- **Verify with** `npx tsc -p tsconfig.app.json --noEmit`, `npm test`, `npm run build:lib`.
  Baseline, none of it new breakage: `eslint src` reports **25 warnings, 0 errors**;
  `eslint .` adds **1 parsing error** on `vitest.config.ts`, which the tsconfig project
  service doesn't cover.
- **Comments** state the current rule and the reason it matters. Do not reference bug
  numbers, ticket ids, design-report sections, prototype CSS class names, or what a
  previous version did wrong. Where history is the only thing preventing a regression,
  write it as a forward instruction ("Don't add X here — it defeats Y").
- **Never commit unless asked.** Present the diff and a proposed message first.
