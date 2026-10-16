import { createContext, useContext } from "react";

import { DataGridContext } from "../DataGridContext";

/**
 * The react-tooltip anchor id a field description renders against. A `DataGrid`
 * carries its id in `DataGridContext`; a form rendered outside a grid (`RecordForm`)
 * provides one here, so `FieldDescriptionIcon` needs no grid around it.
 */
export const TooltipIdContext = createContext<string | null>(null);

/** The tooltip id in reach of a field: a standalone form's first, else the grid's. */
export function useTooltipId(): string | null {
  const standaloneId = useContext(TooltipIdContext);
  const grid = useContext(DataGridContext);
  return standaloneId ?? grid?.tooltipId ?? null;
}
