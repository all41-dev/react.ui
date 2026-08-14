# Migration

## 0.2.x → 0.3.0

Five things need attention: one type error, one peer dependency, and three schema
adjustments. Everything else is a fix and needs no change on the consumer side — see
[CHANGELOG.md](./CHANGELOG.md).

### 1. React 19.2

`peerDependencies.react` is now `^19.2.0`. The grid uses `useEffectEvent`, which shipped in
19.2; on 19.1 a grid with a toolbar menu threw on its first render.

```
npm i react@^19.2.0 react-dom@^19.2.0
```

### 2. `actionColumnOptions.presentation` is gone

The option was declared and documented but never read — the action column has always
rendered as the floating overlay pill. Passing it now fails to typecheck. Delete the
property; nothing about the rendering changes.

```diff
  actionColumnOptions={{
-   presentation: "overlay",
    onEdit: …,
  }}
```

### 3. The form carries only the fields your columns declare

The edit form used to seed itself from the whole row, so every field the row happened to
carry rode along into `onPersist`. It is now built from the declared columns alone.

Symptom: a submit that used to pass now fails validation on a field the user never edits,
or the backend receives a payload missing that field.

Fix — give the field a form-only column:

```tsx
{ accessorKey: "tenantId", header: "Tenant", meta: { editor: "text", visibleInTable: false } }
```

Fields the row carries that the backend does **not** need — audit stamps, server
timestamps, nested relations — need no column; they are simply no longer posted back.

### 4. Optional number fields must be `.nullable()`

Clearing an optional number field used to snap the value back. `NumberInput.onChange` now
emits `number | null`, so the empty state reaches the schema.

```diff
- amount: z.number().optional(),
+ amount: z.number().nullable().optional(),
```

### 5. An optional `select` can be returned to "no value"

The placeholder option is selectable instead of disabled, so a user can clear a choice
once made. The schema decides whether that is allowed — an optional select needs to accept
the empty string:

```diff
- status: z.enum(["draft", "sent"]).optional(),
+ status: z.union([z.enum(["draft", "sent"]), z.literal("")]).optional(),
```

A required select needs no change: the empty value now fails validation with your own
message rather than being unreachable in the UI.

### Stored column preferences

Column ids now match TanStack's own rule, so a column with a dotted `accessorKey`
(`"user.name"`) is keyed `user_name` rather than `user.name`. Preferences persisted under
the old key no longer match: those grids fall back to the shipped width, order and
visibility on first load. Nothing to do — **Reset view** clears the stale entry, and the
next change the user makes writes the new shape.
