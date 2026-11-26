import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SplitPane } from "./SplitPane";

/*
 * A divider: a drag moves the boundary between its two panes and clamps at
 * their minimums, the keys step it, Enter and a double-click reset every
 * share, the shares are written on release only and read back on mount, and
 * a folded pane takes its divider away. jsdom measures nothing, so a pane's
 * box is read off its own flex-grow.
 */

const KEY = "split-test";
// The open panes share 400px, so 100px is a share of 0.25.
const FREE = 400;

type Props = Partial<ComponentProps<typeof SplitPane>>;

function measured() {
  for (const pane of document.querySelectorAll<HTMLElement>("[data-split-pane]")) {
    // The shared setup defines the method read-only on the prototype.
    Object.defineProperty(pane, "getBoundingClientRect", {
      configurable: true,
      value: () => {
        const px = (Number.parseFloat(pane.style.flexGrow) || 0) * FREE;
        return { top: 0, left: 0, width: px, height: px, right: px, bottom: px, x: 0, y: 0, toJSON: () => undefined };
      },
    });
  }
}

function renderPane(props: Props = {}, names = ["first", "second"]) {
  const utils = render(
    <SplitPane label="Resize" storageKey={KEY} mins={[40, 60, 40]} {...props}>
      {names.map((name) => (
        <div key={name}>{name}</div>
      ))}
    </SplitPane>,
  );
  measured();
  return utils;
}

const pane = (name: string) => screen.getByText(name).parentElement!;
const separator = () => screen.getByRole("separator", { name: "Resize" });
const share = (name = "first") => Number.parseFloat(pane(name).style.flexGrow);
const stored = () => localStorage.getItem(KEY);

beforeEach(() => {
  localStorage.clear();
  HTMLElement.prototype.setPointerCapture ??= () => undefined;
});

describe("SplitPane", () => {
  it("opens in equal shares with a focusable separator", () => {
    renderPane();
    expect(share()).toBe(0.5);
    expect(separator()).toHaveAttribute("aria-orientation", "horizontal");
    expect(separator()).toHaveAttribute("aria-valuenow", "50");
    expect(separator()).toHaveAttribute("tabindex", "0");
  });

  it("follows a drag and writes the shares on release only", () => {
    renderPane();
    fireEvent.pointerDown(separator(), { button: 0, clientY: 205 });
    fireEvent.pointerMove(separator(), { clientY: 105 });
    expect(share()).toBe(0.25);
    expect(share("second")).toBe(0.75);
    expect(stored()).toBeNull();
    fireEvent.pointerUp(separator());
    expect(JSON.parse(stored()!)).toEqual({ v: 1, sizes: [0.25, 0.75] });
  });

  it("stops at each pane's minimum", () => {
    renderPane();
    fireEvent.pointerDown(separator(), { button: 0, clientY: 205 });
    fireEvent.pointerMove(separator(), { clientY: -900 });
    expect(share()).toBe(0.1);
    fireEvent.pointerMove(separator(), { clientY: 900 });
    expect(share()).toBe(0.85);
  });

  it("steps with the arrows, Shift for a longer step, Home and End to the minimums", () => {
    renderPane();
    fireEvent.keyDown(separator(), { key: "ArrowDown" });
    expect(share()).toBe(0.54);
    fireEvent.keyDown(separator(), { key: "ArrowUp", shiftKey: true });
    expect(share()).toBe(0.38);
    expect(JSON.parse(stored()!)).toEqual({ v: 1, sizes: [0.38, 0.62] });
    fireEvent.keyDown(separator(), { key: "Home" });
    expect(share()).toBe(0.1);
    fireEvent.keyDown(separator(), { key: "End" });
    expect(share()).toBe(0.85);
  });

  it("resets to the defaults on Enter and on a double-click, forgetting the stored shares", () => {
    localStorage.setItem(KEY, JSON.stringify({ v: 1, sizes: [0.3, 0.7] }));
    renderPane();
    expect(share()).toBe(0.3);
    fireEvent.keyDown(separator(), { key: "Enter" });
    expect(share()).toBe(0.5);
    expect(stored()).toBeNull();
    fireEvent.keyDown(separator(), { key: "ArrowDown" });
    expect(stored()).not.toBeNull();
    fireEvent.doubleClick(separator());
    expect(share()).toBe(0.5);
    expect(stored()).toBeNull();
  });

  it("opens at the default shares given", () => {
    renderPane({ defaultSizes: [0.2, 0.8] });
    expect(share()).toBe(0.2);
    expect(separator()).toHaveAttribute("aria-valuenow", "20");
  });

  it("takes the divider away and folds the pane while collapsed", () => {
    const { rerender } = renderPane({ collapsed: [true, false] });
    expect(screen.queryByRole("separator")).toBeNull();
    expect(pane("first").style.flex).toBe("0 0 auto");
    expect(pane("first")).toHaveClass("block");
    expect(pane("first")).not.toHaveClass("flex");
    expect(share("second")).toBe(1);
    rerender(
      <SplitPane label="Resize" storageKey={KEY}>
        <div key="first">first</div>
        <div key="second">second</div>
      </SplitPane>,
    );
    expect(separator()).toBeInTheDocument();
  });

  it("folds every pane, none growing, with no divider", () => {
    renderPane({ collapsed: [true, true] });
    expect(screen.queryByRole("separator")).toBeNull();
    expect(pane("first").style.flex).toBe("0 0 auto");
    expect(pane("second").style.flex).toBe("0 0 auto");
  });

  it("reports controlled shares and remembers nothing itself", () => {
    const onSizesChange = vi.fn();
    renderPane({ sizes: [0.5, 0.5], onSizesChange });
    fireEvent.keyDown(separator(), { key: "ArrowDown" });
    expect(onSizesChange).toHaveBeenCalledWith([0.54, 0.46]);
    expect(share()).toBe(0.5);
    expect(stored()).toBeNull();
  });

  it("commits controlled shares once per gesture, and null on a reset", () => {
    const onSizesCommit = vi.fn();
    renderPane({ sizes: [0.5, 0.5], onSizesCommit });
    fireEvent.pointerDown(separator(), { button: 0, clientY: 205 });
    fireEvent.pointerMove(separator(), { clientY: 105 });
    fireEvent.pointerMove(separator(), { clientY: 125 });
    expect(onSizesCommit).not.toHaveBeenCalled();
    fireEvent.pointerUp(separator());
    expect(onSizesCommit).toHaveBeenCalledTimes(1);
    expect(onSizesCommit).toHaveBeenCalledWith([0.3, 0.7]);
    fireEvent.keyDown(separator(), { key: "Enter" });
    expect(onSizesCommit).toHaveBeenLastCalledWith(null);
    expect(stored()).toBeNull();
  });

  it("splits left and right when horizontal", () => {
    renderPane({ direction: "horizontal" });
    expect(separator()).toHaveAttribute("aria-orientation", "vertical");
    fireEvent.pointerDown(separator(), { button: 0, clientX: 205 });
    fireEvent.pointerMove(separator(), { clientX: 105 });
    fireEvent.pointerUp(separator());
    expect(share()).toBe(0.25);
    fireEvent.keyDown(separator(), { key: "ArrowRight" });
    expect(share()).toBe(0.29);
  });

  it("moves to an end by the keys in a box that cannot be measured", () => {
    render(
      <SplitPane label="Resize" defaultSizes={[0.3, 0.7]}>
        <div>first</div>
        <div>second</div>
      </SplitPane>,
    );
    for (const el of document.querySelectorAll<HTMLElement>("[data-split-pane]")) {
      Object.defineProperty(el, "getBoundingClientRect", {
        configurable: true,
        value: () => ({ top: 0, left: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => undefined }),
      });
    }
    fireEvent.keyDown(separator(), { key: "End" });
    expect(share()).toBe(1);
    fireEvent.keyDown(separator(), { key: "ArrowUp" });
    expect(share()).toBe(0);
  });

  describe("with three panes", () => {
    const THREE = ["first", "second", "third"];
    const SIZES = [0.25, 0.5, 0.25];
    const label = (index: number) => `Resize ${THREE[index]}`;
    const divider = (name: string) => screen.getByRole("separator", { name: `Resize ${name}` });

    it("draws a divider after every pane but the last, each moving its own two panes", () => {
      renderPane({ label, defaultSizes: SIZES }, THREE);
      expect(screen.getAllByRole("separator")).toHaveLength(2);
      fireEvent.keyDown(divider("second"), { key: "ArrowUp" });
      expect(share("first")).toBe(0.25);
      expect(share("second")).toBe(0.46);
      expect(share("third")).toBe(0.29);
      expect(JSON.parse(stored()!)).toEqual({ v: 1, sizes: [0.25, 0.46, 0.29] });
    });

    it("resizes the panes around a folded one through a single divider", () => {
      const onSizesChange = vi.fn();
      renderPane({ label, sizes: SIZES, onSizesChange, collapsed: [false, true, false] }, THREE);
      expect(screen.getAllByRole("separator")).toHaveLength(1);
      expect(pane("second").style.flex).toBe("0 0 auto");
      // The two open panes share the row: 0.25 of 0.5 each.
      expect(share("first")).toBe(0.5);
      fireEvent.keyDown(divider("first"), { key: "ArrowDown", shiftKey: true });
      expect(onSizesChange).toHaveBeenCalledWith([0.33, 0.5, 0.17]);
    });

    it("reads equal shares when the stored list is of another length", () => {
      localStorage.setItem(KEY, JSON.stringify({ v: 1, sizes: [0.3, 0.7] }));
      renderPane({ label }, THREE);
      expect(share("second")).toBeCloseTo(1 / 3, 3);
    });

    it("hands a pane's box the attributes asked for", () => {
      renderPane({ label, paneProps: (index) => ({ className: "relative", title: THREE[index] }) }, THREE);
      expect(pane("third")).toHaveClass("relative", "flex");
      expect(pane("third")).toHaveAttribute("title", "third");
    });
  });
});
