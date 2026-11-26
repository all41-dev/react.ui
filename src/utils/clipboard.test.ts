import { afterEach, describe, expect, it, vi } from "vitest";
import { copyText } from "./clipboard";

const setClipboard = (value: unknown) =>
  Object.defineProperty(navigator, "clipboard", { value, configurable: true });

afterEach(() => {
  setClipboard(undefined);
  vi.restoreAllMocks();
});

describe("copyText", () => {
  it("uses the async API when the browser exposes it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setClipboard({ writeText });
    await expect(copyText("abc")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("abc");
  });

  it("falls back to the legacy command on a plain-http host", async () => {
    setClipboard(undefined);
    let seen: string | undefined;
    const exec = vi.fn(() => {
      // The text sits in a textarea while the command runs.
      seen = document.querySelector("textarea")?.value;
      return true;
    });
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    document.execCommand = exec;
    await expect(copyText("abc")).resolves.toBe(true);
    expect(exec).toHaveBeenCalledWith("copy");
    expect(seen).toBe("abc");
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("answers false when neither path works", async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error("denied")) });
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    document.execCommand = vi.fn(() => false);
    await expect(copyText("abc")).resolves.toBe(false);
  });
});
