import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

/*
 * jsdom implements neither of these, and the grid leans on both: every virtualized view
 * measures its scroll container, and `useIsTruncated` / `useColumnPrefs` observe resizes.
 * Without the stubs the components throw on mount rather than failing an assertion.
 */
class ResizeObserverStub implements ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub;

/* An open react-tooltip runs @floating-ui's `autoUpdate`, which observes the anchor. */
class IntersectionObserverStub implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds: number[] = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
globalThis.IntersectionObserver ??= IntersectionObserverStub;

if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}

/*
 * jsdom reports every element as 0×0. The virtualizer would then decide nothing is
 * visible and render an empty body, so tests asserting on rows would all fail for a
 * reason that has nothing to do with the code under test. Give elements a plausible box.
 */
Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
  configurable: true,
  get() {
    return Number(this.style?.height?.replace("px", "")) || 40;
  },
});
Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
  configurable: true,
  get() {
    return 1200;
  },
});
Object.defineProperty(HTMLElement.prototype, "clientWidth", {
  configurable: true,
  get() {
    return 1200;
  },
});
Object.defineProperty(HTMLElement.prototype, "clientHeight", {
  configurable: true,
  get() {
    return 800;
  },
});
Object.defineProperty(HTMLElement.prototype, "getBoundingClientRect", {
  configurable: true,
  value() {
    return {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      bottom: 800,
      right: 1200,
      width: 1200,
      height: 800,
      toJSON: () => ({}),
    };
  },
});

/*
 * jsdom ships Range without any geometry, and CodeMirror measures text by asking a
 * Range for its client rects on every render — it throws
 * `textRange(...).getClientRects is not a function` before a test can assert anything.
 */
const emptyRect = (): DOMRect =>
  ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    width: 0,
    height: 0,
    toJSON: () => ({}),
  }) as DOMRect;

Range.prototype.getBoundingClientRect ??= emptyRect;
Range.prototype.getClientRects ??= () =>
  Object.assign([] as DOMRect[], { item: () => null }) as unknown as DOMRectList;
