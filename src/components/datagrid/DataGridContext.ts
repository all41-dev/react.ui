import { createContext, useContext } from "react";

type DataGridContextValue = {
  tooltipId: string;
  /** Set by DataGrid when cell editing is possible; cells with `cellEdit` meta call it. */
  startCellEdit?: (row: unknown, columnId: string, cellEl: HTMLElement) => void;
};

export const DataGridContext = createContext<DataGridContextValue | null>(null);

export function useDataGridContext() {
  const ctx = useContext(DataGridContext);
  if (!ctx) {
    throw new Error("useDataGridContext must be used within a DataGrid");
  }
  return ctx;
}
