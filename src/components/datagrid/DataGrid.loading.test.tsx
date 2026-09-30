import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { DataGrid, type DataGridProps } from "./DataGrid";
import type { WithMeta } from "./types/column";

/*
 * The loading state's timing. Space for the skeleton is reserved as soon as
 * `isLoading` is true; the bars, and the scrim over rows already there, wait for the
 * loading delay, so a fast answer never flashes a placeholder.
 */

type User = { id: number; name: string };

const USERS: User[] = [
  { id: 1, name: "Leanne" },
  { id: 2, name: "Ervin" },
];

const schema = z.object({ name: z.string().min(1) });

const COLUMNS: WithMeta<User, any>[] = [
  { accessorKey: "name", header: "Name", meta: { label: "Name", editor: "text" } },
];

function renderGrid(props: Partial<DataGridProps<User, any>> = {}) {
  return render(
    <DataGrid<User, any>
      title="Users"
      columns={COLUMNS}
      zodSchema={schema as never}
      initialData={[]}
      {...props}
    />
  );
}

const skeletonBars = () => document.querySelectorAll(".rui-skeleton");
const visibleBars = () => document.querySelectorAll(".rui-skeleton:not(.invisible)");

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe("DataGrid — loading", () => {
  it("reserves the skeleton's space at once and paints the bars after the delay", () => {
    renderGrid({ isLoading: true });

    expect(skeletonBars().length).toBeGreaterThan(0);
    expect(visibleBars().length).toBe(0);
    expect(screen.queryByText("No data")).not.toBeInTheDocument();

    advance(250);
    expect(visibleBars().length).toBe(skeletonBars().length);
  });

  it("shows no placeholder for a load that ends inside the delay", () => {
    const { rerender } = renderGrid({ isLoading: true });

    advance(100);
    rerender(
      <DataGrid<User, any>
        title="Users"
        columns={COLUMNS}
        zodSchema={schema as never}
        initialData={USERS}
        isLoading={false}
      />
    );
    advance(1_000);

    expect(skeletonBars().length).toBe(0);
    expect(screen.getByText("Leanne")).toBeInTheDocument();
  });

  it("stands in a page's worth of rows, never fewer than three", () => {
    renderGrid({ isLoading: true, pagination: { initialState: { pageSize: 5 } } });
    expect(document.querySelectorAll("tr[aria-hidden]").length).toBe(5);
  });

  it("caps the stand-in rows at eight on a large page", () => {
    renderGrid({ isLoading: true, pagination: { initialState: { pageSize: 50 } } });
    expect(document.querySelectorAll("tr[aria-hidden]").length).toBe(8);
  });

  it("puts no spinner over an empty grid: the skeleton already says it", () => {
    renderGrid({ isLoading: true });

    advance(250);
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
  });

  it("scrims rows that are already there on a refresh, after the delay", () => {
    renderGrid({ isLoading: true, initialData: USERS });

    expect(screen.getByText("Leanne")).toBeInTheDocument();
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
    expect(skeletonBars().length).toBe(0);

    advance(250);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.getByText("Leanne")).toBeInTheDocument();
  });

  it("takes its delay from the grid's props", () => {
    renderGrid({ isLoading: true, loadingDelayMs: 0 });

    advance(0);
    expect(visibleBars().length).toBeGreaterThan(0);
  });
});
