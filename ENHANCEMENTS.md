# Enhancements

Changes consuming apps have asked the library for, and what a consumer has to do once one
ships. An item leaves this file when it is released and the CHANGELOG carries it.

## Open

From the ops workbench's frame (`react-front`, `features/workbench/`), where each of
these existed as a one-consumer component, in the Unreleased CHANGELOG:

- **`Tabs` + `TabPanel`** replacing the workbench's `ObjectTabs`/`TabPanel`. The consumer
  keeps its tab lists, labels and icons and maps them onto `TabItem[]`; the ids follow
  `idPrefix`, so a host that asserted on `wb-panel-*` passes `idPrefix="wb"`.
- **`ErrorState`** replacing the workbench's load-error card. The consumer keeps its
  wording and its message formatting and passes them in.
- **`CountBadge`** replacing the rail's error pill; **`KeyValue`** replacing the bar's
  summary chip. The consumer's `danger` text token is no longer needed — the library
  mixes the danger colour toward the body text itself.

From the ops workbench's raw-record inspector (`react-front`,
`features/workbench/frame/JsonInspector.tsx`), in the Unreleased CHANGELOG:

- **`CodeView`** at the `/code-editor` entry — the editor's engine and palette without
  its chrome, for showing a value rather than editing one. The consumer supplies the
  frame (border, background, header) and passes the serialised text; `fill` inside a
  drawer, `rows` inside a card.
- **`--rui-syntax-*` tokens** replacing the status colours in the highlight style. A
  consumer does nothing unless it had overridden `--rui-info` or `--rui-warning` to
  recolour code, in which case the override moves to `--rui-syntax-key` /
  `--rui-syntax-number`.

From the ops workbench's record band (`react-front`,
`features/workbench/record/RecordEditor.tsx`), in the Unreleased CHANGELOG:

- **`RecordForm`** — the edit form outside a grid, from the same columns and schema, so
  the workbench's module, exchange and subscription records stop carrying a second
  form implementation. The consumer wraps it in a height-capped flex column and
  reads `onDirtyChange` to guard navigation away from a draft.
- **`onSubmit(values, { dirtyKeys })`** — the changed keys, so a record that PATCHes
  only what moved does not diff the values itself.

## Shipped

Four requests from the ops subscription form (`react-front`,
`components/grids/subscriptionColumns.tsx`) — the first form to put every editor kind into
one grouped layout — all released in **0.3.4** and described in the CHANGELOG:

- A switch takes its layout from its section, so one filed under a topical group lines up
  with the inputs beside it instead of floating above them.
- `editorProps: { preview: "split" }` puts the markdown source and its preview side by side.
- `meta.hint` renders a value-derived echo under the control, live as the value is typed.
- `onEditStateChange` reports the edit sessions the grid opens, swaps and closes.
