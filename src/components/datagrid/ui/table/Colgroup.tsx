import type { Column } from "@tanstack/react-table";

type Props = {
  leafColsAll: Column<any, unknown>[];
  lastDataCol: Column<any, unknown> | undefined;
  lastColWidth: number;
};

export function Colgroup({ leafColsAll, lastDataCol, lastColWidth }: Props) {
  return (
    <colgroup>
      {leafColsAll.map((col) => {
        if (col.id === "__actions__") return null;
        const isLast = col === lastDataCol;
        const w = isLast ? lastColWidth : col.getSize?.() ?? 0;
        return <col key={col.id} style={{ width: `${w}px` }} />;
      })}
      <col key="__actions__" style={{ width: 0 }} />
    </colgroup>
  );
}
