import type { FormFieldGroup } from "../../../components/datagrid/types/formLayout";
import type { WithMeta } from "../../../components/datagrid/types/column";
import type { DemoForm, DemoRow, FormGrouping } from "./types";

/**
 * Section per users field. `newsletter` is left out on purpose: an ungrouped switch
 * falls into the implicit "Options" section.
 */
const USER_FIELD_GROUPS: Record<string, string> = {
  name: "identity",
  username: "identity",
  email: "identity",
  role: "access",
  status: "access",
  twoFactor: "access",
  phone: "contact",
  website: "contact",
  lastLogin: "contact",
};

/** `split` sizes the sections against the form grid; `stacked` lets them all take a row. */
export const USER_FORM_GROUPS: Record<
  Exclude<FormGrouping, "off">,
  FormFieldGroup[]
> = {
  stacked: [
    { id: "identity", label: "Identity" },
    { id: "access", label: "Access" },
    { id: "contact", label: "Contact" },
  ],
  split: [
    { id: "identity", label: "Identity", groupSpan: "full" },
    { id: "access", label: "Access", groupSpan: 1 },
    { id: "contact", label: "Contact", groupSpan: 1 },
  ],
};

/** Tags each column with its section. Only the users columns have a map to match. */
export const withFieldGroups = (
  columns: WithMeta<DemoRow, DemoForm>[],
  grouping: FormGrouping
): WithMeta<DemoRow, DemoForm>[] => {
  if (grouping === "off") return columns;
  return columns.map((column) => {
    const key = "accessorKey" in column ? String(column.accessorKey) : "";
    const group = USER_FIELD_GROUPS[key];
    if (!group) return column;
    return {
      ...column,
      meta: { ...column.meta, formLayout: { ...column.meta?.formLayout, group } },
    };
  });
};
