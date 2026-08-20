# Enhancements

Changes consuming apps have asked the library for, and what a consumer has to do once one
ships. An item leaves this file when it is released and the CHANGELOG carries it.

## Open

None.

## Shipped

Four requests from the ops subscription form (`react-front`,
`components/grids/subscriptionColumns.tsx`) — the first form to put every editor kind into
one grouped layout — all released in **0.3.4** and described in the CHANGELOG:

- A switch takes its layout from its section, so one filed under a topical group lines up
  with the inputs beside it instead of floating above them.
- `editorProps: { preview: "split" }` puts the markdown source and its preview side by side.
- `meta.hint` renders a value-derived echo under the control, live as the value is typed.
- `onEditStateChange` reports the edit sessions the grid opens, swaps and closes.
