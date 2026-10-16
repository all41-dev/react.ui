import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";

import type { WithMeta } from "../../types/column";
import { GridTooltip } from "../GridTooltip";
import { TooltipIdContext } from "../tooltipContext";
import type { EditorVariant } from "./editorChrome";
import { renderEditor } from "./EditorRegistry";

type Row = { name: string; tier: string; active: boolean };
type Form = Record<string, unknown>;

const TIERS = [
  { value: "gold", label: "Gold" },
  { value: "silver", label: "Silver" },
];

const NAME: WithMeta<Row, Form> = {
  accessorKey: "name",
  header: "Name",
  meta: {
    label: "Name",
    editor: "text",
    required: true,
    description: "Shown to the customer",
    hint: () => "Keep it short",
  },
};

const TIER: WithMeta<Row, Form> = {
  accessorKey: "tier",
  header: "Tier",
  meta: { label: "Tier", editor: "select", options: TIERS },
};

const ACTIVE: WithMeta<Row, Form> = {
  accessorKey: "active",
  header: "Active",
  meta: { label: "Active", editor: "switch", description: "Billed while on" },
};

const TOOLTIP_ID = "editor-tip";

function Harness({
  column,
  variant,
  defaultValues,
  onForm,
}: {
  column: WithMeta<Row, Form>;
  variant?: EditorVariant;
  defaultValues: Form;
  onForm?: (form: UseFormReturn<Form>) => void;
}) {
  const form = useForm<Form>({ defaultValues });
  useEffect(() => {
    onForm?.(form);
  }, [form, onForm]);

  return (
    <TooltipIdContext.Provider value={TOOLTIP_ID}>
      {renderEditor<Row, Form>({ column, control: form.control, idPrefix: "f", variant })}
      <GridTooltip id={TOOLTIP_ID} />
    </TooltipIdContext.Provider>
  );
}

/** Renders one editor and hands back the form, so a test can set an error on it. */
function renderEditorWith(
  column: WithMeta<Row, Form>,
  variant: EditorVariant | undefined,
  defaultValues: Form
) {
  let form: UseFormReturn<Form> | undefined;
  const onForm = (f: UseFormReturn<Form>) => {
    form = f;
  };
  const utils = render(
    <Harness column={column} variant={variant} defaultValues={defaultValues} onForm={onForm} />
  );
  const setError = (name: string, message: string) =>
    act(() => form!.setError(name, { type: "manual", message }));
  return { ...utils, setError };
}

describe("renderEditor variant: cell", () => {
  it("renders a text editor with no label element and the label as its name", () => {
    renderEditorWith(NAME, "cell", { name: "Ada" });

    const input = screen.getByRole("textbox", { name: "Name" });
    expect(input).toHaveAttribute("aria-label", "Name");
    expect(input).toHaveAttribute("aria-required", "true");
    expect(document.querySelector("label")).toBeNull();
    // Neither the description nor the hint has a place in a cell.
    expect(screen.queryByText("Shown to the customer")).toBeNull();
    expect(screen.queryByText("Keep it short")).toBeNull();
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("renders a select with its options and no label element", () => {
    renderEditorWith(TIER, "cell", { tier: "gold" });

    const select = screen.getByRole("combobox", { name: "Tier" });
    expect(select).toHaveValue("gold");
    expect(screen.getByRole("option", { name: "Silver" })).toBeInTheDocument();
    expect(document.querySelector("label[for]")?.textContent ?? "").toBe("");
    expect(screen.queryByText("Tier")).toBeNull();
  });

  it("renders a switch as its track alone, named through aria-label", async () => {
    const user = userEvent.setup({ delay: null });
    renderEditorWith(ACTIVE, "cell", { active: false });

    const checkbox = screen.getByRole("checkbox", { name: "Active" });
    expect(checkbox).not.toBeChecked();
    expect(screen.queryByText("Active")).toBeNull();
    expect(screen.queryByText("Billed while on")).toBeNull();

    // The track is still the pointer target: it is the `<label>` for the sr-only input.
    await user.click(document.querySelector("label[for]")!);
    expect(checkbox).toBeChecked();
  });

  it("uses the compact class set, with no resting border", () => {
    renderEditorWith(NAME, "cell", { name: "" });
    const input = screen.getByRole("textbox", { name: "Name" });
    expect(input).toHaveClass("h-7", "w-full", "border-transparent");
    expect(input).not.toHaveClass("h-8", "border-border-default");
  });

  it("rings an invalid control and describes the error through an sr-only span", () => {
    const { setError } = renderEditorWith(NAME, "cell", { name: "" });
    const input = screen.getByRole("textbox", { name: "Name" });

    setError("name", "Name is required");

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveClass("border-danger");
    expect(input).toHaveAccessibleDescription("Name is required");
    // The message is for assistive tech; the eye gets the ring and the tooltip.
    expect(screen.getByRole("alert")).toHaveClass("sr-only");
    expect(input).toHaveAttribute("data-tooltip-id", TOOLTIP_ID);
    expect(input).toHaveAttribute("data-tooltip-content", "Name is required");
  });

  it("drops the ring, the description and the tooltip anchor once the error clears", () => {
    let form: UseFormReturn<Form> | undefined;
    render(
      <Harness
        column={NAME}
        variant="cell"
        defaultValues={{ name: "" }}
        onForm={(f) => {
          form = f;
        }}
      />
    );
    const input = screen.getByRole("textbox", { name: "Name" });
    act(() => form!.setError("name", { type: "manual", message: "Name is required" }));
    expect(input).toHaveAttribute("aria-invalid", "true");

    act(() => form!.clearErrors("name"));

    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(input).not.toHaveAttribute("data-tooltip-content");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("rings an invalid switch and anchors its error to both the input and the track", () => {
    const { setError } = renderEditorWith(ACTIVE, "cell", { active: false });
    const checkbox = screen.getByRole("checkbox", { name: "Active" });

    setError("active", "Must be on");

    expect(checkbox).toHaveAttribute("aria-invalid", "true");
    expect(checkbox).toHaveAccessibleDescription("Must be on");
    expect(checkbox).toHaveAttribute("data-tooltip-content", "Must be on");
    // The input is sr-only, so the pointer reaches the wrapper around the track.
    expect(checkbox.parentElement).toHaveAttribute("data-tooltip-content", "Must be on");
    expect(document.querySelector("label[for]")).toHaveClass("border-danger");
  });

  /* Attribute assertions alone can't tell a live anchor from one pointing at a tooltip
     nothing renders — only an actual open proves the wiring. react-tooltip registers
     new anchors from a rAF-batched MutationObserver, so the hover is retried. */
  it("shows the error in the tooltip on hover", async () => {
    const user = userEvent.setup({ delay: null });
    const { setError } = renderEditorWith(NAME, "cell", { name: "" });
    const input = screen.getByRole("textbox", { name: "Name" });
    setError("name", "Name is required");

    await waitFor(async () => {
      await user.unhover(input);
      await user.hover(input);
      expect(screen.getByRole("tooltip")).toBeInTheDocument();
    });
    expect(screen.getByRole("tooltip")).toHaveTextContent("Name is required");
  });

  it("keeps consumer editorProps but not their accessibility overrides", () => {
    const column: WithMeta<Row, Form> = {
      ...NAME,
      meta: {
        ...NAME.meta,
        editorProps: { placeholder: "Type a name", "aria-label": "Wrong", className: "font-mono" },
      },
    };
    renderEditorWith(column, "cell", { name: "" });

    const input = screen.getByRole("textbox", { name: "Name" });
    expect(input).toHaveAttribute("placeholder", "Type a name");
    expect(input).toHaveClass("font-mono", "h-7");
  });
});

describe("renderEditor section variants", () => {
  it("keeps the label element, description and hint outside a cell", () => {
    renderEditorWith(NAME, "grid", { name: "Ada" });

    const input = screen.getByLabelText(/Name/);
    expect(document.querySelector("label[for='f-name']")).toHaveTextContent("Name");
    expect(input).not.toHaveAttribute("aria-label");
    expect(input).toHaveClass("h-8", "border-border-default");
    expect(screen.getByText("Keep it short")).toBeInTheDocument();
    expect(input).toHaveAccessibleDescription(/Shown to the customer/);
  });

  it("shows the error as a visible line, not a tooltip", () => {
    const { setError } = renderEditorWith(NAME, undefined, { name: "" });
    const input = screen.getByLabelText(/Name/);

    setError("name", "Name is required");

    expect(screen.getByRole("alert")).not.toHaveClass("sr-only");
    expect(input).not.toHaveAttribute("data-tooltip-content");
    expect(input).toHaveAccessibleDescription(/Name is required/);
  });

  it("gives a switch its label text in a cards section", () => {
    renderEditorWith(ACTIVE, "cards", { active: true });
    expect(screen.getByRole("checkbox", { name: "Active" })).toBeChecked();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });
});

describe("renderEditor", () => {
  it("renders nothing for a column without an accessor key", () => {
    const column = { id: "computed", header: "Computed" } as WithMeta<Row, Form>;
    const { container } = render(
      <Harness column={column} variant="cell" defaultValues={{}} onForm={vi.fn()} />
    );
    expect(container.querySelector("input, select")).toBeNull();
  });
});
