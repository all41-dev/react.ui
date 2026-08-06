status: done

## Review: DataGrid component (src/components/datagrid — full component, ~80 files)

Verdict: **Approve with comments**

Ratings: correctness 4/5 · security 5/5 · performance 4/5 · a11y 4/5 · cleanliness 5/5 · types 3/5

Checks run: `npx tsc --noEmit` clean · `npm test` 110/110 passed · `npm run lint` only fast-refresh warnings (SelectionCells mixed exports) + a vitest.config.ts tsconfig inclusion error, both outside component logic · no `dangerouslySetInnerHTML`/`innerHTML`/`eval` anywhere in the component.

### 🔴 Critical

— none.

### 🟡 Important

- [ ] `src/components/datagrid/ui/editors/EditorRegistry.tsx:121` — `...meta.editorProps` is spread **after** the `className` key of `forwarded`, so a consumer who passes `meta.editorProps.className` on a plain editor (text/number/select/date/…) replaces the entire merged class string instead of extending it. Why: the merge on line 118 already appends `editorProps.className` to `baseClass + shapeClass + invalidClass` — the spread then overwrites that with the raw value, stripping the border, focus ring and the error styling (`aria-invalid` visuals silently vanish exactly when validation fails).
  How to fix — exclude `className` from the spread:
  ```tsx
  const { className: _cn, ...restEditorProps } = (meta.editorProps ?? {}) as Record<string, unknown>;
  const forwarded: any = {
    id: String(name),
    /* aria-* … */
    className: /* merged string as today */,
    ...restEditorProps,
  };
  ```

- [ ] `src/components/datagrid/ui/containers/EditFormBody.tsx:13` — `getRowId` resolves identity as `id ?? uuid ?? ""`, ignoring the grid's `idAccessor`. It feeds the remount key `edit-${getRowId(row)}` in `OverlayEditContainer.tsx:78` and `EditInline.tsx:30`. Why: for rows keyed only by a custom `idAccessor` (README's own `employeeNumber` example), every edit session gets the same key `"edit-"`. `useForm` reads `defaultValues` once on mount, so switching the session from row A to row B without an intermediate close — e.g. `gridRef.current.startEdit(rowB)` via the imperative handle — keeps row A's values in the form, and saving writes A's data onto B. The grid already centralises identity in `getRowKey`/`getId`; this is a second, weaker identity rule drifting from it.
  How to fix: thread the grid's `getId` (or the pre-resolved row key) into the containers and key the form with it:
  ```tsx
  // DataGrid.tsx → EditContainer/EditInline: rowKey={edit.editingRow ? getId(edit.editingRow) : undefined}
  const formKey = mode === "edit" ? `edit-${rowKey ?? getRowId(row)}` : "create";
  ```

- [ ] `src/components/datagrid/ui/CardItem.tsx:26` — the clickable card is a `div onClick` with no `tabIndex`, no role and no key handler. Why: with `onRowClick` driving selection/expansion (the documented pattern), those features are unreachable from the keyboard in cards and kanban views — the same defect `DataRowFragment.tsx:70` explicitly fixed for the table (`tabIndex`, Enter/Space, target guard). Cards regress the standard the table already holds.
  How to fix — mirror the row's approach when interactive:
  ```tsx
  tabIndex={onRowClick ? 0 : undefined}
  role={onRowClick ? "button" : undefined}
  onKeyDown={onRowClick ? (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    if (e.target !== e.currentTarget) return;
    e.preventDefault();
    onRowClick(row.original);
  } : undefined}
  ```

- [ ] Typing of the form stack — `EditFormBody.tsx` (`computeDefaults as any`, `control as any`, `zodResolver(zodSchema as any)`, `errors as any`), `FormLayout.tsx:119` (`column: c as any`), `useColumnPrefs.ts:78,85,93` (`updater: any`), `EditorRegistry.tsx` (`forwarded: any`). Why: `tsc --noEmit` is clean only because the casts silence it; a signature drift in react-hook-form or a column meta typo now surfaces at runtime instead of compile time. The prefs handlers have an exact library type available.
  How to fix (start with the free wins): `onColumnSizingChange: (updater: Updater<Record<string, number>>) => …` etc. in `useColumnPrefs`; type `FormFieldsProps.control` as `Control<TForm>` instead of `unknown`; keep the genuinely hard RHF generic casts but concentrate them in one typed helper rather than at every call site.

### 🟢 Minor

- `src/components/datagrid/hooks/useGrouping.ts:67` — `localeCompare(b, "fr")` hardcodes French collation into a published library component. Suggest `localeCompare(b)` (runtime locale) or a `locale` option on `GroupOption`.
- `src/components/datagrid/DataGrid.tsx:270` — `facetChips` memo depends on `filters`, the hook's return object, which is rebuilt every render — the memo never hits, and the new `facets` array defeats `DataGridToolbar`'s `memo` too. Depend on the stable pieces instead: `[filters.buildFacetChips, grouping.activeGroupOption, grouping.clearGroupBy]` (`buildFacetChips` is already a `useCallback` keyed on `columnFilters`).
- `src/components/datagrid/ui/TableView.tsx:304` — `aria-rowindex` is `virtualRow.index + 1` over the current page slice (and counts group-header items), while `aria-rowcount` (line 181) is the filtered total across all pages. On page 2 a screen reader hears "row 1 of 500" for row 11, and grouped bodies shift indices by the number of headers above. Offset by `pageIndex * pageSize` and count data items only (or set `aria-rowcount` to `items.length`).
- `ToolbarOverflowMenu` / `ColumnsPopover` panels are absolutely positioned inside the grid root, which is `overflow-hidden` (needed for the rounded corners — the Tooltip was portaled for exactly this reason, DataGrid.tsx:396). On a short grid (few rows / empty state) a ~300px panel can clip at the grid's bottom edge. Worth a quick manual check; portal them if it clips.
- `SelectionCells.tsx` fast-refresh lint warnings — run the linter / split component exports if HMR in dev matters.

### ❓ Questions

- `useRowSelection.ts:86` — after a local edit of a selected row, `onSelectionChange` deliberately does not re-fire (selection identity unchanged), so a consumer holding the callback's row array has stale objects for bulk actions until the selection next changes. Is that trade-off intended for consumers driving bulk edits off the callback?
- `DataRowFragment.tsx:145` — the memo comparator treats `prev.row.original === next.row.original` as "row unchanged" while rendering from `row.getVisibleCells()`. That works because TanStack row objects read live table state, but it quietly depends on that implementation detail — worth a one-line comment so a future refactor doesn't snapshot cells?

### 👍 What is good

- The referential-stability discipline is exemplary and, unusually, documented at every decision point: cell callbacks travel by context so the column model survives renders (`DataGridContext.ts`), the selection context is split so body cells don't re-render per checkbox click, and the reconcile-during-render pattern (`useGridRows`, `useRowSelection`, `useColumnPrefs`, `SearchBar`, `TextFilter`) is used correctly and consistently instead of effect-based syncing.
- Security posture of the markdown pipeline is textbook: React nodes only (no HTML parsing), scheme **allowlist** for hrefs with C0-control stripping (`utils/markdown.tsx:23`), disallowed links rendered as inert text rather than dropped. No injection sinks anywhere in the component.
- Accessibility work is far above the norm for an in-house grid: `role="grid"` with virtualization-aware row counts, `aria-sort`, focus traps with focus return, keyboard column resize (`HeaderCell.tsx:37`), page-scoped select-all with a real checkbox underneath, and an `alertdialog` confirm.
- Edit-session state as a discriminated union (`useEditSession.ts`) makes the impossible states unrepresentable, and the three-hook `format`/`toForm`/`fromForm` contract is clearly explained and honoured everywhere including the single-cell save round-trip.
- Test coverage is real: 110 passing tests over filter fns, grouping, prefs, edit session, confirm and grid integration, with fixtures that encode past regressions.
