# Changelog

## Unreleased

Next release is a minor bump: three breaking changes, two at the public surface and
one in the edit form's layout.

### Breaking

- **`actionColumnOptions.presentation` removed.** The option was declared on
  `ActionColumnOpts` and documented, but nothing read it — the action column has always
  rendered as the floating overlay pill. Passing it now fails to typecheck. Delete the
  property; the rendering is unchanged.

- **The edit form carries only the fields your columns declare.** It used to seed itself
  from the whole row, so any field the row held rode along into `onPersist` — including
  ones no column mentioned. It is now built from the declared columns alone.

  If your zod schema requires a field the user never edits, give it a form-only column:

  ```tsx
  { accessorKey: "tenantId", header: "Tenant", meta: { editor: "text", visibleInTable: false } }
  ```

  Without one, validation now fails on submit where the value previously passed through.

- **`colSpan: "full"` keeps its position in the form.** Full-width fields used to be
  lifted out of the grid and stacked after every other field; they now stay where their
  `order` puts them, as a full-width row. A form mixing full-width and normal fields
  renders in a different sequence than before. Give the field an `order` past its
  neighbours to restore the old placement.

  `formLayout.className` moved with it: it lands on the form grid element itself, where
  it used to land on an outer `space-y-4` wrapper. Spacing utilities passed there now
  act on the grid.

- **React 19.2 is required.** `peerDependencies.react` narrowed from `^19.1.1` to
  `^19.2.0`. The grid uses `useEffectEvent`, which shipped in 19.2; on 19.1 a grid with a
  toolbar menu threw during its first render rather than warning at install time.

### Added

- **Field groups in the edit form.** Columns naming the same `meta.formLayout.group`
  render as one bordered `<fieldset>`, so every control in a section carries the section
  name in its accessible name. `formLayout.groups` labels and sizes the sections;
  `groupSpan` sizes a section against the form grid and `colSpan` sizes a field against
  its own section. Switches left without a `group` collect into an implicit "Options"
  section at the bottom.

- **A switch lays itself out from its section.** In a `variant: "cards"` section it keeps
  the chip form — track with the label beside it. Anywhere else it now takes the same
  micro-label-over-control stack as the plain editors, so a switch filed under a topical
  group lines up with the inputs either side of it on the form row. A cell-edit popover
  has no section and uses the stacked form. `FormGroupVariant` is exported.

- **`meta.hint`** — `(value, formValues) => ReactNode`, rendered under the control and
  fed by the value being edited, so a cron expression or a stored timestamp can carry a
  humanised echo of itself. The error line replaces it while the field is invalid, and
  returning `null` renders nothing.

- **Side-by-side markdown preview.** `editorProps: { preview: "split" }` puts the source
  and the live preview in two panes instead of behind tabs. The editor measures its own
  box and falls back to the tabs where two panes will not fit — a drawer, a narrow
  column — so the mode is safe to set on a field that appears in more than one container.
  The default stays `"tab"`. `MarkdownPreviewMode` is exported.

- **`onEditStateChange`** reports every edit session the grid opens, swaps or closes —
  the read side of `DataGridHandle`, which could only drive one. The reported `EditState`
  is `idle` / `create` / `edit` with the row / `cell` with the row and column id.

### Fixed

- Column ids now match TanStack's own rule, so a dotted `accessorKey` (`"user.name"`)
  works end to end — visibility, ordering, cell editing, the form field, the "changed"
  badge and the validation banner.
- A cell edit persisted the old value when a column declared both `id` and `accessorKey`.
- The cards view read the unsorted row model, so `initialSorting` and header sorts did
  nothing there.
- Showing the filter row sent the grid back to page 1.
- An optional `number` field could not be emptied; clearing it snapped the value back.
  `NumberInput.onChange` now emits `number | null` — schemas for optional number fields
  need `.nullable()`.
- `meta.hideOnMobile` sheared the table below `md`: the filter row, group headers, the
  skeleton and the colgroup disagreed with the data rows. It now drops the column from the
  column model instead, and such a column is left out of the Columns popover while the
  viewport owns it.
- Select-all was page-scoped while grouping rendered every row, and its label said "on
  this page" regardless.
- The selection count had nowhere to render when pagination was disabled.
- The cell-edit popover cancelled on its own inner scrolling.
- Column preferences were persisted on first render for untouched grids, which pinned any
  later-added column to the end of the table permanently.
- Form control DOM ids are prefixed per form, so two grids on one page no longer collide.
- An optional `select` could not be returned to "no value" once one was chosen.
- The toolbar count ignored active filters while the pager beside it did not.
- Clicking a group header's chevron or label did nothing; only the rest of the row
  collapsed the group.
