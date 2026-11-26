import type { CodeEditorLanguage } from "../datagrid/ui/editors/codeEditorTypes";

/** What the JSON inspector opens on. */
export type JsonTarget = {
  title: string;
  /** An object is shown as JSON; a string verbatim, coloured per `language`. */
  value: unknown;
  /** Grammar for a string value; ignored for an object. Default `"text"`. */
  language?: CodeEditorLanguage;
  /** Second header line — what kind of record this is. */
  kind?: string;
};
