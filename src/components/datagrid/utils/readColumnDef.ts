import type { ColumnDef } from "@tanstack/react-table";
import type { ColumnMeta } from "../types/column";

/**
 * The two column-def fields the grid reads at cell-render time.
 *
 * Both need a cast at the boundary: TanStack types `meta` through a module-augmentation
 * slot this library deliberately does not fill, and `accessorKey` exists on only one
 * member of the `ColumnDef` union. Casting here once keeps the cell components clean.
 */

export function readColumnMeta<TRow extends object, TForm extends object = TRow>(
  def: ColumnDef<TRow, unknown>
): ColumnMeta<TRow, TForm> | undefined {
  return (def as { meta?: ColumnMeta<TRow, TForm> }).meta;
}

export function readAccessorKey<TRow extends object>(
  def: ColumnDef<TRow, unknown>
): string | undefined {
  return (def as { accessorKey?: string }).accessorKey;
}
