import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LazyCodeEditor, LazyCodeView } from "./LazyCode";

/*
 * Both load their engine on first render: nothing shows inside the loading
 * delay, then the real view or editor takes the place.
 */

describe("LazyCodeView", () => {
  it("renders the view once its engine has loaded, with no placeholder inside the delay", async () => {
    const { container } = render(<LazyCodeView value={'{ "a": 1 }'} language="json" aria-label="Sample" />);
    expect(container).toBeEmptyDOMElement();
    expect(await screen.findByLabelText("Sample", {}, { timeout: 5000 })).toBeInTheDocument();
  });
});

describe("LazyCodeEditor", () => {
  it("renders the editor once its engine has loaded", async () => {
    render(<LazyCodeEditor value="return 1;" onChange={() => undefined} aria-label="Body" />);
    expect(await screen.findByLabelText("Body", {}, { timeout: 5000 })).toBeInTheDocument();
  });
});
