import type { WithMeta } from "../../../../components/datagrid/types/column";
import type { DemoForm, DemoRow } from "../types";
import { DoneBadge } from "./badges";

type Columns = WithMeta<DemoRow, DemoForm>[];

export const photoColumns: Columns = [
  { accessorKey: "id", header: "ID" },
  {
    accessorKey: "thumbnailUrl",
    header: "Thumbnail",
    cell: ({ getValue }) => (
      <img
        src={String(getValue() ?? "")}
        alt="photo"
        className="h-9 w-9 rounded object-cover border border-border-default"
        loading="lazy"
      />
    ),
    meta: { editor: "text", formLayout: { order: 1 } },
  },
  {
    accessorKey: "title",
    header: "Photo Title",
    meta: { editor: "text", required: true, formLayout: { order: 2 } },
  },
  {
    accessorKey: "url",
    header: "Full Image URL",
    meta: { editor: "text", hideOnMobile: true, formLayout: { order: 3 } },
  },
  {
    accessorKey: "albumId",
    header: "Album ID",
    meta: { editor: "number", formLayout: { order: 4 } },
  },
];

export const todoColumns: Columns = [
  { accessorKey: "id", header: "ID" },
  {
    accessorKey: "title",
    header: "Todo Task",
    meta: { editor: "text", required: true, formLayout: { order: 1 } },
  },
  {
    accessorKey: "completed",
    header: "Status",
    cell: ({ getValue }) => <DoneBadge value={getValue()} />,
    meta: {
      editor: "switch",
      label: "Task Completed",
      description: "Closing a task hides it from the assignee's default queue.",
      formLayout: { order: 2 },
    },
  },
  {
    accessorKey: "userId",
    header: "User ID",
    meta: { editor: "number", formLayout: { order: 3 } },
  },
];
