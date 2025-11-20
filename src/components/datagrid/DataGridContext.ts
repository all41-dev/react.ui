import { createContext, useContext } from "react";

type DataGridContextValue = {
  tooltipId: string;
};

export const DataGridContext = createContext<DataGridContextValue | null>(null);

export function useDataGridContext() {
  const ctx = useContext(DataGridContext);
  if (!ctx) {
    throw new Error("useDataGridContext must be used within a DataGrid");
  }
  return ctx;
}
