---
name: new-datagrid
description: Scaffold a DataGrid screen for an entity. Asks the user for the entity's data model, then interviews them about data source, pagination, search, sorting, filters, grouping, selection, cards/kanban, row expansion, cell editing, column widths, alignment and the edit container, then generates the zod schema, column array and component. Use when asked to add a grid, table, list screen or CRUD page for a new entity ("add a datagrid for Invoices", "new table for products", "CRUD screen for employees").
---

# Add a DataGrid for a new entity

**Ask, don't hunt.** The model and the feature set come from the user, not from the repo.
Do not grep for the entity, do not infer fields from a nearby file, do not assume a feature
because a comparable screen has it. Searching the codebase for the model wastes the user's
time and produces grids built on the wrong shape.

The one thing you *do* apply mechanically is the mapping from a known field to its editor
kind (Step 2) — and even that is presented for confirmation, never applied silently.

## Step 0 — Load the API contract

Read `src/components/datagrid/AGENTS.md` before anything else. It is the authority on props,
`ColumnMeta`, the invariants and the file map. Do not guess prop names from this skill —
they are summarised here, defined there.

## Step 1 — Ask for the model

Ask the user for the entity's shape. One message, up front, before any other question:

> Which entity is this for, and what does a row look like? Paste any of: a TS
> type/interface, a zod schema, an API response type, or one sample JSON object.

Accept a prose field list too ("title, author, status draft/published, word count,
published date") — that is enough to build a plan from.

Then **stop and wait**. Do not:

- Grep or Glob for the entity name anywhere in the repo.
- Open a comparable entity's model and adapt it.
- Invent fields, invent enum values, or fill gaps with what "an entity like this usually has".

If the user points you at a specific file or endpoint — "it's in `src/types/article.ts`",
"read the model from the server controller" — then read exactly that, and nothing else.
A precise pointer is an instruction; a vague one is not a licence to search.

If what you get back is incomplete (a union with no members listed, a field whose type is
unclear), ask about that specific gap rather than filling it in.

## Step 2 — Propose the field plan

Build a plan row per field of the model the user gave you, using the rules below. These are
opening proposals for the user to correct in one pass — not settled decisions.

**Display-only (no `editor`)** when the field is `id`, `uuid`, `createdAt`, `updatedAt`,
`createdBy`, `_*`, or any field the type marks readonly. Give `id`-like fields
`meta.mono: true`.

**Editor kind** by type, then by name:

| Signal | `editor` | `filter` |
|---|---|---|
| union of string literals / TS enum | `select` (options from the union) | `select` |
| `boolean` | `switch` | `boolean` |
| `number` | `number` | `text` |
| `Date`, or name ends `At`/`Date` | `date` | `dateRange` |
| name contains `time` | `time` | — |
| name matches `body\|description\|notes\|comment\|summary` | `textarea` | — |
| name matches `content\|markdown\|readme\|article` | `markdown` | — |
| name matches `code\|script\|sql\|json\|query` | `code` | — |
| any other `string` | `text` | `text` |

**`required: true`** when the model field is non-optional. **`align: "right"` + `mono`** for
numeric and currency fields. **`formLayout.order`** following the model's declaration order.
Leave `size` unset unless Round E says otherwise.

Then present the plan as one table and ask the user to confirm or correct it in one pass. Do
not ask about fields one at a time. Columns of the table:

| Field | Header | Editor | Required | Filter | Align | Notes |

Say explicitly, under the table, that anything in it is changeable — the user correcting three
rows in one reply is the expected outcome, not an exception.

## Step 3 — Interview

Use `AskUserQuestion`, max 4 questions per call, in the rounds below. Put the recommended
option first and mark it `(Recommended)`.

**Skip a question only when the user already answered it** — in the invoking prompt, in their
model reply, or in an earlier round. Another grid in the repo doing something a certain way is
not an answer; neither is the option being obvious. Ask it.

Offer an escape at the start of Round A: an option like "Use sensible defaults for everything
else" that skips Rounds B–E and applies the defaults marked ✓ below. Round F still gets asked
— never write a file to a path the user hasn't seen.

### Round A — Data and editing

1. **Data source** — Local array (caller owns state) ✓ · TanStack Query via `useCrudAdapter` ·
   Custom `onPersist`/`onDelete` · Read-only (no writes)
2. **Edit container** — Right drawer ✓ · Bottom sheet · Modal · Inline under the row · None
3. **Form layout** — 2 columns ✓ · 1 · 3
4. **Row identity** — ask *only* if the model has neither `id` nor `uuid`; otherwise state
   which one you're relying on and move on.

### Round B — Table behaviour

1. **Pagination** — On, 10 per page ✓ · On, custom size (ask which) · Off, show all ·
   Controlled by the parent (then generate both `state` and `onChange` — one without the other
   is broken)
2. **Search** — On, across all columns ✓ · Off
3. **Sorting** — No default ✓ · Sort by a column ascending · descending (offer the plan's
   fields as the follow-up)
4. **Selection** — None ✓ · Checkboxes, report selection to the parent · Checkboxes plus a
   bulk action in the toolbar

### Round C — Filters

One `multiSelect` question: which columns get a header filter. List every field the plan gave
a filter kind, and put the inferred kind in each option's description ("Status — select
filter"). Default-suggest the fields with `select` and `boolean` kinds, since those are the
cheapest to use and the most useful.

If a `select` filter is chosen for a field whose option list the user never supplied, ask for
it. Never populate a select from values you assume the field takes.

### Round D — Grouping, views, extras

1. **Grouping** — None ✓ · Group by <best candidate: an enum/select field> · Group by another
   field. If grouping is chosen, follow up on whether to declare fixed `values` with colours
   (fixes bucket order and lets you colour them) or derive buckets from the data, and on
   whether any numeric column should show a per-group `agg: "sum"`.
2. **Cards view** — No ✓ · Yes (then follow up with a `multiSelect` over the plan's fields for
   what the card shows, pre-suggesting the 3–4 most identifying ones). Mention that cards +
   grouping produces a kanban board.
3. **Row expansion** — No ✓ · Yes (then generate the controlled `expandedRowIds` state, the
   toggle wired to `onRowClick`, and a `renderExpandedRow` stub)
4. **Cell editing** — None ✓ · On specific columns (`multiSelect` follow-up over fields that
   have an `editor`; requires `onPersist`)

### Round E — Presentation

Ask these against the confirmed field plan; offer the plan's fields as the options where a
follow-up needs them.

1. **Column widths** — Let the table size them ✓ · Set widths per column (follow up with the
   px value or a preset per column: compact 100 · default 150 · wide 240 · extra-wide 360) ·
   Widths on a few key columns only (`multiSelect` follow-up over the plan's fields).
   `size` is standard TanStack; it seeds the persisted column prefs and the user can drag from
   there, so a width is a starting point, not a lock.
2. **Right-aligned columns** — `multiSelect` over the plan's fields, pre-suggesting the numeric
   and currency ones. Offer "None".
3. **Monospace columns** — `multiSelect`, pre-suggesting ids, codes, amounts and anything the
   user should be able to scan down a column. Offer "None". Can be folded into question 2 as a
   single "right-align + mono" choice when the same fields want both.
4. **Full-width form fields** — `multiSelect` over the fields that have an `editor`, for
   `formLayout.colSpan: "full"`. Pre-suggest `textarea`, `markdown` and `code` fields (markdown
   and code already default to full) plus any long single-line field like a title or URL.
5. **Form sections** — Only ask when the form has more than about eight fields: one flat form ✓ ·
   grouped into sections (follow up for a section per cluster of the plan's fields). A section
   is `formLayout.groups: [{ id, label }]` on the grid plus `formLayout.group: "<id>"` on each
   column. Leave `groupSpan` off unless the user wants sections side by side. Switches need no
   section — ungrouped ones already collect into "Options".

### Round F — Placement

1. **File path** — Propose one and ask. You may look at the repo's directory layout to make the
   proposal concrete (a sibling of the closest comparable screen; `src/app/demos/` only if this
   is a demo) — that is layout, not the model, so a quick Glob is fine here. Never write to a
   path the user hasn't confirmed.
2. **Storage key** — Default `dg:<entity-plural-slug>`. Only ask if another grid in the repo
   might share the title.

## Step 4 — Generate

Produce ONE component file unless the column array exceeds ~150 lines, in which case split
`<Entity>Columns.tsx` out beside it. Follow this shape:

```tsx
import { useMemo } from "react";
import { z } from "zod";
import { DataGrid } from "@all41-dev/react.ui";          // in-repo: relative path
import type { WithMeta } from "@all41-dev/react.ui";

/* Editable shape only. Display-only fields (id, timestamps) stay out of it, except
   an optional id when the API round-trips one. */
const invoiceSchema = z.object({
  id: z.string().optional(),
  number: z.string().min(1, "Invoice number is required"),
  status: z.enum(["draft", "sent", "paid"]),
  total: z.number().nonnegative("Total cannot be negative"),
});

type InvoiceForm = z.infer<typeof invoiceSchema>;

export function InvoicesGrid({ invoices }: { invoices: Invoice[] }) {
  /* Stable reference — a fresh array every render discards pending local edits. */
  const columns = useMemo<WithMeta<Invoice, InvoiceForm>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        size: 100,                               // only when a width was requested
        meta: { mono: true },                    // display only: no editor
      },
      {
        accessorKey: "number",
        header: "Number",
        meta: {
          editor: "text",
          required: true,
          filter: { type: "text", placeholder: "Number…" },
          formLayout: { order: 1 },
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        meta: {
          editor: "select",
          required: true,
          options: STATUS_OPTIONS,
          filter: { type: "select", options: STATUS_OPTIONS },
          formLayout: { order: 2 },
        },
      },
      {
        accessorKey: "total",
        header: "Total",
        meta: {
          editor: "number",
          required: true,
          align: "right",
          mono: true,
          agg: "sum",                            // only if grouping was requested
          format: (v) => formatCurrency(v as number),
          formLayout: { order: 3 },
        },
      },
    ],
    []
  );

  return (
    <DataGrid<Invoice, InvoiceForm>
      title="Invoices"
      columns={columns}
      zodSchema={invoiceSchema}
      initialData={invoices}
      storageKey="dg:invoices"
      onPersist={handlePersist}
      onDelete={handleDelete}
    />
  );
}
```

Rules for the generated code:

- Declare shared option lists (`STATUS_OPTIONS`) once at module scope and reference them from
  both `options` and `filter.options`. Never duplicate the array inline twice.
- `useMemo` the column array with `[]` deps, or real deps if it closes over anything.
- Any array passed to `initialData` that is derived (filtered, mapped, sorted) must be
  `useMemo`'d in the generated code, with a brief comment saying why.
- Only add a `format` hook where the raw value is genuinely unreadable (cents, timestamps,
  enums). When you add `format` to an **editable** field, you must also add `toForm` and
  `fromForm` — otherwise the form seeds itself from the formatted string and submits it back.
- Type the component with both generics: `DataGrid<TRow, TForm>`.
- Omit every prop that would carry its default value. A grid with no grouping should have no
  `groupOptions` prop at all. Same for `size`: no width unless Round E asked for one.
- Generate exactly the feature set the interview settled on. A feature nobody asked for is a
  defect, however useful it looks.

For the TanStack Query data source, generate the `useCrudAdapter` wiring and spread its
`isLoading` / `error` / `onRetry` / `onPersist` / `onDelete` — see AGENTS.md §6.

## Step 5 — Verify and report

Run, in order:

```
npx tsc -p tsconfig.app.json --noEmit
npm test
```

ESLint currently reports 24 warnings and 0 errors; do not report those as new breakage. If
the grid is reachable in the running app, offer to launch it, but don't launch unprompted.

Then report: the file(s) written, the feature set chosen, and — explicitly — anything left as
a stub for the user to fill in (`renderExpandedRow` bodies, `card` layouts, bulk-action
handlers, currency formatters, API calls). Do not describe a stub as finished.

## Do not

- Do not commit. Present the diff and a proposed message, then wait.
- Do not search the repo for the model. Ask for it and wait, however long the ask feels.
- Do not add fields that aren't in the model, or invent enum values.
- Do not copy a feature set from an existing grid because the entities look similar.
- Do not write comments referencing tickets, bug numbers or design documents. State the
  current rule and why it matters. See AGENTS.md §9.
- Do not modify anything inside `src/components/datagrid/` — this skill consumes the grid, it
  doesn't change it. If a requested feature genuinely needs a grid change, say so and stop.
