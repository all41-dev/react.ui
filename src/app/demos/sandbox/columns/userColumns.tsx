import type { WithMeta } from "../../../../components/datagrid/types/column";
import type { DemoForm, DemoRow } from "../types";
import { RoleBadge, StatusBadge } from "./badges";
import { formatDate } from "./formatDate";

const ROLES = [
  { label: "Admin", value: "Admin" },
  { label: "User", value: "User" },
  { label: "Editor", value: "Editor" },
];

const STATUSES = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Pending", value: "pending" },
];

export const userColumns: WithMeta<DemoRow, DemoForm>[] = [
  {
    accessorKey: "name",
    header: "Name",
    meta: {
      editor: "text",
      required: true,
      description: "Full legal name, as it appears on the contract.",
      formLayout: { order: 1 },
      filter: { type: "text", placeholder: "Name…" },
    },
  },
  {
    accessorKey: "username",
    header: "Username",
    meta: {
      editor: "text",
      required: true,
      description: "Lowercase, no spaces. Used in mentions and the profile URL.",
      formLayout: { order: 2 },
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    meta: {
      editor: "text",
      required: true,
      /* Long on purpose — exercises the tooltip's 280px clamp and its wrapping. */
      description:
        "Primary contact address. Every notification, password reset and billing receipt is delivered here, so it must stay reachable — a bounced address suspends the account until an administrator confirms a replacement.",
      formLayout: { order: 3 },
    },
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ getValue }) => <RoleBadge value={getValue()} />,
    meta: {
      editor: "select",
      description: "Admins manage members and billing; editors can publish.",
      options: ROLES,
      filter: { type: "select", options: ROLES },
      formLayout: { order: 4 },
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => <StatusBadge value={getValue()} />,
    meta: {
      editor: "select",
      description: "Pending accounts have not confirmed their email yet.",
      options: STATUSES,
      filter: { type: "select", options: STATUSES },
      formLayout: { order: 5 },
    },
  },
  {
    accessorKey: "phone",
    header: "Phone",
    meta: { editor: "text", hideOnMobile: true, formLayout: { order: 6 } },
  },
  {
    accessorKey: "website",
    header: "Website",
    // `cellEdit` — the same description also reaches the cell popover.
    meta: {
      editor: "text",
      cellEdit: true,
      description: "Shown on the public profile. Include the scheme (https://).",
      hideOnMobile: true,
      formLayout: { order: 7 },
    },
  },
  {
    accessorKey: "lastLogin",
    header: "Last Login",
    cell: ({ getValue }) => formatDate(getValue()),
    meta: {
      editor: "date",
      description: "Read-only in practice — set by the auth service on sign-in.",
      hideOnMobile: true,
      formLayout: { order: 8 },
    },
  },
  {
    accessorKey: "twoFactor",
    header: "2FA",
    cell: ({ getValue }) => (getValue() ? "On" : "Off"),
    meta: {
      editor: "switch",
      label: "Two-factor auth",
      description: "Required for admins; optional for everyone else.",
      hideOnMobile: true,
      formLayout: { order: 9 },
    },
  },
  {
    accessorKey: "newsletter",
    header: "Newsletter",
    cell: ({ getValue }) => (getValue() ? "Subscribed" : "—"),
    meta: {
      editor: "switch",
      label: "Product newsletter",
      description: "Monthly digest. Unrelated to transactional mail.",
      hideOnMobile: true,
      formLayout: { order: 10 },
    },
  },
];
