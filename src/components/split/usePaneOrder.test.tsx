import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { insertPane, readPaneOrder, usePaneOrder } from "./usePaneOrder";

/*
 * The order is read under the key and written on every change, the keys move
 * a pane a slot or to an edge, Enter resets, a drop lands on the half of the
 * target the pointer is over, and each move is announced.
 */

const KEY = "order-test";
const IDS = ["a", "b", "c"] as const;
type Id = (typeof IDS)[number];
const LABELS: Record<Id, string> = { a: "Alpha", b: "Beta", c: "Gamma" };

const onOrderChange = vi.fn<(next: Id[], prev: Id[]) => void>();

function Row() {
  const po = usePaneOrder({ ids: IDS, storageKey: KEY, labels: LABELS, onOrderChange });
  return (
    <>
      <output>{po.order.join("")}</output>
      <p data-testid="said">{po.announcement}</p>
      {po.order.map((id) => (
        <div key={id} {...po.paneProps(id)} data-testid={`pane-${id}`} data-edge={po.edgeOf(id) ?? ""}>
          <button type="button" {...po.gripProps(id)} />
          {LABELS[id]}
        </div>
      ))}
    </>
  );
}

const order = () => screen.getByRole("status").textContent;
const said = () => screen.getByTestId("said").textContent;
const grip = (id: Id) => screen.getByRole("button", { name: `Move the ${LABELS[id]} pane` });
const pane = (id: Id) => screen.getByTestId(`pane-${id}`);
const stored = () => JSON.parse(localStorage.getItem(KEY) ?? "null") as unknown;

/** A pane 100px wide at x = 200. */
const rectOf = (el: HTMLElement) => {
  // The shared setup defines the method read-only on the prototype.
  Object.defineProperty(el, "getBoundingClientRect", {
    configurable: true,
    value: () =>
      ({ left: 200, width: 100, top: 0, height: 50, right: 300, bottom: 50, x: 200, y: 0, toJSON: () => undefined }) as DOMRect,
  });
};
const dataTransfer = () => ({ setData: () => undefined, setDragImage: () => undefined, effectAllowed: "", dropEffect: "" });
/** jsdom's drag events carry no pointer, so the x is set on the event itself. */
const dragAt = (type: "dragOver" | "drop", el: HTMLElement, clientX: number) => {
  const event = createEvent[type](el, { dataTransfer: dataTransfer() });
  Object.defineProperty(event, "clientX", { value: clientX });
  fireEvent(el, event);
};

beforeEach(() => {
  localStorage.clear();
  onOrderChange.mockClear();
});

describe("usePaneOrder", () => {
  it("opens in the default order, or the stored one when it names the same panes", () => {
    const { unmount } = render(<Row />);
    expect(order()).toBe("abc");
    unmount();
    localStorage.setItem(KEY, JSON.stringify({ v: 1, order: ["c", "a", "b"] }));
    render(<Row />);
    expect(order()).toBe("cab");
  });

  it("ignores a stored order of another version, another set or another shape", () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 2, order: ["c", "a", "b"] }));
    expect(readPaneOrder(KEY, IDS)).toEqual(["a", "b", "c"]);
    localStorage.setItem(KEY, JSON.stringify({ v: 1, order: ["c", "a", "z"] }));
    expect(readPaneOrder(KEY, IDS)).toEqual(["a", "b", "c"]);
    localStorage.setItem(KEY, JSON.stringify({ v: 1, order: ["a", "b"] }));
    expect(readPaneOrder(KEY, IDS)).toEqual(["a", "b", "c"]);
    localStorage.setItem(KEY, "nonsense");
    expect(readPaneOrder(KEY, IDS)).toEqual(["a", "b", "c"]);
  });

  it("moves a pane with the arrows, to the edges with Home and End, writing each time and saying so", () => {
    render(<Row />);
    fireEvent.keyDown(grip("a"), { key: "ArrowRight" });
    expect(order()).toBe("bac");
    expect(said()).toBe("Alpha moved to the right");
    expect(onOrderChange).toHaveBeenCalledWith(["b", "a", "c"], ["a", "b", "c"]);
    expect(stored()).toEqual({ v: 1, order: ["b", "a", "c"] });
    fireEvent.keyDown(grip("a"), { key: "End" });
    expect(order()).toBe("bca");
    expect(said()).toBe("Alpha moved to the right edge");
    fireEvent.keyDown(grip("a"), { key: "Home" });
    expect(order()).toBe("abc");
    expect(said()).toBe("Alpha moved to the left edge");
    onOrderChange.mockClear();
    fireEvent.keyDown(grip("a"), { key: "ArrowLeft" });
    expect(order()).toBe("abc");
    expect(onOrderChange).not.toHaveBeenCalled();
  });

  it("resets on Enter and forgets the key", () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, order: ["c", "a", "b"] }));
    render(<Row />);
    fireEvent.keyDown(grip("a"), { key: "Enter" });
    expect(order()).toBe("abc");
    expect(said()).toBe("Pane order reset");
    expect(onOrderChange).toHaveBeenCalledWith(["a", "b", "c"], ["c", "a", "b"]);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("drops on the half of the target the pointer is over, after showing that edge", () => {
    render(<Row />);
    rectOf(pane("c"));
    fireEvent.dragStart(grip("a"), { dataTransfer: dataTransfer() });
    dragAt("dragOver", pane("c"), 280);
    expect(pane("c")).toHaveAttribute("data-edge", "after");
    dragAt("dragOver", pane("c"), 220);
    expect(pane("c")).toHaveAttribute("data-edge", "before");
    dragAt("drop", pane("c"), 280);
    expect(order()).toBe("bca");
    expect(said()).toBe("Alpha moved to the right of Gamma");
    expect(pane("c")).toHaveAttribute("data-edge", "");
    expect(stored()).toEqual({ v: 1, order: ["b", "c", "a"] });
  });

  it("shows no edge where a drop would change nothing", () => {
    render(<Row />);
    rectOf(pane("b"));
    fireEvent.dragStart(grip("a"), { dataTransfer: dataTransfer() });
    // Before b is where a already is.
    dragAt("dragOver", pane("b"), 220);
    expect(pane("b")).toHaveAttribute("data-edge", "");
    dragAt("dragOver", pane("b"), 280);
    expect(pane("b")).toHaveAttribute("data-edge", "after");
  });

  it("keeps the focus on a grip through its own move", () => {
    render(<Row />);
    grip("a").focus();
    fireEvent.keyDown(grip("a"), { key: "ArrowRight" });
    expect(order()).toBe("bac");
    expect(grip("a")).toHaveFocus();
  });

  it("keeps the order in memory without a key", () => {
    function Unstored() {
      const po = usePaneOrder({ ids: IDS, labels: LABELS });
      return (
        <button type="button" {...po.gripProps("a")}>
          {po.order.join("")}
        </button>
      );
    }
    render(<Unstored />);
    fireEvent.keyDown(grip("a"), { key: "End" });
    expect(grip("a")).toHaveTextContent("bca");
    expect(localStorage.length).toBe(0);
  });

  it("insertPane puts a pane before or after another", () => {
    expect(insertPane(["a", "b", "c"], "a", "c", "after")).toEqual(["b", "c", "a"]);
    expect(insertPane(["a", "b", "c"], "c", "a", "before")).toEqual(["c", "a", "b"]);
    expect(insertPane(["a", "b", "c"], "b", "b", "before")).toEqual(["a", "b", "c"]);
  });
});
