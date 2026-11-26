import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SplitRow, type SplitRowProps } from "./SplitRow";
import { usePaneOrder } from "./usePaneOrder";

/*
 * The row draws the panes in the hook's order with a divider between them, a
 * share stays with its pane through a reorder, a dragged pane dims and its
 * target shows the landing edge, and the shares are kept by pane name.
 */

const IDS = ["a", "b", "c"] as const;
type Id = (typeof IDS)[number];
const LABELS: Record<Id, string> = { a: "Alpha", b: "Beta", c: "Gamma" };
const SIZES: Record<Id, number> = { a: 0.2, b: 0.5, c: 0.3 };
const KEY = "row-test";
const FREE = 1000;

function Row(props: Partial<SplitRowProps<Id>>) {
  const paneOrder = usePaneOrder({ ids: IDS, labels: LABELS });
  return (
    <SplitRow
      paneOrder={paneOrder}
      defaultSizes={SIZES}
      mins={{ a: 100, b: 100, c: 100 }}
      panes={{
        a: <button type="button" {...paneOrder.gripProps("a")} />,
        b: <button type="button" {...paneOrder.gripProps("b")} />,
        c: <button type="button" {...paneOrder.gripProps("c")} />,
      }}
      {...props}
    />
  );
}

function renderRow(props: Partial<SplitRowProps<Id>> = {}) {
  const utils = render(<Row {...props} />);
  for (const el of document.querySelectorAll<HTMLElement>("[data-pane]")) {
    // The shared setup defines the method read-only on the prototype.
    Object.defineProperty(el, "getBoundingClientRect", {
      configurable: true,
      value: () => {
        const px = (Number.parseFloat(el.style.flexGrow) || 0) * FREE;
        return { top: 0, left: 0, width: px, height: 50, right: px, bottom: 50, x: 0, y: 0, toJSON: () => undefined };
      },
    });
  }
  return utils;
}

const grip = (id: Id) => screen.getByRole("button", { name: `Move the ${LABELS[id]} pane` });
const pane = (id: Id) => document.querySelector<HTMLElement>(`[data-pane="${id}"]`)!;
const order = () => [...document.querySelectorAll<HTMLElement>("[data-pane]")].map((el) => el.dataset.pane).join("");
const share = (id: Id) => Number.parseFloat(pane(id).style.flexGrow);
const divider = (id: Id) => screen.getByRole("separator", { name: `Resize ${LABELS[id]}` });
const dataTransfer = () => ({ setData: () => undefined, setDragImage: () => undefined, effectAllowed: "", dropEffect: "" });
const dragOver = (el: HTMLElement, clientX: number) => {
  const event = createEvent.dragOver(el, { dataTransfer: dataTransfer() });
  Object.defineProperty(event, "clientX", { value: clientX });
  fireEvent(el, event);
};

beforeEach(() => localStorage.clear());

describe("SplitRow", () => {
  it("draws the panes in order at their shares, a divider named after the pane before it", () => {
    renderRow();
    expect(order()).toBe("abc");
    expect(share("a")).toBe(0.2);
    expect(share("b")).toBe(0.5);
    expect(divider("a")).toHaveAttribute("aria-orientation", "vertical");
    expect(divider("b")).toBeInTheDocument();
  });

  it("keeps a pane's share through a reorder", () => {
    renderRow();
    fireEvent.keyDown(grip("a"), { key: "End" });
    expect(order()).toBe("bca");
    expect(share("a")).toBe(0.2);
    expect(share("b")).toBe(0.5);
    expect(divider("c")).toBeInTheDocument();
  });

  it("resizes two neighbours and writes the shares by name", () => {
    renderRow({ storageKey: KEY });
    fireEvent.keyDown(divider("a"), { key: "ArrowRight", shiftKey: true });
    expect(share("a")).toBe(0.264);
    expect(share("b")).toBe(0.436);
    expect(share("c")).toBe(0.3);
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ v: 1, ratios: { a: 0.264, b: 0.436, c: 0.3 } });
    fireEvent.keyDown(divider("a"), { key: "Enter" });
    expect(share("a")).toBe(0.2);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("reads the stored shares back", () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, ratios: { a: 0.4, b: 0.3, c: 0.3 } }));
    renderRow({ storageKey: KEY });
    expect(share("a")).toBe(0.4);
  });

  it("reports controlled shares by name, and null on a reset", () => {
    const onSizesChange = vi.fn();
    const onSizesCommit = vi.fn();
    renderRow({ sizes: SIZES, onSizesChange, onSizesCommit });
    fireEvent.keyDown(divider("b"), { key: "ArrowLeft" });
    expect(onSizesChange).toHaveBeenCalledWith({ a: 0.2, b: 0.484, c: 0.316 });
    expect(onSizesCommit).toHaveBeenCalledWith({ a: 0.2, b: 0.484, c: 0.316 });
    expect(share("b")).toBe(0.5);
    fireEvent.doubleClick(divider("b"));
    expect(onSizesCommit).toHaveBeenLastCalledWith(null);
  });

  it("folds a pane and resizes the two around it", () => {
    renderRow({ collapsed: { b: true } });
    expect(pane("b").style.flex).toBe("0 0 auto");
    expect(screen.getAllByRole("separator")).toHaveLength(1);
    expect(share("a")).toBe(0.4);
  });

  it("dims the dragged pane and marks the landing edge on its target", () => {
    renderRow();
    fireEvent.dragStart(grip("a"), { dataTransfer: dataTransfer() });
    expect(pane("a")).toHaveClass("opacity-60");
    // Pane c spans 0 to 300px here: its right half is past 150.
    dragOver(pane("c"), 280);
    expect(pane("c").querySelector("[data-split-edge]")).toHaveAttribute("data-split-edge", "after");
    dragOver(pane("c"), 20);
    expect(pane("c").querySelector("[data-split-edge]")).toHaveAttribute("data-split-edge", "before");
    fireEvent.dragEnd(grip("a"));
    expect(pane("a")).not.toHaveClass("opacity-60");
    expect(document.querySelector("[data-split-edge]")).toBeNull();
  });
});
