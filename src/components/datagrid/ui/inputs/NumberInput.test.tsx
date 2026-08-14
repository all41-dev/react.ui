import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { NumberInput } from "./NumberInput";

/**
 * The emptied value has to be `null`, not `undefined`. react-hook-form's `get` treats
 * `undefined` as "no value set" and returns the form default instead, so an optional
 * number field cleared by the user snapped straight back to what it started with.
 */
describe("NumberInput", () => {
  it("emits null when the field is cleared", async () => {
    const onChange = vi.fn();
    render(<NumberInput aria-label="Price" value={12} onChange={onChange} />);

    await userEvent.clear(screen.getByLabelText("Price"));

    expect(onChange).toHaveBeenCalledWith(null);
    expect(onChange).not.toHaveBeenCalledWith(undefined);
  });

  it("emits a number for a numeric entry", async () => {
    const onChange = vi.fn();
    render(<NumberInput aria-label="Price" value="" onChange={onChange} />);

    await userEvent.type(screen.getByLabelText("Price"), "7");

    expect(onChange).toHaveBeenLastCalledWith(7);
  });

  it("renders null as an empty field", () => {
    render(<NumberInput aria-label="Price" value={null} onChange={vi.fn()} />);
    expect(screen.getByLabelText("Price")).toHaveValue(null);
  });
});
