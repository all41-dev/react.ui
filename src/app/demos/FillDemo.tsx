import { useState } from "react";
import { z } from "zod";

import { DataGrid } from "../../components/datagrid/DataGrid";
import type { WithMeta } from "../../components/datagrid/types/column";

type Item = { id: number; name: string; team: string; seats: number };
type ItemForm = Omit<Item, "id">;

const TEAMS = ["Platform", "Web", "Mobile", "Data", "Security"];

const ROWS: Item[] = Array.from({ length: 60 }, (_, i) => ({
  id: i + 1,
  name: `Workspace ${String(i + 1).padStart(2, "0")}`,
  team: TEAMS[i % TEAMS.length],
  seats: 4 + ((i * 7) % 23),
}));

const COLUMNS: WithMeta<Item, ItemForm>[] = [
  { accessorKey: "name", header: "Name", size: 200 },
  { accessorKey: "team", header: "Team", size: 140 },
  { accessorKey: "seats", header: "Seats", size: 100 },
];

const NO_PAGES = { enabled: false };

const schema = z.object({ name: z.string(), team: z.string(), seats: z.number() });

/*
 * `fill` against the default: the same grid in a box of a set height. Without it the
 * body grows to 70% of the viewport and spills out of the box; with it the rows scroll
 * inside. The slider changes the box's height, which `fill` follows.
 */
export function FillDemo() {
  const [height, setHeight] = useState(360);

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-3 text-[.8125rem] text-muted">
        Box height
        <input
          type="range"
          min={220}
          max={720}
          step={20}
          value={height}
          onChange={(e) => setHeight(Number(e.target.value))}
        />
        <span className="font-mono text-body">{height}px</span>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        {([false, true] as const).map((fill) => (
          <section key={String(fill)} className="space-y-2">
            <h2 className="text-[.8125rem] font-medium">
              {fill ? "fill" : "default"}
              <span className="ml-2 font-normal text-muted">
                {fill ? "scrolls inside the box" : "grows up to 70vh, past the box"}
              </span>
            </h2>
            <div
              className="rounded-surface border border-dashed border-border-default p-2"
              style={{ height }}
            >
              <DataGrid<Item, ItemForm>
                title={fill ? "Filling grid" : "Default grid"}
                columns={COLUMNS}
                zodSchema={schema}
                initialData={ROWS}
                editContainer="none"
                pagination={NO_PAGES}
                fill={fill}
              />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
