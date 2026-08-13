# DataGrid

A data table you configure with columns and a zod schema, and it gives you the rest:
sorting, filtering, search, pagination, grouping, a cards view, and create/edit/delete
forms in a drawer, modal or inline panel.

The idea is that you describe your data once — one array of column definitions — and the
grid works out what to render, what the edit form looks like, and how each field is
validated. You are not wiring a table together piece by piece.

```tsx
import { DataGrid } from "@all41-dev/react.ui";
import "@all41-dev/react.ui/styles";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2, "Name is too short"),
  email: z.string().email("Not a valid email"),
  role: z.string(),
});

const columns = [
  { accessorKey: "name", header: "Name", meta: { editor: "text", required: true } },
  { accessorKey: "email", header: "Email", meta: { editor: "text", required: true } },
  {
    accessorKey: "role",
    header: "Role",
    meta: {
      editor: "select",
      options: [
        { value: "admin", label: "Admin" },
        { value: "user", label: "User" },
      ],
    },
  },
];

<DataGrid
  title="Users"
  columns={columns}
  zodSchema={schema}
  initialData={users}
  onPersist={async (mode, values, prev) => save(values, prev)}
  onDelete={async (row) => remove(row.id)}
/>;
```

That gets you a sortable, searchable, paginated table with working Add / Edit / Delete.

---

## The one thing to understand: `meta`

Everything interesting lives in a column's `meta`. A column definition is a normal
TanStack Table `ColumnDef` — `accessorKey`, `header`, `cell` all behave as you'd expect —
and `meta` is where you tell the grid the things TanStack doesn't know about.

```tsx
{
  accessorKey: "price",
  header: "Price",
  meta: {
    editor: "number",           // → appears in the edit form as a number input
    required: true,             // → red asterisk on the label
    filter: { type: "text" },   // → gets a filter box in the header row
    align: "right",
    mono: true,
    formLayout: { order: 2 },   // → second field in the form
  },
}
```

No `editor` means the column displays but never appears in the edit form. That's how you
handle read-only columns — an id, a computed total, a status badge.

### Display vs. editing: `format`, `toForm`, `fromForm`

This trips people up, so it's worth being explicit. There are three hooks and they each
have exactly one job:

| Hook | Runs when | Use it for |
|---|---|---|
| `format` | Rendering the cell | Making a value look nice on screen |
| `toForm` | Opening the edit form | Turning a stored value into something an input can hold |
| `fromForm` | Submitting | Turning the input's value back into what you store |

The reason they're separate: if a column formats `1234` as `"1 234 €"`, and the form
seeded itself from `format`, your user would edit the string `"1 234 €"` and you'd save
that back. So `format` never touches the form.

```tsx
{
  accessorKey: "priceCents",
  header: "Price",
  meta: {
    editor: "number",
    format: (v) => `€${((v as number) / 100).toFixed(2)}`,  // 1234 → "€12.34"
    toForm: (v) => (v as number) / 100,                     // 1234 → 12.34
    fromForm: (v) => Math.round(Number(v) * 100),           // 12.34 → 1234
  },
}
```

---

## What you get, and how to turn it on

Most features are one prop. Nothing below is on by default unless it says so.

**Search** is on by default — a wide field in the toolbar matching across all columns. Pass
`searchable={false}` to remove it.

That field is the grid's main control, in the Odoo sense: the active criteria live *inside*
it as pills — one per column filter, one for the grouping — each with its own `×`, and
Backspace in an empty field removes the last one. A pill shows what the control that set it
shows, so a select filter reads `ROLE Admin`, not the `admin` it stores.

Welded to the field's right edge is a caret that opens the rest, organised the way Odoo
organises its control panel:

- **Filter** and **Group by**, side by side under their own headings — the filter row
  switch (plus **Clear all** once something is set) on the left, the group-by list on the
  right.
- Below a rule, the two commands that change the *view* rather than the query: **Columns**
  and **Refresh**.

The caret carries the active-filter count, turns accent when anything is engaged, and stays
open while you stack criteria — Escape or a click outside closes it. With
`searchable={false}` the pills and the caret stay; only the input goes.

**Sorting** is on by default: click a header. `initialSorting` sets the starting state.

**Pagination** is on by default at 10 rows per page. `pagination={{ enabled: false }}`
turns it off, `pagination={{ initialState: { pageSize: 25 } }}` changes the size. You can
drive it from outside too, but you must pass **both** `state` and `onChange` — one without
the other leaves you with a pager that looks alive and does nothing (the grid warns in
development if you do this).

**Column filters** appear once any column declares `meta.filter`. A **Filter row** switch
shows up in the caret menu and toggles a row of inputs under the header; whatever you set
there shows as a pill in the search field. Four kinds:

```tsx
meta: { filter: { type: "text", placeholder: "Search name…" } }
meta: { filter: { type: "select", options: [...], multi: true } }
meta: { filter: { type: "boolean", labels: { true: "Yes", false: "No" } } }
meta: { filter: { type: "dateRange" } }
```

**Selection** — `selectable` adds a checkbox column, a select-all in the header and a
"N selected" pill in the footer. `onSelectionChange` hands you the selected row objects.

**Cards view** — pass `card={(row) => <YourCard {...row} />}` and a list/cards toggle
appears in the toolbar. The grid still owns search, filters and selection; you just
provide the card body. Create/edit/delete work from cards too: overlay containers open
as usual, and `editContainer="inline"` — which names a table-row placement with no cards
equivalent — opens as a modal while cards are shown. Expanded rows render inside the
card, between body and footer, scrolling sideways if the panel is wider than the card.
Switching views closes any open editor. Custom action buttons receive the active view
(`renderActions` gets `view: "list" | "cards" | "kanban"`), so a button whose target
only exists in one view can hide or swap itself. Cell editing stays table-only — cards
render no cells.

**Grouping** — pass `groupOptions` and a Group-by list appears in the caret menu:

```tsx
groupOptions={[
  { key: "status", label: "Status", values: [
    { value: "active", label: "Active", color: "#22c55e" },
    { value: "pending", label: "Pending", color: "#f59e0b" },
  ]},
]}
```

Grouped rows get collapsible headers. Any column with `meta.agg: "sum"` shows a per-group
total. Omit `values` and buckets come from the data, sorted. Grouping plus the cards view
gives you a kanban board, one column per bucket.

**Row expansion** is fully controlled — you own the state and the toggle:

```tsx
const [expanded, setExpanded] = useState(new Set<string>());

<DataGrid
  expandedRowIds={expanded}
  renderExpandedRow={(row) => <Detail row={row} />}
  onRowClick={(row) => setExpanded(toggle(expanded, row.id))}
/>
```

**Cell editing** — add `meta.cellEdit: true` to a column that has an `editor`, and
clicking that cell opens a small popover for just that field. Saves call `onPersist` with
mode `"cell"`. Only the edited field is validated, so a schema failure on some unrelated
column doesn't block you.

**Column preferences** — width, order and visibility persist to `localStorage`
automatically, keyed by `storageKey` (default: a slug of the `title`). **Columns** in the
caret menu opens a panel for hiding and reordering, with a Reset. Give each grid its own
`storageKey` if two grids share a title.

Rows are virtualized, so large datasets are fine without you doing anything. Cell tooltips
are automatic too — one appears when text is actually clipped, and `meta.tooltip: true`
forces one even when it isn't.

---

## Where the edit form goes

`editContainer` picks the shell:

| Value | Result |
|---|---|
| `"right"` (default) | Drawer sliding in from the right |
| `"bottom"` | Bottom sheet |
| `"modal"` | Centred dialog |
| `"inline"` | Panel that expands under the edited row (opens as a modal while cards view is active) |
| `"none"` | No form at all — read-only grid, no Add button |

The form's contents come from your columns and schema. `formLayout` on the grid controls
the shape (`{ columns: 2 }` for a two-column form), and `meta.formLayout` on each column
controls that field's `order`, `colSpan` and classes. Markdown and code editors take the
full width by default.

Available editors: `text`, `number`, `select`, `switch`, `date`, `time`, `textarea`,
`markdown`, `code`. Switches are collected into their own "Options" section at the bottom
of the form.

### The `code` editor

CodeMirror 6: syntax highlighting, find/replace, bracket matching, folding, formatting
(Prettier, `Shift+Alt+F`) and syntax-error marks. Configure it through
`meta.editorProps`, or use `<CodeEditor>` directly outside a grid.

```tsx
{
  accessorKey: "filter",
  header: "Filter",
  meta: {
    editor: "code",
    editorProps: {
      language: "javascript",   // "javascript" | "json" | "text"
      mode: "modal",            // "full" | "modal" | "small" | "inline"
      rows: 8,
      completions,              // CodeCompletionSource
      diagnostics,              // CodeDiagnosticSource
    },
  },
}
```

`inline` is one line with no chrome and rejects newlines however they arrive — the shape
a cell popover needs.

The editor knows syntax and nothing else. Domain knowledge arrives through two sources,
typed with plain shapes rather than CodeMirror's own so the engine stays an
implementation detail:

```ts
// The member chain is already parsed: `context.obj.address.ci` arrives as
// { path: ["context", "obj", "address"], word: "ci" }. Filtering by `word` is the
// editor's job — return everything reachable at `path`.
const completions: CodeCompletionSource = ({ path }) =>
  fieldsAt(path).map((f) => ({ label: f.name, detail: f.type, kind: "property" }));

// Merged with the parser's own syntax errors. Offsets are clamped to the document.
const diagnostics: CodeDiagnosticSource = (text) =>
  check(text).map((p) => ({ from: p.start, to: p.end, severity: "warning", message: p.why }));
```

`@codemirror/*` and `prettier` are dependencies but stay external to the bundle, so a
consumer resolves one copy of each — two copies of `@codemirror/state` make the editor
throw. Prettier is imported only when the format command runs.

---

## Saving

One callback handles all three writes:

```tsx
onPersist={async (mode, values, prev) => {
  //  mode: "create" | "edit" | "cell"
  //  values: validated, zod-parsed, TForm-shaped
  //  prev: the original row (absent on create)
  const saved = await api.save(values, prev);
  return saved;  // return the server's row and the grid shows it immediately
}}
```

Return the saved row and the grid reflects it right away. Throw, and the form shows the
error and stays open — so validation failures from your server land in the right place.

`onDelete` gets a confirmation dialog for free. Throwing from it surfaces a toast and
leaves the row where it is.

### With TanStack Query

If you're already using TanStack Query, `useCrudAdapter` wires the whole thing up:

```tsx
const grid = useCrudAdapter({
  queryKey: ["users"],
  list: api.getUsers,
  create: api.createUser,
  update: api.updateUser,
  remove: api.deleteUser,
  getId: (u) => u.id,
});

<DataGrid
  columns={columns}
  zodSchema={schema}
  initialData={grid.rows}
  isLoading={grid.isLoading}
  error={grid.error}
  onRetry={grid.refetch}
  onPersist={grid.onPersist}
  onDelete={grid.onDelete}
/>;
```

Mutations invalidate the query on success, so the grid re-reads server truth.

---

## Two things that will bite you

**`initialData` must be a stable reference.** The grid holds rows locally so edits appear
instantly, and it re-syncs whenever `initialData` changes identity. Build the array inline
on every render and you'll wipe out pending local changes:

```tsx
// Wrong — new array every render
<DataGrid initialData={users.filter(u => u.active)} />

// Right
const active = useMemo(() => users.filter(u => u.active), [users]);
<DataGrid initialData={active} />
```

TanStack Table places the same requirement on its own `data` prop, so this may already be
familiar.

**Row identity.** The grid needs a stable key per row for selection, local updates and
React keys. It looks for `idAccessor`, then `row.id`, then `row.uuid`. If your rows use
something else, say so:

```tsx
<DataGrid idAccessor={(r) => r.employeeNumber} />
```

Get this wrong and the symptom is strange rather than obvious — one checkbox selects every
row, and edits don't stick.

---

## Driving the grid from outside

A ref gives you imperative control, which is handy for putting an Add button in your own
page header:

```tsx
const grid = useRef<DataGridHandle<User>>(null);

<button onClick={() => grid.current?.startCreate()}>New user</button>
<DataGrid ref={grid} … />
```

Available: `startCreate()`, `startEdit(row)`, `cancelEdit()`, `isEditing()`,
`clearSelection()`.

---

## Loading and error states

Pass `isLoading` and the grid shows skeleton rows on first load, or a spinner overlay when
refreshing. Pass `error` (a string or an `Error`) and a banner appears under the toolbar
with a Retry button wired to `onRetry`, and the Add button is disabled while it's up.

Empty is handled for you, and it distinguishes two cases: genuinely no data (your
`emptyLabel`), versus filters matching nothing — which offers a Clear filters button
instead of leaving the user stuck.

---

## Accessibility

Worth knowing what's already handled, so you don't rebuild it: the table has proper grid
semantics and an accessible name from `title`; clickable rows are keyboard-operable and
non-interactive ones stay out of the tab order; the pager is a labelled region with arrow
key navigation; overlay forms trap focus, close on Escape and restore focus on close; the
confirm dialog is a named `alertdialog`. Form fields wire up `aria-invalid`,
`aria-describedby` and `aria-required` from your column meta.

---

## Everything the package exports

```tsx
import {
  DataGrid,
  useCrudAdapter,          // TanStack Query → grid props
  useTanstackQueryAdapter, // lower-level version of the above
  useColumnPrefs,          // column persistence, if you want it standalone
  useConfirm,              // the confirm dialog, usable anywhere
  EmptyState,
  Tooltip,
  LoadingScreen,
  toast,
} from "@all41-dev/react.ui";

import type {
  DataGridProps,
  DataGridHandle,
  WithMeta,        // your column array type
  ColumnMeta,
  ColumnFilterMeta,
  EditorKind,
  Option,
  SelectOption,
  ActionColumnOpts,
  EditContainerKind,
  FormLayoutConfig,
  CrudAdapter,
  IdLike,
  UseTQAdapterParams,
} from "@all41-dev/react.ui";
```

Peer dependencies you need installed: `react` 19, `react-dom`, `zod` 4,
`react-hook-form`, `@hookform/resolvers`, `@tanstack/react-table`,
`@tanstack/react-virtual`, `@tanstack/react-query`, `sonner`, `react-tooltip`.

Don't forget `import "@all41-dev/react.ui/styles"` — nothing injects the stylesheet at
runtime.

---

## Layout of the source

If you're changing the grid rather than using it:

```
DataGrid.tsx          Composition only — reads as an outline of the whole component
types/grid.ts         Props and the ref handle (the public surface)
types/column.ts       ColumnMeta — where most features are declared
hooks/                One concern each: rows, selection, filters, pagination,
                      columns, grouping, the edit session, and all writes
                      (useGridMutations)
ui/                   Toolbar, GridBody, GridFooter, the three views
ui/table/             Everything inside the <table>
ui/editors/           The form editors and the registry that picks one
ui/containers/        Drawer / modal / inline shells and the shared form body
utils/                Filter functions, row keys, accessor keys, markdown
```

Tests sit next to what they test. `npm test` runs them, `npm run test:coverage` for
coverage.
