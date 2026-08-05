import { flexRender, type Row } from "@tanstack/react-table";
import type { ReactNode } from "react";
import { ActionsOverlayCell } from "./ActionsOverlayCell";
import { BodyDataCell } from "./BodyDataCell";
import React from "react";

type DataRowFragmentProps<TRow extends object> = {
  row: Row<TRow>;
  leafColCount: number;
  rowBgClass: string;
  isEditing: boolean;
  isSelected: boolean;
  isExpanded: boolean;
  inlineEditor?: ReactNode;
  renderExpandedRow?: (row: TRow) => ReactNode;
  onRowClick?: (row: TRow) => void;
};

function DataRowFragmentInner<TRow extends object>({
  row,
  leafColCount,
  rowBgClass,
  isEditing,
  isSelected,
  isExpanded,
  inlineEditor,
  renderExpandedRow,
  onRowClick,
}: DataRowFragmentProps<TRow>) {
  const cells = row.getVisibleCells();

  return (
    <>
      <tr
        className={`group transition-colors duration-150 hover:bg-surface-inset cursor-pointer ${
          isEditing ? "bg-accent-subtle" : ""
        } ${isSelected ? "bg-accent-subtle" : ""}`}
        style={
          isSelected
            ? { boxShadow: "inset 3px 0 0 0 var(--rui-accent)" }
            : undefined
        }
        onClick={() => onRowClick?.(row.original)}
        aria-selected={isSelected || undefined}
      >
        {cells.map((c) => {
          if (c.column.id === "__actions__") {
            return (
              <ActionsOverlayCell key={c.id} c={c} rowBgClass={rowBgClass} />
            );
          }
          if (c.column.id === "__select__") {
            return (
              <td
                key={c.id}
                className="w-[36px] border-b border-border-default px-2.5 align-middle"
                // Checkbox clicks must never double as row clicks.
                onClick={(e) => e.stopPropagation()}
              >
                {flexRender(c.column.columnDef.cell, c.getContext())}
              </td>
            );
          }
          return <BodyDataCell key={c.id} c={c} />;
        })}
      </tr>

      {isExpanded && renderExpandedRow && (
        <tr className="bg-surface-inset">
          <td colSpan={leafColCount} className="p-0 border-b border-border-default">
            <div className="px-4 py-3 animate-slide-down">
              {renderExpandedRow(row.original)}
            </div>
          </td>
        </tr>
      )}

      {isEditing && inlineEditor && (
        <tr className="bg-surface-card border-b border-border-default">
          <td colSpan={leafColCount} className="p-0 overflow-hidden">
            <div className="animate-slide-down">
              <div className="border-l-2 border-accent bg-linear-to-r from-accent-subtle to-surface-card shadow-sm">
                {inlineEditor}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export const DataRowFragment = React.memo(
  DataRowFragmentInner,
  <TRow extends object>(
    prev: DataRowFragmentProps<TRow>,
    next: DataRowFragmentProps<TRow>
  ) => {
    // If underlying row data object changed, we want to re-render
    if (prev.row.original !== next.row.original) return false;

    // If "visual" row state changed, we re-render
    if (prev.isEditing !== next.isEditing) return false;
    if (prev.isSelected !== next.isSelected) return false;
    if (prev.isExpanded !== next.isExpanded) return false;

    // Layout props
    if (prev.leafColCount !== next.leafColCount) return false;
    if (prev.rowBgClass !== next.rowBgClass) return false;

    // Callbacks & renderers
    if (prev.inlineEditor !== next.inlineEditor) return false;
    if (prev.renderExpandedRow !== next.renderExpandedRow) return false;
    if (prev.onRowClick !== next.onRowClick) return false;

    // If all of that is equal, skip re-render
    return true;
  }
) as typeof DataRowFragmentInner;
