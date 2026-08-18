// Emitted to dist/react.ui.css and exposed as `@all41-dev/react.ui/styles`.
// Consumers import that stylesheet explicitly; nothing here injects styles at runtime.
import "./styles/library.css";

export { DataGrid } from "./components/datagrid/DataGrid";
export { Tooltip } from "./components/Tooltip";
export { LoadingScreen } from "./components/LoadingScreen";
export { toast } from "./utils/toast";

export type {
  DataGridProps,
  DataGridHandle,
  EditState,
} from "./components/datagrid/DataGrid";

export type { WithMeta, ColumnMeta, EditorKind, Option, SelectOption, ColumnFilterMeta } from "./components/datagrid/types/column";
export type { CrudAdapter, IdLike } from "./components/datagrid/types/crud";
export type { UseTQAdapterParams } from "./components/datagrid/hooks/useTanstackQueryAdapter";

export { useColumnPrefs } from "./components/datagrid/hooks/useColumnPrefs";
export { useCrudAdapter } from "./components/datagrid/hooks/useCrudAdapter";
export { useTanstackQueryAdapter } from "./components/datagrid/hooks/useTanstackQueryAdapter";
export { useConfirm } from "./components/datagrid/hooks/useConfirm";

/*
 * The standalone `CodeEditor` lives at `@all41-dev/react.ui/code-editor`
 * (`src/code-editor.ts`), NOT here: a value export from this file is statically
 * reachable from every consumer, which puts the whole CodeMirror engine in front of
 * grids that never render a code column and defeats the lazy() split in
 * `editorComponents.ts`. Type-only exports are erased at build, so its types are safe.
 */
export type { CodeEditorProps } from "./components/datagrid/ui/editors/CodeEditor";
/*
 * Engine-neutral on purpose: a consumer writes completion and diagnostic sources against
 * these shapes, never against CodeMirror's, so the editor's engine stays swappable and
 * @codemirror/* never reaches a consumer's type graph.
 */
export type {
  CodeCompletion,
  CodeCompletionContext,
  CodeCompletionSource,
  CodeDiagnostic,
  CodeDiagnosticSeverity,
  CodeDiagnosticSource,
  CodeEditorLanguage,
  CodeEditorMode,
} from "./components/datagrid/ui/editors/codeEditorTypes";

export type { MarkdownPreviewMode } from "./components/datagrid/ui/editors/MarkdownEditor";

export type { ActionColumnOpts } from "./components/datagrid/ui/makeActionColumns";
export type { EditContainerKind } from "./components/datagrid/ui/containers/EditContainers";
export type {
  FormColSpan,
  FormFieldGroup,
  FormGroupVariant,
  FormLayoutConfig,
} from "./components/datagrid/types/formLayout";

export { DataGridContext } from "./components/datagrid/DataGridContext";

export type { LoadingScreenProps } from "./components/LoadingScreen";

export { EmptyState } from "./components/datagrid/ui/GridStates";

/*
 * Keep `EditFormBody`, `getRowId`, `FormLayout`, `computeDefaults` and `toTooltipText`
 * out of this file. They're internals of the grid, and exporting them would freeze their
 * signatures into the published API — every change to one becomes a breaking change.
 */