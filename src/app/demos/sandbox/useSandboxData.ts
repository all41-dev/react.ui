import { useCallback, useEffect, useState } from "react";
import { ApiError } from "../../../api/errors";
import { toast } from "../../../utils/toast";
import { FAKE_USERS } from "../mocks/fakeData";
import { RESOURCE_API } from "./resourceApi";
import type { DataSource, DemoForm, DemoRow, ResourceType } from "./types";
import { resourceNoun } from "./types";
import type { Simulation } from "./useSandboxSettings";

const wait = (ms: number) =>
  ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : undefined;

type Args = {
  resource: ResourceType;
  dataSource: DataSource;
  simulation: Simulation;
  onLoaded: () => void;
};

/**
 * Rows for the active resource, plus the persist/delete handlers the grid calls. The
 * failure switches are injected before the request so the grid's own error paths run.
 */
export function useSandboxData({ resource, dataSource, simulation, onLoaded }: Args) {
  const [data, setData] = useState<DemoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { fetchError, saveError, deleteError, delay } = simulation;

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await wait(delay);
      if (fetchError) {
        throw new ApiError(
          `Failed to load ${resource} from server (HTTP 500 Internal Server Error)`,
          { status: 500, code: "FETCH_FAILED" }
        );
      }
      const local = dataSource === "mock-data" && resource === "users";
      setData(local ? [...FAKE_USERS] : await RESOURCE_API[resource].list());
    } catch (err) {
      const msg = err instanceof Error ? err.message : `Failed to load ${resource}`;
      setError(msg);
      toast.error(msg);
    } finally {
      // Expanded ids point at rows from the previous resource; clear them here
      // (after the await) rather than synchronously inside the effect below.
      onLoaded();
      setLoading(false);
    }
  }, [resource, dataSource, fetchError, delay, onLoaded]);

  useEffect(() => {
    // reload() sets `loading`/`error` synchronously before its first await —
    // the standard hand-rolled fetch pattern the compiler rule warns about. The
    // real fix is to drive this demo with the React Query provider the sandbox
    // already mounts but never uses; until then, keep the pattern explicit.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  // "cell" saves flow through the same update path as "edit".
  const persist = async (
    mode: "create" | "edit" | "cell",
    values: DemoForm,
    prev?: DemoRow
  ): Promise<DemoRow> => {
    await wait(delay);
    if (saveError) {
      throw new ApiError(
        `Server failed to save ${resource} item (HTTP 500: Database lock timeout)`,
        { status: 500, code: "SAVE_FAILED" }
      );
    }

    const api = RESOURCE_API[resource];
    const saved =
      mode === "create"
        ? await api.create(values)
        : await api.update({ ...prev, ...values });

    setData((rows) =>
      mode === "create"
        ? [saved, ...rows]
        : rows.map((row) => (String(row.id) === String(saved.id) ? saved : row))
    );
    toast.success(
      mode === "create"
        ? `New ${resourceNoun(resource)} created!`
        : `${resourceNoun(resource)} updated!`
    );
    return saved;
  };

  const remove = async (row: DemoRow) => {
    await wait(delay);
    if (deleteError) {
      throw new ApiError(
        `Permission Denied: You do not have permission to delete this ${resourceNoun(resource)} (HTTP 403)`,
        { status: 403, code: "DELETE_FORBIDDEN" }
      );
    }
    const id = String(row.id);
    await RESOURCE_API[resource].remove(id);
    setData((rows) => rows.filter((item) => String(item.id) !== id));
    toast.success(`Deleted ${resourceNoun(resource)} #${id}`);
  };

  return { data, setData, loading, error, reload, persist, remove };
}
