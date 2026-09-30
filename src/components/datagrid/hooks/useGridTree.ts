import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ExpandedState } from "@tanstack/react-table";

import type { TreeConfig } from "../types/tree";
import { getPath } from "../utils/objectPath";
import { buildTree, type TreeModel } from "../utils/treeModel";

type DefaultOpen = NonNullable<TreeConfig["defaultOpen"]>;

/**
 * Which nodes are open: a rule for every node plus the ones set individually. Held as a
 * rule rather than a list of keys so rows that arrive later follow it too.
 */
type OpenState = {
  base: DefaultOpen;
  overrides: Readonly<Record<string, boolean>>;
};

const NO_OVERRIDES: Readonly<Record<string, boolean>> = {};
const NOTHING_OPEN: ExpandedState = {};
const NO_KEYS: string[] = [];

const opensByRule = <TRow,>(base: DefaultOpen, model: TreeModel<TRow>, key: string) =>
  base === "all" || (base === "roots" && !model.parentOf.has(key));

type Params<TRow extends object> = {
  /** Absent → the grid is flat and everything here is inert. */
  config: TreeConfig<TRow> | undefined;
  rows: TRow[];
  /** The grid's row identity — the same function the table gets as `getRowId`. */
  getKey: (row: TRow) => string;
  /** A search or a column filter is active: every kept node is shown open. */
  filtering: boolean;
};

/**
 * Tree mode: the flat rows nested by parent, and which nodes are open. "Open" is tree
 * state throughout the grid; "expanded" is the detail panel (`renderExpandedRow`).
 */
export function useGridTree<TRow extends object>({
  config,
  rows,
  getKey,
  filtering,
}: Params<TRow>) {
  /* Read field by field: `tree` is usually an inline object, new on every render. */
  const parentKey = config?.parentKey;
  const defaultOpen = config?.defaultOpen ?? "roots";

  const model = useMemo(
    () =>
      parentKey === undefined ? undefined : buildTree(rows, getKey, parentKey),
    [rows, getKey, parentKey]
  );

  const [open, setOpen] = useState<OpenState>(() => ({
    base: defaultOpen,
    overrides: NO_OVERRIDES,
  }));

  /* The table's `expanded` state. `true` while filtering, which leaves `open` as it
     was for when the criteria are cleared. */
  const expanded = useMemo<ExpandedState>(() => {
    if (!model) return NOTHING_OPEN;
    if (filtering) return true;
    const out: Record<string, boolean> = {};
    for (const key of model.childrenOf.keys()) {
      if (open.overrides[key] ?? opensByRule(open.base, model, key)) out[key] = true;
    }
    return out;
  }, [model, filtering, open]);

  const getSubRows = useMemo(
    () => (model ? (row: TRow) => model.childrenOf.get(getKey(row)) : undefined),
    [model, getKey]
  );

  const setNodeOpen = useCallback((key: string, isOpen: boolean) => {
    setOpen((prev) =>
      prev.overrides[key] === isOpen
        ? prev
        : { ...prev, overrides: { ...prev.overrides, [key]: isOpen } }
    );
  }, []);

  const openAll = useCallback(
    () => setOpen({ base: "all", overrides: NO_OVERRIDES }),
    []
  );
  const closeAll = useCallback(
    () => setOpen({ base: "none", overrides: NO_OVERRIDES }),
    []
  );
  const reset = useCallback(
    () => setOpen({ base: defaultOpen, overrides: NO_OVERRIDES }),
    [defaultOpen]
  );

  /** Opens every ancestor of `row`, so a row just written is on screen. */
  const reveal = useCallback(
    (row: TRow) => {
      if (!model || parentKey === undefined) return;
      const raw = getPath(row, parentKey);
      if (raw === null || raw === undefined || raw === "") return;
      const parent = String(raw);
      if (!model.has(parent)) return;
      const chain = [parent, ...model.ancestorsOf(parent)];
      setOpen((prev) => {
        const overrides = { ...prev.overrides };
        for (const key of chain) overrides[key] = true;
        return { ...prev, overrides };
      });
    },
    [model, parentKey]
  );

  const descendantKeysOf = useCallback(
    (key: string) => model?.descendantsOf(key) ?? NO_KEYS,
    [model]
  );

  /* An override that repeats the rule, or names a row that is gone or has no
     children, changes nothing on screen. */
  const isDefault =
    !model ||
    (open.base === defaultOpen &&
      Object.entries(open.overrides).every(
        ([key, isOpen]) =>
          !model.childrenOf.has(key) ||
          isOpen === opensByRule(defaultOpen, model, key)
      ));

  const warnedRef = useRef(false);
  useEffect(() => {
    if (!import.meta.env.DEV || warnedRef.current || !model) return;
    if (model.orphanCount === 0 && model.cycleCount === 0) return;
    warnedRef.current = true;
    console.warn(
      `[DataGrid] tree: ${model.orphanCount} row(s) name a parent no row has and ` +
        `${model.cycleCount} close a parent cycle. They are shown as roots.`
    );
  }, [model]);

  return {
    enabled: !!model,
    /** The table's `data` in tree mode. */
    roots: model?.roots,
    getSubRows,
    expanded,
    /** Nodes cannot be toggled while a search or a filter holds them all open. */
    locked: filtering,
    setNodeOpen,
    openAll,
    closeAll,
    reveal,
    descendantKeysOf,
    reset,
    isDefault,
  };
}

/** Development-only: props that tree mode turns off, passed alongside `tree`. */
export function useTreePropWarnings(
  treeMode: boolean,
  ignored: { card: boolean; groupOptions: boolean; pagination: boolean }
): void {
  const { card, groupOptions, pagination } = ignored;
  const warnedRef = useRef(false);
  useEffect(() => {
    if (!import.meta.env.DEV || warnedRef.current || !treeMode) return;
    const names = [
      card && "`card`",
      groupOptions && "`groupOptions`",
      pagination && "`pagination`",
    ].filter(Boolean);
    if (names.length === 0) return;
    warnedRef.current = true;
    console.warn(
      `[DataGrid] ${names.join(", ")} passed alongside \`tree\`. Tree mode renders ` +
        "the table only, unpaged and ungrouped, so these are ignored."
    );
  }, [treeMode, card, groupOptions, pagination]);
}
