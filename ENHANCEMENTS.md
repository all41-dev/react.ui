# Enhancements

Changes consuming apps have asked the library for, and what a consumer has to do once one
ships. An item leaves this file when it is released and the CHANGELOG carries it.

## Open

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

## Shipped

Four requests from the ops subscription form (`react-front`,
`components/grids/subscriptionColumns.tsx`) — the first form to put every editor kind into
one grouped layout — all released in **0.3.4** and described in the CHANGELOG:

- A switch takes its layout from its section, so one filed under a topical group lines up
  with the inputs beside it instead of floating above them.
- `editorProps: { preview: "split" }` puts the markdown source and its preview side by side.
- `meta.hint` renders a value-derived echo under the control, live as the value is typed.
- `onEditStateChange` reports the edit sessions the grid opens, swaps and closes.
