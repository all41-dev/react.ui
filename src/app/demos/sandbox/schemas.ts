import { z, type ZodType } from "zod";
import type { DemoForm, ResourceType } from "./types";

/** JSONPlaceholder sends numeric foreign keys; the form edits them as text. */
const foreignKey = z.number().or(z.string().transform(Number));

const userSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z.string().min(2, "Username must be at least 2 characters"),
  email: z.email("Must be a valid email address"),
  phone: z.string().min(6, "Phone number is too short"),
  website: z.string().min(3, "Website is too short"),
  role: z.string(),
  status: z.literal(["active", "inactive", "pending"]),
  lastLogin: z.string().optional().or(z.literal("")),
  twoFactor: z.boolean(),
  newsletter: z.boolean(),
});

const postSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, "Title must be at least 3 characters"),
  body: z.string().min(5, "Body must be at least 5 characters"),
  userId: foreignKey,
});

const commentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Name is required"),
  email: z.email("Must be a valid email"),
  body: z.string().min(5, "Comment body is required"),
  postId: foreignKey,
});

const albumSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, "Title is required"),
  userId: foreignKey,
});

const photoSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, "Title is required"),
  url: z.url("Must be a valid image URL"),
  thumbnailUrl: z.url("Must be a valid thumbnail URL"),
  albumId: foreignKey,
});

const todoSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, "Title is required"),
  completed: z.boolean(),
  userId: foreignKey,
});

const SCHEMAS = {
  users: userSchema,
  posts: postSchema,
  comments: commentSchema,
  albums: albumSchema,
  photos: photoSchema,
  todos: todoSchema,
} satisfies Record<ResourceType, ZodType>;

/* Widened at this one boundary: each schema still validates its own resource's exact
   shape, but the grid is instantiated once and needs a single form type. */
export const schemaFor = (resource: ResourceType) =>
  SCHEMAS[resource] as unknown as ZodType<DemoForm>;
