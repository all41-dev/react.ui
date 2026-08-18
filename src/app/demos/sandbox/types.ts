import type { User } from "../mocks/fakeData";
import type { Album, Comment, Photo, Post, Todo } from "../mocks/mockApi";

export type ResourceType =
  | "users"
  | "posts"
  | "comments"
  | "albums"
  | "photos"
  | "todos";

export type DataSource = "mock-data" | "mock-api";
export type FormGrouping = "off" | "stacked" | "split";
export type ContainerType = "right" | "bottom" | "modal" | "inline";

/** The sandbox swaps datasets at runtime; every one of them is keyed by `id`. */
export type DemoRow = User | Post | Comment | Album | Photo | Todo;

/** One grid serves six shapes, so the form type is the widest of them. */
export type DemoForm = Record<string, unknown>;

/** Reads a field only some of the resources carry. */
export const rowField = (row: DemoRow, key: string): unknown =>
  (row as unknown as Record<string, unknown>)[key];

/** Singular resource name, for toast copy. */
export const resourceNoun = (resource: ResourceType) => resource.slice(0, -1);
