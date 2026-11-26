import { Suspense, lazy, type ReactNode } from "react";
import type { CodeViewProps } from "./CodeView";
import type { CodeEditorProps } from "./datagrid/ui/editors/CodeEditor";
import { DelayedRender } from "./DelayedRender";
import { Skeleton } from "./Skeleton";

/*
 * The code view and the code editor, loaded on first render. Both ride the
 * CodeMirror engine, which a static import would put in the consumer's first
 * paint; these two are safe to import from the root entry. While the engine
 * loads, a placeholder stands in once the loading delay has passed.
 */

const CodeView = lazy(() => import("./CodeView").then((m) => ({ default: m.CodeView })));
const CodeEditor = lazy(() =>
  import("./datagrid/ui/editors/CodeEditor").then((m) => ({ default: m.CodeEditor }))
);

// Uneven on purpose: a column of identical bars reads as content.
const LINE_WIDTHS = ["w-1/3", "w-2/3", "w-1/2", "w-3/5", "w-2/5", "w-1/4"];

type Lazy = {
  /** Shown while the engine loads, in place of the default placeholder. */
  fallback?: ReactNode;
};

export type LazyCodeViewProps = CodeViewProps & Lazy;
export type LazyCodeEditorProps = CodeEditorProps & Lazy;

export function LazyCodeView({ fallback, ...props }: LazyCodeViewProps) {
  return (
    <Suspense
      fallback={
        <DelayedRender>
          {fallback ?? (
            <div className="space-y-2 p-3">
              {LINE_WIDTHS.map((width) => (
                <Skeleton key={width} className={`h-3 ${width}`} />
              ))}
            </div>
          )}
        </DelayedRender>
      }
    >
      <CodeView {...props} />
    </Suspense>
  );
}

export function LazyCodeEditor({ fallback, ...props }: LazyCodeEditorProps) {
  return (
    <Suspense fallback={<DelayedRender>{fallback ?? <Skeleton className="h-60 w-full" />}</DelayedRender>}>
      <CodeEditor {...props} />
    </Suspense>
  );
}
