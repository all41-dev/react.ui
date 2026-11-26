import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCssBreakpoint } from "./useCssBreakpoint";

/* jsdom applies no stylesheet, so the sentinel's display is driven by an inline style. */

function Probe({ display }: { display: string }) {
  const { ref, matches } = useCssBreakpoint();
  return (
    <>
      <div ref={ref} data-testid="sentinel" style={{ display }} />
      <output>{matches ? "wide" : "narrow"}</output>
    </>
  );
}

afterEach(() => vi.restoreAllMocks());

describe("useCssBreakpoint", () => {
  it("reads the sentinel's display on mount", () => {
    render(<Probe display="none" />);
    expect(screen.getByRole("status")).toHaveTextContent("narrow");
  });

  it("reads it again when the sentinel resizes", () => {
    let fire: (() => void) | undefined;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(cb: () => void) {
          fire = cb;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    const { rerender } = render(<Probe display="block" />);
    expect(screen.getByRole("status")).toHaveTextContent("wide");
    rerender(<Probe display="none" />);
    act(() => fire?.());
    expect(screen.getByRole("status")).toHaveTextContent("narrow");
    vi.unstubAllGlobals();
  });
});
