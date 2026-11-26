import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { SegmentedSwitch, type SegmentOption } from "./SegmentedSwitch";

type View = "open" | "faults" | "held" | "all";

const OPTIONS: SegmentOption<View>[] = [
  { value: "open", label: "Open" },
  { value: "faults", label: "Faults" },
  { value: "held", label: "Held", disabled: true },
  { value: "all", label: "All" },
];

function Harness({ onChange }: { onChange: (v: View) => void }) {
  const [value, setValue] = useState<View>("open");
  return (
    <SegmentedSwitch
      label="View"
      value={value}
      options={OPTIONS}
      onChange={(v) => {
        setValue(v);
        onChange(v);
      }}
    />
  );
}

const radio = (name: string) => screen.getByRole("radio", { name });

describe("SegmentedSwitch — keyboard", () => {
  it("is one tab stop, on the chosen option", async () => {
    const user = userEvent.setup();
    render(<Harness onChange={vi.fn()} />);

    await user.tab();

    expect(radio("Open")).toHaveFocus();
    expect(radio("Faults")).toHaveAttribute("tabindex", "-1");
    await user.tab();
    expect(document.body).toHaveFocus();
  });

  it("moves and chooses with the arrows, skipping a disabled option and wrapping", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.tab();

    await user.keyboard("{ArrowRight}");
    expect(radio("Faults")).toHaveFocus();
    expect(radio("Faults")).toHaveAttribute("aria-checked", "true");

    await user.keyboard("{ArrowRight}");
    expect(radio("All")).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(radio("Open")).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(radio("All")).toHaveFocus();
    expect(onChange.mock.calls.map(([v]) => v)).toEqual(["faults", "all", "open", "all"]);
  });

  it("goes to the first and last options on Home and End", async () => {
    const user = userEvent.setup();
    render(<Harness onChange={vi.fn()} />);
    await user.tab();

    await user.keyboard("{End}");
    expect(radio("All")).toHaveAttribute("aria-checked", "true");
    await user.keyboard("{Home}");
    expect(radio("Open")).toHaveAttribute("aria-checked", "true");
  });
});

describe("SegmentedSwitch — arrows that only move", () => {
  it("moves focus without choosing, and chooses on Space or Enter", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedSwitch
        label="View"
        value="open"
        options={OPTIONS}
        onChange={onChange}
        activateOnArrow={false}
      />
    );
    await user.tab();

    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(radio("All")).toHaveFocus();
    expect(radio("Open")).toHaveAttribute("aria-checked", "true");
    expect(onChange).not.toHaveBeenCalled();

    await user.keyboard("{ArrowLeft}{Enter}");
    expect(onChange).toHaveBeenCalledWith("faults");
  });
});

describe("SegmentedSwitch — an option on its way", () => {
  it("tints a busy option and announces it, without choosing it", () => {
    render(
      <SegmentedSwitch
        label="Mode"
        value="monitor"
        options={[
          { value: "monitor", label: "Monitor" },
          { value: "configure", label: "Configure", disabled: true, busy: true },
        ]}
        onChange={vi.fn()}
      />
    );

    const busy = radio("Configure");
    expect(busy).toHaveAttribute("aria-busy", "true");
    expect(busy).toHaveAttribute("aria-checked", "false");
    expect(busy).toHaveClass("bg-accent-subtle");
    expect(busy).not.toHaveClass("bg-accent");
    expect(radio("Monitor")).not.toHaveAttribute("aria-busy");
  });

  it("holds a text label's chosen width without repeating its text", () => {
    render(
      <SegmentedSwitch
        label="Mode"
        value="monitor"
        options={[
          { value: "monitor", label: "Monitor" },
          { value: "configure", label: <b>Configure</b>, name: "Configure" },
        ]}
        onChange={vi.fn()}
      />
    );

    expect(radio("Monitor")).toHaveTextContent(/^Monitor$/);
    expect(radio("Monitor").querySelector("[data-label]")).toHaveAttribute("data-label", "Monitor");
    expect(radio("Configure").querySelector("[data-label]")).toBeNull();
  });
});

describe("SegmentedSwitch — a trailing control", () => {
  it("shares the box but stays outside the group and its tab stop", async () => {
    const user = userEvent.setup();
    render(
      <SegmentedSwitch
        label="Mode"
        value="monitor"
        options={[
          { value: "monitor", label: "Monitor" },
          { value: "configure", label: "Configure" },
        ]}
        onChange={vi.fn()}
        trailing={<button type="button">Link</button>}
      />
    );

    const group = screen.getByRole("radiogroup", { name: "Mode" });
    const link = screen.getByRole("button", { name: "Link" });
    expect(group).not.toContainElement(link);
    expect(group.parentElement).toContainElement(link);
    expect(group.parentElement).toHaveClass("border");

    await user.tab();
    expect(radio("Monitor")).toHaveFocus();
    await user.tab();
    expect(link).toHaveFocus();
  });
});
