import { createContext } from "react";

/**
 * The react-tooltip anchor id a field description renders against. A `DataGrid`
 * carries its id in `DataGridContext`; a form rendered outside a grid (`RecordForm`)
 * provides one here, so `FieldDescriptionIcon` needs no grid around it.
 */
export const TooltipIdContext = createContext<string | null>(null);
