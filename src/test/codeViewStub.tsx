import type { CodeViewProps } from "../components/CodeView";

/*
 * Stand-in for the lazy code view under jsdom: the real view virtualises its
 * lines against a box jsdom cannot measure, so a test asserting on the text
 * would see only the first few.
 *
 *   vi.mock("../LazyCode", () => import("../../test/codeViewStub"));
 */
export function LazyCodeView({ value, language, "aria-label": ariaLabel }: CodeViewProps) {
  return (
    <pre data-testid="code-view" data-language={language} aria-label={ariaLabel}>
      {value}
    </pre>
  );
}
