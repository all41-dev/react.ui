import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { useRovingRadios } from "./useRovingRadios";

/*
 * The DataGrid-level test covers ArrowDown through the real overflow menu; these pin the
 * rest of the radiogroup contract the hook owns — all four arrows, wrap-around at both
 * ends, and the fallback tab stop — against a minimal group shaped like `GroupBySection`
 * consumes it (radios as direct children of one parent, in `keys` order).
 */

const KEYS = ["", "role", "status"] as const;

function Harness({ initial }: { initial: string }) {
  const [selected, setSelected] = useState(initial);
  const { tabStopIndex, handleArrowKey } = useRovingRadios(KEYS, selected, setSelected);
  return (
    <div role="radiogroup" aria-label="Group by">
      {KEYS.map((k, i) => (
        <button
          key={k || "__none__"}
          type="button"
          role="radio"
          aria-checked={selected === k}
          tabIndex={i === tabStopIndex ? 0 : -1}
          onClick={() => setSelected(k)}
          onKeyDown={handleArrowKey}
        >
          {k || "None"}
        </button>
      ))}
    </div>
  );
}

const radios = () => screen.getAllByRole("radio");
const tabStops = () => radios().map((r) => r.getAttribute("tabindex"));

describe("useRovingRadios", () => {
  it("makes the selected radio the only tab stop", () => {
    render(<Harness initial="role" />);
    expect(tabStops()).toEqual(["-1", "0", "-1"]);
  });

  it("falls back to the first radio when the selected key is unknown", () => {
    // A stale persisted groupBy must not leave the group with no tab stop at all —
    // that would make it unreachable from the keyboard entirely.
    render(<Harness initial="deleted-key" />);
    expect(tabStops()).toEqual(["0", "-1", "-1"]);
  });

  it("ArrowDown and ArrowRight move selection and focus forward", async () => {
    const user = userEvent.setup();
    render(<Harness initial="" />);

    radios()[0].focus();
    await user.keyboard("{ArrowDown}");
    expect(radios()[1]).toHaveAttribute("aria-checked", "true");
    expect(radios()[1]).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(radios()[2]).toHaveAttribute("aria-checked", "true");
    expect(radios()[2]).toHaveFocus();
  });

  it("ArrowUp and ArrowLeft move selection and focus backward", async () => {
    const user = userEvent.setup();
    render(<Harness initial="status" />);

    radios()[2].focus();
    await user.keyboard("{ArrowUp}");
    expect(radios()[1]).toHaveAttribute("aria-checked", "true");
    expect(radios()[1]).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(radios()[0]).toHaveAttribute("aria-checked", "true");
    expect(radios()[0]).toHaveFocus();
  });

  it("wraps around at both ends, as a native radio group does", async () => {
    const user = userEvent.setup();
    render(<Harness initial="" />);

    radios()[0].focus();
    await user.keyboard("{ArrowUp}");
    expect(radios()[2]).toHaveAttribute("aria-checked", "true");
    expect(radios()[2]).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(radios()[0]).toHaveAttribute("aria-checked", "true");
    expect(radios()[0]).toHaveFocus();
  });

  it("leaves non-arrow keys alone", async () => {
    const user = userEvent.setup();
    render(<Harness initial="role" />);

    radios()[1].focus();
    await user.keyboard("{Home}{End}a");

    expect(radios()[1]).toHaveAttribute("aria-checked", "true");
    expect(radios()[1]).toHaveFocus();
  });
});
