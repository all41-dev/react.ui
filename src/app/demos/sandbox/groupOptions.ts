import type { GroupOption } from "../../../components/datagrid/types/grouping";
import type { ResourceType } from "./types";

/** Group-by options per resource. Declared `values` fix bucket order and colour. */
const GROUP_OPTIONS: Partial<Record<ResourceType, GroupOption[]>> = {
  users: [
    {
      key: "role",
      label: "Role",
      values: [
        { value: "Admin", label: "Admin", color: "#8b5cf6" },
        { value: "Editor", label: "Editor", color: "#0ea5e9" },
        { value: "User", label: "User", color: "#64748b" },
      ],
    },
    {
      key: "status",
      label: "Status",
      values: [
        { value: "active", label: "Active", color: "#16a34a" },
        { value: "pending", label: "Pending", color: "#d97706" },
        { value: "inactive", label: "Inactive", color: "#dc2626" },
      ],
    },
  ],
  posts: [{ key: "userId", label: "User" }],
  albums: [{ key: "userId", label: "User" }],
  comments: [{ key: "postId", label: "Post" }],
  todos: [
    {
      key: "completed",
      label: "Done",
      values: [
        { value: "true", label: "Completed", color: "#16a34a" },
        { value: "false", label: "Open", color: "#d97706" },
      ],
    },
    { key: "userId", label: "User" },
  ],
};

export const groupOptionsFor = (resource: ResourceType) => GROUP_OPTIONS[resource];
