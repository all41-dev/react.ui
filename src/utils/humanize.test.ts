import { describe, expect, it } from "vitest";
import { formatDateTime, humanizeCode, humanizeDuration, relativeTime } from "./humanize";

describe("relativeTime", () => {
  const now = Date.parse("2026-08-13T12:00:00Z");
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it("counts back in the largest unit that fits", () => {
    expect(relativeTime(ago(2 * 60_000), now)).toBe("2 minutes ago");
    expect(relativeTime(ago(3 * 3_600_000), now)).toBe("3 hours ago");
    expect(relativeTime(ago(26 * 3_600_000), now)).toBe("yesterday");
    expect(relativeTime(ago(400 * 86_400_000), now)).toBe("last year");
  });

  it("says just now inside a few seconds, either side", () => {
    expect(relativeTime(ago(2_000), now)).toBe("just now");
    expect(relativeTime(ago(-2_000), now)).toBe("just now");
  });

  it("returns null for a value that is not a date", () => {
    // The column also holds arbitrary poll cursors.
    expect(relativeTime("cursor-4711", now)).toBeNull();
    expect(relativeTime("", now)).toBeNull();
  });
});

describe("humanizeCode", () => {
  it("reads an upper-snake code as a sentence start", () => {
    expect(humanizeCode("IN_PROGRESS")).toBe("In progress");
    expect(humanizeCode("WAITING_THIRD_PARTY")).toBe("Waiting third party");
    expect(humanizeCode("OK")).toBe("Ok");
  });
});

describe("formatDateTime", () => {
  it("writes the local date and time to the minute", () => {
    const local = new Date(2026, 9, 16, 13, 7, 42);
    expect(formatDateTime(local.toISOString())).toBe("2026-10-16 13:07");
  });

  it("returns null for a value that is not a date", () => {
    expect(formatDateTime("cursor-4711")).toBeNull();
    expect(formatDateTime("")).toBeNull();
  });
});

describe("humanizeDuration", () => {
  const MIN = 60_000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  it("names the two largest adjacent units", () => {
    expect(humanizeDuration(3 * DAY + 2 * HOUR + 5 * MIN)).toBe("3 days 2 hours");
    expect(humanizeDuration(2 * HOUR + 30 * MIN)).toBe("2 hours 30 minutes");
    expect(humanizeDuration(MIN + 1_000)).toBe("1 minute 1 second");
  });

  it("stops at the first unit when the one under it is empty", () => {
    expect(humanizeDuration(3 * DAY + 5 * MIN)).toBe("3 days");
    expect(humanizeDuration(4 * MIN)).toBe("4 minutes");
  });

  it("reads anything under a second, or unreadable, as the shortest span", () => {
    expect(humanizeDuration(400)).toBe("under a second");
    expect(humanizeDuration(-5_000)).toBe("under a second");
    expect(humanizeDuration(Number.NaN)).toBe("under a second");
  });
});
