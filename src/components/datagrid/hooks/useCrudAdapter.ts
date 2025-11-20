
import { useTanstackQueryAdapter, type UseTQAdapterParams } from "./useTanstackQueryAdapter";
import { useCallback } from "react";

export function useCrudAdapter<TRow extends object, TForm extends object = TRow>(
  params: UseTQAdapterParams<TRow, TForm>
) {
  const tq = useTanstackQueryAdapter<TRow, TForm>(params);

  const loadRows = useCallback(async () => {
    if (!tq.rows?.length) await tq.refetch();
  }, [tq.rows?.length, tq.refetch]);

  const retry = useCallback(async () => {
    await tq.refetch();
  }, [tq.refetch]);

  const onPersist = useCallback(async (
    mode: "create" | "edit",
    values: TForm,
    prev?: TRow
  ): Promise<TRow> => {
    if (mode === "create") return (await tq.createAsync(values)) as TRow;
    const id = tq.getId(prev!);
    return (await tq.updateAsync(id, values)) as TRow;
  }, [tq.createAsync, tq.updateAsync, tq.getId]);

  const onDelete = useCallback(async (row: TRow) => {
    await tq.deleteAsync(tq.getId(row));
  }, [tq.deleteAsync, tq.getId]);

  return {
    rows: tq.rows,
    isLoading: tq.isLoading,
    error: tq.error,
    refetch: retry,
    loadRows,
    onPersist,
    onDelete,
    getId: tq.getId,
  };
}
