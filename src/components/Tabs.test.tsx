import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { TabPanel, Tabs, type TabItem } from "./Tabs";

/* The tab row: selection, disabled tabs with a reason, and the roving focus. */

type Key = "overview" | "history" | "notes" | "audit";

const OPEN: TabItem<Key>[] = [
  { key: "overview", label: "Overview", count: 3 },
  { key: "history", label: "History" },
  { key: "notes", label: "Notes" },
];

const ONE_DISABLED: TabItem<Key>[] = [
  { key: "overview", label: "Overview" },
  { key: "history", label: "History" },
  { key: "audit", label: "Audit", disabledReason: "No audit trail is served yet" },
];

const MOSTLY_DISABLED: TabItem<Key>[] = [
  { key: "overview", label: "Overview" },
  { key: "history", label: "History", disabledReason: "Not served yet" },
  { key: "audit", label: "Audit", disabledReason: "No audit trail is served yet" },
];

function Harness({ tabs, initial = "overview" }: { tabs: TabItem<Key>[]; initial?: Key }) {
  const [tab, setTab] = useState<Key>(initial);
  return (
    <>
      <Tabs tabs={tabs} value={tab} onChange={setTab} idPrefix="demo" />
      <TabPanel idPrefix="demo" tab={tab}>
        {tab}
      </TabPanel>
    </>
  );
}

/** The count joins the label in the accessible name, so a tab with one is matched on its start. */
const tab = (name: string | RegExp) => screen.getByRole("tab", { name });

describe("Tabs — what it shows", () => {
  it("renders the selected tab as selected, not merely as bold text", () => {
    render(<Harness tabs={OPEN} />);

    expect(tab(/^Overview/)).toHaveAttribute("aria-selected", "true");
    expect(tab("History")).toHaveAttribute("aria-selected", "false");
  });

  it("shows the count after the label, inside the tab's name", () => {
    render(<Harness tabs={OPEN} />);

    expect(tab(/^Overview\s*3$/)).toBeInTheDocument();
  });

  it("labels the panel with the tab that opened it", () => {
    render(<Harness tabs={OPEN} />);

    const panel = screen.getByRole("tabpanel", { name: /^Overview/ });
    expect(panel).toHaveAttribute("id", "demo-panel-overview");
    expect(tab(/^Overview/)).toHaveAttribute("aria-controls", "demo-panel-overview");
  });

  it("marks a disabled tab with the reason as description, not as name", () => {
    render(<Harness tabs={ONE_DISABLED} />);

    const audit = tab("Audit");
    expect(audit).toHaveAttribute("aria-disabled", "true");
    expect(audit).toHaveAttribute("title", "No audit trail is served yet");
    expect(audit).toHaveAccessibleDescription("No audit trail is served yet");
    expect(audit).not.toHaveAttribute("aria-controls");
  });

  it("describes nothing on a row where every tab opens", () => {
    render(<Harness tabs={OPEN} />);

    for (const t of screen.getAllByRole("tab")) {
      expect(t).toHaveAttribute("aria-controls");
      expect(t).not.toHaveAttribute("aria-disabled");
      expect(t).toHaveAccessibleDescription("");
    }
  });

  it("generates its own ids when no prefix is given", () => {
    const [first] = OPEN;
    render(<Tabs tabs={OPEN} value={first.key} onChange={() => {}} />);

    expect(tab(/^Overview/).id).toMatch(/-tab-overview$/);
  });
});

describe("Tabs — opening", () => {
  it("opens a tab on click", async () => {
    const user = userEvent.setup();
    render(<Harness tabs={OPEN} />);

    await user.click(tab("History"));

    expect(tab("History")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("history");
  });

  it("does not open a disabled tab on click", async () => {
    const user = userEvent.setup();
    render(<Harness tabs={ONE_DISABLED} />);

    await user.click(tab("Audit"));

    expect(tab("Overview")).toHaveAttribute("aria-selected", "true");
  });
});

describe("Tabs — keyboard", () => {
  it("is a single tab stop — arrows move within the row and select as they go", async () => {
    const user = userEvent.setup();
    render(<Harness tabs={ONE_DISABLED} />);

    await user.tab();
    expect(tab("Overview")).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(tab("History")).toHaveFocus();
    expect(tab("History")).toHaveAttribute("aria-selected", "true");
  });

  it("steps over the disabled tabs when wrapping either way", async () => {
    const user = userEvent.setup();
    render(<Harness tabs={ONE_DISABLED} />);

    await user.tab();
    await user.keyboard("{ArrowLeft}");
    expect(tab("History")).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(tab("Overview")).toHaveFocus();
    expect(tab("Overview")).toHaveAttribute("aria-selected", "true");
  });

  it("stays put when every other tab in the row is disabled", async () => {
    const user = userEvent.setup();
    render(<Harness tabs={MOSTLY_DISABLED} />);

    await user.tab();
    await user.keyboard("{ArrowRight}");

    expect(tab("Overview")).toHaveFocus();
    expect(tab("Overview")).toHaveAttribute("aria-selected", "true");
  });

  it("goes to the first tab on Home and the last openable one on End", async () => {
    const user = userEvent.setup();
    render(<Harness tabs={ONE_DISABLED} />);

    await user.tab();
    await user.keyboard("{End}");
    expect(tab("History")).toHaveFocus();

    await user.keyboard("{Home}");
    expect(tab("Overview")).toHaveFocus();
    expect(tab("Overview")).toHaveAttribute("aria-selected", "true");
  });

  it("walks the whole row when nothing in it is disabled", async () => {
    const user = userEvent.setup();
    render(<Harness tabs={OPEN} />);

    await user.tab();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(tab("Notes")).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(tab(/^Overview/)).toHaveFocus();
  });
});

describe("TabPanel", () => {
  it("takes a tab stop only when asked, for content with nothing focusable", () => {
    const { rerender } = render(
      <TabPanel idPrefix="demo" tab="overview">
        text
      </TabPanel>
    );
    expect(screen.getByRole("tabpanel")).not.toHaveAttribute("tabindex");

    rerender(
      <TabPanel idPrefix="demo" tab="overview" focusable>
        text
      </TabPanel>
    );
    expect(screen.getByRole("tabpanel")).toHaveAttribute("tabindex", "0");
  });
});
