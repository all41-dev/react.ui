import { describe, expect, it } from "vitest";
import { humanizeCron, isCron } from "./cron";

describe("humanizeCron", () => {
  it("reads a schedule as a sentence", () => {
    expect(humanizeCron("*/5 * * * *")).toBe("Every 5 minutes");
    expect(humanizeCron("0 23 * * MON-FRI")).toBe(
      "At 23:00, Monday through Friday"
    );
    expect(humanizeCron("@daily")).toBe("At 00:00");
  });

  it("hands back an expression it cannot parse", () => {
    // The server accepted it; a parse failure must not hide it from the row.
    expect(humanizeCron("not a cron")).toBe("not a cron");
    expect(humanizeCron("  ")).toBe("");
  });
});

describe("isCron", () => {
  it("accepts an expression the humanizer can read", () => {
    expect(isCron("*/5 * * * *")).toBe(true);
    expect(isCron("0 */2 * * *")).toBe(true);
  });

  it("rejects prose, an empty field and a malformed expression", () => {
    expect(isCron("every five minutes")).toBe(false);
    expect(isCron("   ")).toBe(false);
    expect(isCron("*/5 * *")).toBe(false);
  });
});
