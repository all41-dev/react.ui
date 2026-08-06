# DataGrid — ideas and known gaps

Backlog, not a spec. **An item is open unless its section says it landed** — and once it
lands, the section shrinks to a pointer rather than disappearing, so the numbers stay
stable. Contract and current behaviour live in `./AGENTS.md`; this file is what we think
should change next and why.

Each item is tagged:

- **[bug]** — behaves wrong, confirmed in the code (file:line given)
- **[design]** — works as written, but the decision looks wrong now
- **[gap]** — never built
- **[idea]** — proposal, no request behind it

Effort is a rough shape: **S** touches one file, **M** touches a few, **L** changes the layout
model or the public API.

---

## 1. Search bar and facets — the Odoo model — **landed 2026-08-06**

All five items shipped. The toolbar is now title · **search bar** · view toggle · Add, where
the search bar is one welded control: `ui/SearchBar.tsx` holds the input and the facet
pills, with `ui/ToolbarOverflowMenu.tsx` flush against its right edge. `ui/FacetChips.tsx`
and the chip band under the toolbar are gone; the shared model lives in `types/facets.ts`.
Behaviour is documented in `AGENTS.md` §5, covered by five tests in `DataGrid.test.tsx`
("the search bar holds the active criteria").

A second pass took the dropdown the rest of the way to the Odoo model: a **caret** instead
of an ellipsis (an ellipsis promises a loose list of commands; this opens a panel bolted to
a field), the trigger's height fixed so it matches a field grown by pills, the panel split
into **Filter** and **Group by** columns with the view commands under a rule, a **Clear
all** row, and pills that show a select filter's *label* rather than its stored value.

Left open on purpose: the pills are read-only. Clicking one to *edit* the criterion (rather
than clear it) is the natural next step, and it is what 3.3 needs.

---

## 2. Cards and kanban are second-class

The table view got the attention; cards and kanban quietly do less. All three below are the
same root cause: **features are wired into `TableView` rather than into the grid.**

| # | Item | Tag | Effort |
|---|---|---|---|
| 2.1 | **Row actions do nothing in card view** (partly). | [bug] | M |
| 2.2 | **Cards ignore pagination.** | [design] | M |
| 2.3 | **Kanban needs "load more".** | [gap] | M |

### 2.1 — what actually breaks

Cards *do* render the action buttons — `CardItem.tsx:53-65` flexRenders the action cell — so
the buttons are there. What fails is where they lead:

- **Edit** is dead when `editContainer: "inline"`. The inline form is built at
  `DataGrid.tsx:245` and handed **only to `TableView`** (`GridBody.tsx` passes `inlineEditor`
  to the table branch and nothing else). In cards, Edit sets the edit session and nothing
  renders. Drawer / modal / bottom containers are portalled separately, so those *do* work.
- **Row expansion** is dead everywhere but the table, for the same reason: `renderExpandedRow`
  is only consumed by `DataRowFragment`.
- **Delete** and any custom `renderActions` button should work — they aren't view-dependent.

So: "none of the buttons work" is really "Edit and expand are table-only". Fix is either to
render the inline editor inside the card/column, or to fall back to a modal in card view when
`editContainer: "inline"` — the second is much cheaper and arguably better, since an inline
form inside a 268px card is not a good form.

### 2.2 — pagination

Bypassing it is deliberate and documented (`CardsView.tsx:28-32`): cards read
`getFilteredRowModel()` and virtualize the whole filtered set. The footer still shows a pager,
so the UI contradicts itself — that is the part that is clearly wrong, whichever way we go.

Two coherent options, pick one:

- **Respect pagination** — read `getRowModel()` like the table. Consistent, and the pager in
  the footer starts telling the truth. Loses "scroll the whole set".
- **Keep the whole set, hide the pager** in card view, and show a plain "N items" count as
  grouping already does.

### 2.3 — kanban load-more

Kanban columns come from the grouping buckets, which partition the *sorted* model
(`useGridGrouping.ts:49-58`) — grouping replaces pagination entirely, so a 500-row bucket
builds one very tall column. Each column already virtualizes (`KanbanView.tsx:57-60`), so this
is a UX cap rather than a perf fix: show the first N per column with a
**"Load 20 more (of 340)"** button pinned at the column's foot. Per-column, not global.

---

## 3. Ideas we haven't discussed

Mine, ordered by what I think pays off soonest.

### 3.1 `initialColumnVisibility` prop — [gap], S

Column visibility comes only from `localStorage` (`useColumnPrefs.ts`). A caller cannot say
"open with these five columns". The Articles demo works around it by hand-writing the grid's
own prefs blob before mount (`app/demos/articles/columnPrefs.ts`) — a workaround that reaches
into a private storage shape and that **Reset in the Columns popover undoes**, because Reset
restores *all* columns rather than the caller's intent.

A `initialColumnVisibility` prop used as the seed *and* as the Reset target fixes both. This is
the smallest high-value item on the list.

### 3.2 Undo instead of confirm — [idea], M

Delete currently blocks on an `alertdialog`. A toast with **Undo** is faster for the common
case and safer for the rare one — the row goes, and a 5–8s window restores it. Keep the modal
only where the write is genuinely unrecoverable. `useGridRows.removeRow` already holds the row
object, so the restore is local.

### 3.3 Saved views — [idea], L

Filters + group-by + column layout + sort, named and recalled from the search bar. The facet
model this needs now exists (`types/facets.ts`, section 1), and this is the feature people
actually mean when they ask for "Odoo-like". Store next to `storageKey`.

### 3.4 Keyboard model — [idea], M

Rows are focusable and Enter/Space activate them (`DataRowFragment.tsx`), but there is no
grid-level navigation: `↑`/`↓` between rows, `/` to focus search, `e` to edit the focused row,
`Escape` to clear the focused facet. For a screen someone lives in all day this is the
difference between usable and pleasant.

### 3.5 Flash the changed *cells*, not the whole row — [idea], S

The post-write flash (`.rui-row-changed`) washes the entire row. Diffing previous against saved
and tinting only the cells that actually changed answers "what did I just change?" precisely,
and it makes an edit to a hidden column visibly *absent* — which is a useful signal in itself.

### 3.6 Density toggle — [idea], S

40px rows are comfortable; a compact 32px mode fits a third more on screen. One class swap plus
the virtualizer's `estimateSize`, persisted next to the column prefs.

### 3.7 Pinned first column — [idea], L

Wide grids scroll horizontally and you lose the identifying column. Freezing the first data
column (and the select/actions cells) is the standard answer. Genuinely fiddly with the current
`overflow-x-auto` + virtualized `<tbody>` structure — hence L.

### 3.8 Export the current view — [idea], S

CSV of exactly what is on screen: filtered, sorted, visible columns, in display order using
`meta.format`. Small, and always the first thing asked for after a grid ships.

---

## 4. Housekeeping

The earlier entries here (missing file-map rows, a stale ESLint baseline, the test count)
were folded into `AGENTS.md` alongside section 1. What is left is a real config fix rather
than a doc correction:

- **`eslint .` still reports 1 parsing error** on `vitest.config.ts` — the tsconfig project
  service doesn't cover it. `AGENTS.md` §9 now states it as a known baseline, but the honest
  fix is to include the file in a tsconfig or add it to `allowDefaultProject`, so the lint
  run is clean and a genuinely new error stands out. [bug] S
- **`hasOverflowItems` costs a `react-refresh/only-export-components` warning** (25 now, was
  24) because `ToolbarOverflowMenu.tsx` exports a non-component beside its component. Moving
  it next to `toolbarStyles.ts` would clear that, at the cost of splitting the menu's own
  "do I have anything to show?" rule away from the menu. [idea] S
