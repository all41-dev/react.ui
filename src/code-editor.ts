/*
 * Subpath entry: `@all41-dev/react.ui/code-editor`.
 *
 * The standalone editor lives here rather than in the root entry so the CodeMirror
 * engine never reaches a consumer who only uses the grid — inside the grid the editor
 * arrives through a lazy() registration in `editorComponents.ts`. A static re-export
 * from `src/index.ts` would defeat that split for every consumer.
 */
export { CodeEditor } from "./components/datagrid/ui/editors/CodeEditor";
export type { CodeEditorProps } from "./components/datagrid/ui/editors/CodeEditor";
