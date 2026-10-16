import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { WithMeta } from "../types/column";
import { useRowEditForm } from "./useRowEditForm";

type Row = {
  id: number;
  name: string;
  type: string;
  parentUuid: string;
  note: string;
  active: boolean;
};

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string(),
  parentUuid: z.string(),
  note: z.string().optional(),
  active: z.boolean().optional(),
});

const col = (
  accessorKey: string,
  meta?: WithMeta<Row>["meta"],
  extra?: Partial<WithMeta<Row>>
): WithMeta<Row> => ({ accessorKey, header: accessorKey, meta, ...extra }) as WithMeta<Row>;

const columns: WithMeta<Row>[] = [
  col("name", { editor: "text", required: true, default: "untitled" }),
  col("type", { editor: "select", options: [{ value: "OBJECT", label: "Object" }] }),
  col("parentUuid", { editor: "select", visibleInTable: false }),
  col("note"),
  col("active", { editor: "switch" }),
];

const row: Row = {
  id: 1,
  name: "Leanne",
  type: "OBJECT",
  parentUuid: "root-1",
  note: "hi",
  active: true,
};

const warnSpy = () => vi.spyOn(console, "warn").mockImplementation(() => {});
const said = (spy: ReturnType<typeof warnSpy>, needle: RegExp) =>
  spy.mock.calls.filter((c) => needle.test(String(c[0]))).length;

function setup(opts: {
  row?: Row;
  seed?: object;
  visibleColumnIds?: readonly string[];
  cols?: WithMeta<Row>[];
}) {
  const onSubmit = vi.fn<(values: Row, meta: { dirtyKeys: ReadonlySet<string> }) => void>();
  const visibleColumnIds = opts.visibleColumnIds ?? [
    "__select__",
    "name",
    "type",
    "note",
    "active",
    "__actions__",
  ];
  const hook = renderHook(() =>
    useRowEditForm<Row, Row>({
      row: opts.row,
      seed: opts.seed,
      columns: opts.cols ?? columns,
      zodSchema: schema as never,
      visibleColumnIds,
      onSubmit,
    })
  );
  return { ...hook, onSubmit };
}

describe("useRowEditForm", () => {
  it("renders the visible editor columns, in table order", () => {
    const { result } = setup({
      row,
      visibleColumnIds: ["active", "note", "type", "name"],
    });
    const keys = result.current.editable.map((c) => (c as { accessorKey: string }).accessorKey);
    // `note` has no editor; `parentUuid` is not in the table.
    expect(keys).toEqual(["active", "type", "name"]);
  });

  it("carries an editor column hidden from the table", () => {
    const { result } = setup({ row });
    expect(result.current.carried).toEqual(["parentUuid"]);
  });

  /* A user hiding a column through the Columns popover moves it from the row to the
     carried set: the visible id list is the only input. */
  it("carries a column the user hid", () => {
    const { result } = setup({ row, visibleColumnIds: ["name", "active"] });
    expect(result.current.carried).toEqual(["type", "parentUuid"]);
  });

  it("carries a `visibleInForm: false` column even when the table shows it", () => {
    const cols = [col("name", { editor: "text" }), col("type", { editor: "text", visibleInForm: false })];
    const { result } = setup({ row, cols, visibleColumnIds: ["name", "type"] });
    expect(result.current.editable).toHaveLength(1);
    expect(result.current.carried).toEqual(["type"]);
  });

  /* Visibility is matched on TanStack's column id, which swaps dots for underscores;
     `carried` keeps speaking in accessor keys, the form's vocabulary. */
  it("matches a dotted accessor key by its column id and names it by its key", () => {
    const cols = [
      col("user.name", { editor: "text" }),
      col("user.role", { editor: "text" }),
    ] as unknown as WithMeta<Row>[];
    const { result } = setup({ row, cols, visibleColumnIds: ["user_name"] });
    expect(result.current.editable).toHaveLength(1);
    expect(result.current.carried).toEqual(["user.role"]);
  });

  it("ignores a column with no accessor key", () => {
    const cols = [{ id: "__custom__", meta: { editor: "text" } } as WithMeta<Row>, col("name", { editor: "text" })];
    const { result } = setup({ row, cols, visibleColumnIds: ["__custom__", "name"] });
    expect(result.current.editable).toHaveLength(1);
    expect(result.current.carried).toEqual([]);
  });

  it("submits a carried value with the edited row", async () => {
    const { result, onSubmit } = setup({ row });
    await act(async () => {
      await result.current.submit();
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: "Leanne",
      parentUuid: "root-1",
      note: "hi",
    });
  });

  it("submits a seeded carried value on create", async () => {
    const { result, onSubmit } = setup({ seed: { parentUuid: "root-2" } });
    await act(async () => {
      await result.current.submit();
    });
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: "untitled",
      parentUuid: "root-2",
    });
  });

  it("lets the seed beat the column default", () => {
    const { result } = setup({ seed: { name: "Seeded" } });
    expect(result.current.form.getValues("name")).toBe("Seeded");
  });

  it("reports dirty once a value changes", () => {
    const { result } = setup({ row });
    expect(result.current.isDirty).toBe(false);
    act(() => {
      result.current.form.setValue("name", "Ervin", { shouldDirty: true });
    });
    expect(result.current.isDirty).toBe(true);
  });

  /* A carried field that fails validation blocks the save while no cell turns red, so
     the row's error strip has to say which key it was. */
  it("names a carried key that fails validation", async () => {
    const strict = z.object({
      name: z.string(),
      type: z.string(),
      parentUuid: z.string().min(1, "Parent is required"),
    });
    const onSubmit = vi.fn();
    const { result } = renderHook(() =>
      useRowEditForm<Row, Row>({
        columns,
        zodSchema: strict as never,
        visibleColumnIds: ["name", "type"],
        onSubmit,
      })
    );
    await act(async () => {
      await result.current.submit();
    });
    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.formError).toBe("Validation error on 'parentUuid': Parent is required");
  });

  describe("required carried key", () => {
    const required = [
      col("name", { editor: "text" }),
      col("parentUuid", { editor: "select", required: true, visibleInTable: false }),
    ];

    it("warns once on create when it starts empty", () => {
      const warn = warnSpy();
      const { rerender } = setup({ cols: required, visibleColumnIds: ["name"] });
      rerender();
      rerender();
      expect(said(warn, /'parentUuid'.*cannot be saved/)).toBe(1);
    });

    it("stays quiet when the seed fills it", () => {
      const warn = warnSpy();
      setup({ cols: required, visibleColumnIds: ["name"], seed: { parentUuid: "root-1" } });
      expect(said(warn, /cannot be saved/)).toBe(0);
    });

    it("stays quiet when a default fills it", () => {
      const warn = warnSpy();
      const cols = [
        col("name", { editor: "text" }),
        col("parentUuid", { editor: "select", required: true, default: "root-1" }),
      ];
      setup({ cols, visibleColumnIds: ["name"] });
      expect(said(warn, /cannot be saved/)).toBe(0);
    });

    it("stays quiet on edit", () => {
      const warn = warnSpy();
      setup({ cols: required, visibleColumnIds: ["name"], row });
      expect(said(warn, /cannot be saved/)).toBe(0);
    });

    it("stays quiet when the column is in the table", () => {
      const warn = warnSpy();
      setup({ cols: required, visibleColumnIds: ["name", "parentUuid"] });
      expect(said(warn, /cannot be saved/)).toBe(0);
    });
  });
});
