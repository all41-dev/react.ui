import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";


export type UseTQAdapterParams<TRow, TForm = TRow> = {
  queryKey: readonly unknown[];
  list: () => Promise<TRow[]>;
  create: (values: Partial<TForm>) => Promise<TRow>;
  update: (id: string, values: Partial<TForm>) => Promise<TRow>;
  remove: (id: string) => Promise<void>;
  getId: (row: TRow) => string;
  invalidateOnSuccess?: { create?: boolean; update?: boolean; remove?: boolean };
};

export function useTanstackQueryAdapter<TRow, TForm = TRow>(
  params: UseTQAdapterParams<TRow, TForm>
) {
  const { queryKey, list, create, update, remove, getId, invalidateOnSuccess } = params;
  const inv = { create: true, update: true, remove: true, ...invalidateOnSuccess };
  const qc = useQueryClient();

  const q = useQuery({ queryKey, queryFn: list /*, refetchOnWindowFocus: false (optional)*/ });

  const mCreate = useMutation({
    mutationFn: (values: Partial<TForm>) => create(values),
    onSuccess: () => { if (inv.create) qc.invalidateQueries({ queryKey }); },
  });

  const mUpdate = useMutation({
    mutationFn: (input: { id: string; values: Partial<TForm> }) => update(input.id, input.values),
    onSuccess: () => { if (inv.update) qc.invalidateQueries({ queryKey }); },
  });

  const mDelete = useMutation({
    mutationFn: (id: string) => remove(id),
    onSuccess: () => { if (inv.remove) qc.invalidateQueries({ queryKey }); },
  });

  const updateAsync = useCallback(
    (id: string, values: Partial<TForm>) =>
      mUpdate.mutateAsync({ id, values }),
    [mUpdate]
  );

  const isMutating =
    mCreate.isPending || mUpdate.isPending || mDelete.isPending;

  // Surface the most recent mutation error (cleared on next success automatically by TanStack)
  const mutationError =
    mCreate.error ?? mUpdate.error ?? mDelete.error ?? null;

  return useMemo(
    () => ({
      rows: (q.data ?? []) as TRow[],
      isLoading: q.isLoading,
      isError: q.isError,
      error: q.isError ? (q.error as Error) : null,
      refetch: q.refetch,
      createAsync: mCreate.mutateAsync,
      updateAsync,
      deleteAsync: mDelete.mutateAsync,
      getId,
      /** True when any mutation (create/update/delete) is in-flight. */
      isMutating,
      /** The most recent mutation error, or null if no mutation has failed. */
      mutationError,
    }),
    [
      q.data,
      q.isLoading,
      q.isError,
      q.error,
      q.refetch,
      mCreate.mutateAsync,
      updateAsync,
      mDelete.mutateAsync,
      getId,
      isMutating,
      mutationError,
    ]
  );
}
