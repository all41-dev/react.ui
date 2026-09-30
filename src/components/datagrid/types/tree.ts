import type { ReactNode } from "react";

/** A row field by name. Any string is accepted, so a dotted path works too. */
type RowField<TRow extends object> = (keyof TRow & string) | (string & {});

/** One kind of node, matched against the row field named by `TreeConfig.typeKey`. */
export type TreeLevel = {
  type: string;
  /** Text of the type tag. Default: `type`. */
  label?: string;
  /** Any CSS colour; tints the icon and the type tag. */
  color?: string;
  icon?: ReactNode;
};

/** Tree mode: rows linked to a parent render as a collapsible hierarchy. */
export type TreeConfig<TRow extends object = object> = {
  /**
   * Field holding the parent row's id, in the vocabulary of `idAccessor`. Empty, null
   * or an id no row has makes the row a root.
   */
  parentKey: RowField<TRow>;
  /** Column carrying the indent and the chevron. Default: the first visible data column. */
  columnId?: string;
  /** Which nodes start open. Default `"roots"`. */
  defaultOpen?: "roots" | "all" | "none";
  /** Field naming a row's level type, matched against `levels`. */
  typeKey?: RowField<TRow>;
  levels?: TreeLevel[];
  /** Shows the level's label as a small uppercase tag after the value. */
  showTypeTag?: boolean;
};
