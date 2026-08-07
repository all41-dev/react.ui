
import { useTanstackQueryAdapter, type UseTQAdapterParams } from "./useTanstackQueryAdapter";
import { useCallback } from "react";

export function useCrudAdapter<TRow extends object, TForm extends object = TRow>(
  params: UseTQAdapterParams<TRow, TForm>
) {
  const tq = useTanstackQueryAdapter<TRow, TForm>(params);
  const { rows, refetch, createAsync, updateAsync, deleteAsync, getId } = tq;

  const loadRows = useCallback(async () => {
    if (!rows?.length) await refetch();
  }, [rows?.length, refetch]);

  const retry = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // The mode union has to match `DataGridProps.onPersist` exactly — narrower here and
  // under `strictFunctionTypes` the library's own adapter fails to typecheck against the
  // library's own grid the moment a column opts into cell editing. A single-cell save is
  // an update like any other, so it shares the `edit` branch.
  const onPersist = useCallback(async (
    mode: "create" | "edit" | "cell",
    values: TForm,
    prev?: TRow
  ): Promise<TRow> => {
    if (mode === "create") return (await createAsync(values)) as TRow;
    const id = getId(prev!);
    return (await updateAsync(id, values)) as TRow;
  }, [createAsync, updateAsync, getId]);

  const onDelete = useCallback(async (row: TRow) => {
    await deleteAsync(getId(row));
  }, [deleteAsync, getId]);

  return {
    rows,
    isLoading: tq.isLoading,
    error: tq.error,
    refetch: retry,
    loadRows,
    onPersist,
    onDelete,
    getId,
    /** True when any mutation (create/update/delete) is in-flight. */
    isMutating: tq.isMutating,
    /** The most recent mutation error, or null. */
    mutationError: tq.mutationError,
  };
}
