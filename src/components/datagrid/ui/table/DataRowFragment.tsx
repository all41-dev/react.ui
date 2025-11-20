import type { Row } from "@tanstack/react-table";
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
        className={`group transition-all duration-200 hover:bg-white hover:shadow-sm hover:ring-1 hover:ring-gray-200 cursor-pointer ${
          isEditing ? "bg-blue-50/70 ring-1 ring-blue-200/50" : ""
        } ${isSelected ? "bg-blue-50" : ""}`}
        style={
          isSelected
            ? { boxShadow: "inset 4px 0 0 0 rgb(59 130 246)" }
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
          return <BodyDataCell key={c.id} c={c} />;
        })}
      </tr>

      {isExpanded && renderExpandedRow && (
        <tr className="bg-gray-50/50">
          <td colSpan={leafColCount} className="p-0 border-b border-gray-200">
            <div className="px-4 py-3 animate-slide-down">
              {renderExpandedRow(row.original)}
            </div>
          </td>
        </tr>
      )}

      {isEditing && inlineEditor && (
        <tr className="bg-white border-b border-gray-200">
          <td colSpan={leafColCount} className="p-0 overflow-hidden">
            <div className="animate-slide-down">
              <div className="border-l-2 border-blue-400 bg-linear-to-r from-blue-50/50 to-white shadow-sm">
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
