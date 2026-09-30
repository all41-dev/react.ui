import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("is decoration: hidden from assistive technology, sized by the host", () => {
    const { container } = render(<Skeleton className="h-4 w-40" />);

    const bar = container.firstElementChild!;
    expect(bar).toHaveAttribute("aria-hidden", "true");
    expect(bar).toHaveClass("rui-skeleton", "h-4", "w-40");
    expect(bar).not.toHaveClass("invisible");
  });

  it("keeps its space while hidden", () => {
    const { container } = render(<Skeleton hidden />);

    expect(container.firstElementChild).toHaveClass("rui-skeleton", "invisible");
  });
});
