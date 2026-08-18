import type { WithMeta } from "../../../../components/datagrid/types/column";
import type { DemoForm, DemoRow } from "../types";

type Columns = WithMeta<DemoRow, DemoForm>[];

export const postColumns: Columns = [
  { accessorKey: "id", header: "ID", meta: { formLayout: { order: 1 } } },
  {
    accessorKey: "title",
    header: "Title",
    meta: {
      editor: "text",
      required: true,
      cellEdit: true,
      formLayout: { order: 2, colSpan: "full" },
    },
  },
  {
    accessorKey: "body",
    header: "Body Content",
    // Markdown editor demo — rich fields default to full width, and `preview: "split"`
    // puts the source and the preview side by side above `md`.
    meta: {
      editor: "markdown",
      required: true,
      description: "Markdown. Headings, links and lists render in the preview.",
      editorProps: { rows: 8, preview: "split" },
      formLayout: { order: 3 },
    },
  },
  {
    accessorKey: "userId",
    header: "User ID",
    // agg:"sum" -> per-group totals on the group header row.
    meta: {
      editor: "number",
      agg: "sum",
      align: "right",
      mono: true,
      formLayout: { order: 4 },
    },
  },
];

export const commentColumns: Columns = [
  { accessorKey: "id", header: "ID" },
  {
    accessorKey: "name",
    header: "Name",
    meta: { editor: "text", required: true, formLayout: { order: 1 } },
  },
  {
    accessorKey: "email",
    header: "Email",
    meta: { editor: "text", required: true, formLayout: { order: 2 } },
  },
  {
    accessorKey: "body",
    header: "Comment",
    // Code editor demo — gutter, Tab-inserts-spaces, Ln/Col footer.
    meta: {
      editor: "code",
      required: true,
      description: "Plain text. Tab inserts two spaces rather than moving focus.",
      editorProps: { language: "text", rows: 8 },
      formLayout: { order: 3 },
    },
  },
  {
    accessorKey: "postId",
    header: "Post ID",
    meta: { editor: "number", formLayout: { order: 4 } },
  },
];

export const albumColumns: Columns = [
  { accessorKey: "id", header: "ID" },
  {
    accessorKey: "title",
    header: "Album Title",
    meta: {
      editor: "text",
      required: true,
      formLayout: { order: 1, colSpan: "full" },
    },
  },
  {
    accessorKey: "userId",
    header: "User ID",
    meta: { editor: "number", formLayout: { order: 2 } },
  },
];
