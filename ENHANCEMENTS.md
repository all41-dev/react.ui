# Enhancements

Changes consuming apps have asked the library for, what each one is, and what a consumer
has to do once it ships. An item leaves this file when it is released and the CHANGELOG
carries it.

All four below came out of the ops subscription form (`react-front`,
`components/grids/subscriptionColumns.tsx`) — the first form to put every editor kind into
one grouped layout. All four are implemented in the working tree and **unreleased**: a
consumer cannot use them until the version is published and its pin bumped.

## 1. A switch aligns with the plain editors beside it

**Status:** built — `ui/editors/SwitchField.tsx`, `types/formLayout.ts`

Plain editors go through `FieldChrome`: a micro-label row, a 5px gap, then a 32px control,
which puts the control's top edge about 18px down the cell. `SwitchField` used one
horizontal layout everywhere — a 21px track at the top of the cell with the label inline
beside it. In a grid row the track floated above the neighbouring input, with no
micro-label over it to match the labels either side.

The switch now has two layouts and picks between them from the section it sits in, not
from a consumer option: the inline form inside a `variant: "cards"` section, the stacked
`FieldChrome` geometry everywhere else. `FormGroupVariant` is now a named exported type.

This never showed while switches lived in the automatic `options` cards group. A form that
files them under a topical section instead hits it immediately.

**Consumer action:** none. A form that already relies on the cards layout is unchanged.

## 2. Markdown editor: side-by-side write and preview

**Status:** built — `ui/editors/MarkdownEditor.tsx`, `ui/editors/MarkdownToolbar.tsx`

Preview used to replace the source, which is the wrong trade for anything longer than a
sentence. `MarkdownPreviewMode` adds a split: source left, live preview right. Below `md`
there is no width for two panes, so the split collapses back to the tabs, and the toolbar
drops its tab control when both panes are on screen.

**Consumer action:** opt in per field with `editorProps: { preview: "split" }`. The
default stays `"tab"`.

## 3. A field hint derived from the value being edited

**Status:** built — `ui/editors/FieldHint.tsx`, `types/column.ts`, `ui/editors/FieldChrome.tsx`

`meta.description` is static and `meta.format` is cell-display only, so a form field could
say nothing about what the user had just typed. `meta.hint` fills that gap:

```ts
hint?: (value: unknown, formValues: TForm) => ReactNode
```

It renders under the control, is replaced by the error line when the field is invalid, and
re-evaluates on every keystroke — `FieldHint` subscribes to the form through `useWatch`,
which is also why it mounts only for the fields that declare one. Returning `null` renders
no element, so a field that has nothing to say keeps its height.

The library carries no cron or date knowledge; the text is the consumer's. Validation stays
in the consumer's schema.

**Consumer action:** the ops form wants it on three fields — polling schedule and retry
schedule echoing the cron expression as prose, polling value echoing the timestamp as
elapsed time. `react-front` already has `humanizeCron` and `relativeTime` in
`utils/humanize.ts`.

## 4. `onEditStateChange`

**Status:** built — `hooks/useEditStateChange.ts`, `DataGrid.tsx`

Only the imperative `DataGridHandle` could tell a parent that a row's form was open, so a
parent could cause an edit session but never react to one. `EditState` is now an exported
type.
