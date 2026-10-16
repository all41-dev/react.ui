import { useCallback, useMemo, useRef, useState } from "react";
import { Building2, FolderInput, ListTree, Network, Plus, Users } from "lucide-react";
import { z } from "zod";

import { DataGrid, type DataGridHandle } from "../../components/datagrid/DataGrid";
import type { WithMeta } from "../../components/datagrid/types/column";
import type { EditState } from "../../components/datagrid/types/grid";
import type { TreeConfig } from "../../components/datagrid/types/tree";
import type { ActionColumnOpts } from "../../components/datagrid/ui/makeActionColumns";

type Kind = "division" | "department" | "team";

/** A root has an empty `parentId`. */
type Unit = {
  id: string;
  parentId: string;
  name: string;
  kind: Kind;
  lead: string;
  headcount: number;
};

type UnitForm = Omit<Unit, "id">;

const unit = (
  id: string,
  parentId: string,
  name: string,
  kind: Kind,
  lead: string,
  headcount: number
): Unit => ({ id, parentId, name, kind, lead, headcount });

const SEED: Unit[] = [
  unit("eng", "", "Engineering", "division", "Ada Moreau", 64),
  unit("plat", "eng", "Platform", "department", "Jonas Weber", 21),
  unit("infra", "plat", "Infrastructure", "team", "Mina Okafor", 8),
  unit("tooling", "plat", "Developer tooling", "team", "Theo Lindqvist", 6),
  unit("data", "plat", "Data platform", "team", "Priya Raman", 7),
  unit("prod", "eng", "Product engineering", "department", "Sofia Marchetti", 34),
  unit("web", "prod", "Web", "team", "Luc Fontaine", 12),
  unit("mobile", "prod", "Mobile", "team", "Hana Sato", 9),
  unit("api", "prod", "API", "team", "Omar Haddad", 13),
  unit("sec", "eng", "Security", "department", "Ingrid Solberg", 9),
  unit("sales", "", "Sales", "division", "Marta Kowalska", 38),
  unit("emea", "sales", "EMEA", "department", "Pierre Lambert", 17),
  unit("emea-ent", "emea", "Enterprise", "team", "Clara Dubois", 9),
  unit("emea-smb", "emea", "Small business", "team", "Nils Berg", 8),
  unit("amer", "sales", "Americas", "department", "Diego Alvarez", 21),
  unit("ops", "", "Operations", "division", "Ruth Adeyemi", 19),
  unit("fin", "ops", "Finance", "department", "Elias Novak", 8),
  unit("people", "ops", "People", "department", "Yuki Tanaka", 11),
];

const KINDS = [
  { value: "division", label: "Division" },
  { value: "department", label: "Department" },
  { value: "team", label: "Team" },
];

const CHILD_KIND: Record<Kind, Kind> = {
  division: "department",
  department: "team",
  team: "team",
};

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  kind: z.enum(["division", "department", "team"]),
  lead: z.string(),
  headcount: z.number("Headcount is required").min(0),
  parentId: z.string(),
});

/* Module scope: `levels` reaches the grid's context, so it has to be a stable value. */
const TREE: TreeConfig<Unit> = {
  parentKey: "parentId",
  typeKey: "kind",
  showTypeTag: true,
  levels: [
    {
      type: "division",
      label: "Division",
      color: "var(--rui-accent)",
      icon: <Building2 className="h-3.5 w-3.5" />,
    },
    {
      type: "department",
      label: "Dept",
      icon: <Network className="h-3.5 w-3.5" />,
    },
    { type: "team", label: "Team", icon: <Users className="h-3.5 w-3.5" /> },
  ],
};

/** The ids of `rootId` and everything under it. */
function subtreeIds(all: Unit[], rootId: string): Set<string> {
  const ids = new Set([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const u of all) {
      if (ids.has(u.parentId) && !ids.has(u.id)) {
        ids.add(u.id);
        grew = true;
      }
    }
  }
  return ids;
}

const ACTION_BTN =
  "inline-flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-control border border-transparent text-faint outline-none transition-colors hover:border-border-default hover:bg-surface-raised hover:text-body focus-visible:ring-2 focus-visible:ring-[var(--rui-focus-ring)]";

/**
 * A department hierarchy exercising tree mode on row editing: a draft row under its
 * parent, Enter chaining siblings, and a Move to… action editing the hidden parent
 * column through the cell popover.
 */
export function TreeDemo() {
  const [units, setUnits] = useState(SEED);
  const grid = useRef<DataGridHandle<Unit, UnitForm>>(null);
  const nextId = useRef(1);

  /* The row whose parent the Move to… popover is editing: it and its subtree are left
     out of the Parent options, since a unit cannot sit under itself. */
  const [moving, setMoving] = useState<Unit>();
  const onEditStateChange = useCallback((state: EditState<Unit>) => {
    setMoving(
      state.kind === "cell" && state.columnId === "parentId" ? state.row : undefined
    );
  }, []);

  const parentOptions = useMemo(() => {
    const excluded = moving ? subtreeIds(units, moving.id) : new Set<string>();
    return units
      .filter((u) => !excluded.has(u.id))
      .map((u) => ({ value: u.id, label: u.name }));
  }, [units, moving]);

  const columns = useMemo<WithMeta<Unit, UnitForm>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        size: 320,
        meta: { editor: "text", required: true, filter: { type: "text" } },
      },
      {
        accessorKey: "kind",
        header: "Kind",
        meta: {
          editor: "select",
          options: KINDS,
          default: "division",
          filter: { type: "select", options: KINDS },
          format: (v) => KINDS.find((k) => k.value === v)?.label ?? String(v),
        },
      },
      { accessorKey: "lead", header: "Lead", meta: { editor: "text" } },
      {
        accessorKey: "headcount",
        header: "Headcount",
        size: 110,
        meta: { editor: "number", default: 0, align: "right", mono: true },
      },
      /* Hidden from the table, so the row session carries it: a draft keeps the parent
         its seed named. The Move to… action is the only way to edit it. */
      {
        accessorKey: "parentId",
        header: "Parent",
        meta: {
          label: "Parent",
          description: "Leave empty for a top-level unit.",
          editor: "select",
          options: parentOptions,
          visibleInTable: false,
        },
      },
    ],
    [parentOptions]
  );

  const onPersist = useCallback(
    (mode: "create" | "edit" | "cell", values: UnitForm, prev?: Unit) => {
      if (mode === "create") {
        const created: Unit = { ...values, id: `new-${nextId.current++}` };
        setUnits((all) => [...all, created]);
        return created;
      }
      const saved: Unit = { ...prev!, ...values };
      setUnits((all) => all.map((u) => (u.id === saved.id ? saved : u)));
      return saved;
    },
    []
  );

  /* The grid calls this once, for the row; taking the subtree with it is the data
     owner's job, as it would be a back end's. */
  const onDelete = useCallback((row: Unit) => {
    setUnits((all) => {
      const gone = subtreeIds(all, row.id);
      return all.filter((u) => !gone.has(u.id));
    });
  }, []);

  const actionColumnOptions = useMemo<Partial<ActionColumnOpts<Unit>>>(
    () => ({
      renderActions: ({ row, defaults: { EditButton, DeleteButton } }) => (
        <>
          <button
            type="button"
            aria-label={`Add a unit under ${row.name}`}
            title="Add child"
            onClick={(e) => {
              e.stopPropagation();
              grid.current?.startCreate({
                parentId: row.id,
                kind: CHILD_KIND[row.kind],
              });
            }}
            className={ACTION_BTN}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label={`Move ${row.name} under another unit`}
            title="Move to…"
            onClick={(e) => {
              e.stopPropagation();
              grid.current?.startCellEdit(row, "parentId", e.currentTarget);
            }}
            className={ACTION_BTN}
          >
            <FolderInput className="h-3.5 w-3.5" aria-hidden />
          </button>
          <EditButton row={row} />
          <DeleteButton row={row} />
        </>
      ),
    }),
    []
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="border-b border-border-default pb-4">
        <div className="flex items-center gap-2">
          <ListTree className="h-6 w-6 text-accent" />
          <h2 className="text-2xl font-bold text-body">
            DataGrid tree mode, edited in the row
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted">
          Flat rows linked by <code>parentId</code>, rendered as a hierarchy. Click a cell
          to edit the row in place; the + action opens a draft under a row, and Enter saves
          it and opens the next sibling. The parent is set by position, so it has no column:
          the Move to… action edits it through the cell popover. Search and the Kind filter
          keep the ancestors of every match, sorting applies among siblings, and deleting a
          row takes its subtree with it.
        </p>
      </div>

      <DataGrid<Unit, UnitForm>
        ref={grid}
        title="Organisation"
        subtitle="tree mode · row editing"
        columns={columns}
        zodSchema={schema}
        initialData={units}
        tree={TREE}
        editContainer="row"
        selectable
        onPersist={onPersist}
        onDelete={onDelete}
        onEditStateChange={onEditStateChange}
        actionColumnOptions={actionColumnOptions}
      />
    </div>
  );
}
