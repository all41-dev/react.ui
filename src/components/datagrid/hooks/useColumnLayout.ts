import type { Table } from "@tanstack/react-table";
import { useMemo } from "react";

export function useColumnLayout<TRow extends object>(
  table: Table<TRow>,
  containerW: number
) {
  const leafColsAll = table.getVisibleLeafColumns();
  const dataCols = leafColsAll.filter((c) => c.id !== "__actions__");
  const lastDataCol = dataCols[dataCols.length - 1];

  const { baseTotal, lastColWidth, tableW } = useMemo(() => {
    const base = dataCols
      .filter((c) => c !== lastDataCol)
      .reduce((sum, c) => sum + (c.getSize?.() ?? 0), 0);

    const lastW = Math.max(lastDataCol?.getSize?.() ?? 0, containerW - base);
    return {
      baseTotal: base,
      lastColWidth: lastW,
      tableW: base + lastW,
    };
  }, [dataCols, lastDataCol, containerW]);

  return {
    leafColsAll,
    dataCols,
    lastDataCol,
    baseTotal,
    lastColWidth,
    tableW,
  };
}
