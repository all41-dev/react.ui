import type { WithMeta } from "../../../../components/datagrid/types/column";
import { withFieldGroups } from "../formGroups";
import type { DemoForm, DemoRow, FormGrouping, ResourceType } from "../types";
import { photoColumns, todoColumns } from "./mediaColumns";
import { albumColumns, commentColumns, postColumns } from "./textColumns";
import { userColumns } from "./userColumns";

const BY_RESOURCE: Record<ResourceType, WithMeta<DemoRow, DemoForm>[]> = {
  users: userColumns,
  posts: postColumns,
  comments: commentColumns,
  albums: albumColumns,
  photos: photoColumns,
  todos: todoColumns,
};

/** Sections are a users-only control, so no other dataset is tagged. */
export const columnsFor = (resource: ResourceType, grouping: FormGrouping) =>
  resource === "users"
    ? withFieldGroups(userColumns, grouping)
    : BY_RESOURCE[resource];
