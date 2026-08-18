import { mockApi } from "../mocks/mockApi";
import type { DemoForm, DemoRow, ResourceType } from "./types";

type ResourceApi = {
  list: () => Promise<DemoRow[]>;
  create: (values: DemoForm) => Promise<DemoRow>;
  update: (values: DemoForm) => Promise<DemoRow>;
  remove: (id: string) => Promise<void>;
};

/* The mock API is typed per resource while the sandbox carries one widened form shape.
   Narrowing happens here so nothing above this module needs a cast of its own. */
const as = <T>(values: DemoForm) => values as unknown as T;

export const RESOURCE_API: Record<ResourceType, ResourceApi> = {
  users: {
    list: () => mockApi.getUsers(),
    create: (v) => mockApi.createUser(as(v)),
    update: (v) => mockApi.updateUser(as(v)),
    remove: (id) => mockApi.deleteUser(id),
  },
  posts: {
    list: () => mockApi.getPosts(),
    create: (v) => mockApi.createPost(as(v)),
    update: (v) => mockApi.updatePost(as(v)),
    remove: (id) => mockApi.deletePost(id),
  },
  comments: {
    list: () => mockApi.getComments(),
    create: (v) => mockApi.createComment(as(v)),
    update: (v) => mockApi.updateComment(as(v)),
    remove: (id) => mockApi.deleteComment(id),
  },
  albums: {
    list: () => mockApi.getAlbums(),
    create: (v) => mockApi.createAlbum(as(v)),
    update: (v) => mockApi.updateAlbum(as(v)),
    remove: (id) => mockApi.deleteAlbum(id),
  },
  photos: {
    list: () => mockApi.getPhotos(),
    create: (v) => mockApi.createPhoto(as(v)),
    update: (v) => mockApi.updatePhoto(as(v)),
    remove: (id) => mockApi.deletePhoto(id),
  },
  todos: {
    list: () => mockApi.getTodos(),
    create: (v) => mockApi.createTodo(as(v)),
    update: (v) => mockApi.updateTodo(as(v)),
    remove: (id) => mockApi.deleteTodo(id),
  },
};
