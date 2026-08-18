import type { FormColSpan } from "../../types/formLayout";

/** Tracks a form grid gets at `md` and up; it is always one track below that. */
export type FormColumns = 1 | 2 | 3 | 4;

/* Written out rather than composed, so Tailwind sees every class it has to emit. */
const GRID_COLS: Record<FormColumns, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-4",
};

/* Spans follow the grid's breakpoint. A multi-track span in the collapsed one-track
   grid would make the browser generate an implicit column and push the row past the
   form's width. */
const COL_SPAN: Record<FormColSpan, string> = {
  1: "col-span-1",
  2: "col-span-1 md:col-span-2",
  3: "col-span-1 md:col-span-3",
  4: "col-span-1 md:col-span-4",
  full: "col-span-full",
};

/* Both fall back rather than emit `class="undefined"` for a value only the types rule
   out — the grid ships as a package and a JS consumer can pass anything. */
export const gridColsClass = (columns: FormColumns) =>
  GRID_COLS[columns] ?? GRID_COLS[2];

export const colSpanClass = (span: FormColSpan) => COL_SPAN[span] ?? COL_SPAN[1];
