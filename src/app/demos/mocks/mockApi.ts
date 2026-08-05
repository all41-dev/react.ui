import axios from "axios";
import type { User } from "./fakeData";

const API_BASE = "https://jsonplaceholder.typicode.com";

export interface Post {
  id: string;
  userId: number;
  title: string;
  body: string;
}

export interface Comment {
  id: string;
  postId: number;
  name: string;
  email: string;
  body: string;
}

export interface Album {
  id: string;
  userId: number;
  title: string;
}

export interface Photo {
  id: string;
  albumId: number;
  title: string;
  url: string;
  thumbnailUrl: string;
}

export interface Todo {
  id: string;
  userId: number;
  title: string;
  completed: boolean;
}

// JSONPlaceholder user type
interface JSONPlaceholderUser {
  id: number;
  name: string;
  username: string;
  email: string;
  address: {
    street: string;
    suite: string;
    city: string;
    zipcode: string;
    geo: {
      lat: string;
      lng: string;
    };
  };
  phone: string;
  website: string;
  company: {
    name: string;
    catchPhrase: string;
    bs: string;
  };
}

/**
 * JSONPlaceholder is a read-only fake API: every POST echoes back the same
 * canned id for a resource (users -> 11, posts -> 101, ...). Trusting it would
 * give every locally created row of a resource an identical id — duplicate
 * React keys, and later edit/delete hitting the wrong row. So we ignore the
 * echoed id and mint a locally unique one instead.
 */
const LOCAL_ID_PREFIX = "local-";
let clientIdSeq = 0;
function newClientId(resource: string): string {
  clientIdSeq += 1;
  return `${LOCAL_ID_PREFIX}${resource}-${clientIdSeq}`;
}

/**
 * Rows created in this session exist only in the browser — the server has never
 * heard of them, and PUT /users/local-user-1 answers 500. Skip the round-trip for
 * those and let the caller treat the write as successful.
 */
function isLocalId(id: string): boolean {
  return id.startsWith(LOCAL_ID_PREFIX);
}

function transformUser(apiUser: JSONPlaceholderUser): User {
  return {
    id: String(apiUser.id),
    name: apiUser.name,
    username: apiUser.username,
    email: apiUser.email,
    phone: apiUser.phone,
    website: apiUser.website,
    role: apiUser.id <= 3 ? "Admin" : apiUser.id <= 7 ? "Editor" : "User",
    status: apiUser.id % 3 === 0 ? "inactive" : apiUser.id % 3 === 1 ? "active" : "pending",
    lastLogin: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

export const mockApi = {
  // USERS (10)
  async getUsers(): Promise<User[]> {
    const response = await axios.get<JSONPlaceholderUser[]>(`${API_BASE}/users`);
    return response.data.map(transformUser);
  },
  async createUser(user: Omit<User, "id">): Promise<User> {
    await axios.post<JSONPlaceholderUser>(`${API_BASE}/users`, user);
    return { ...user, id: newClientId("user") };
  },
  async updateUser(user: User): Promise<User> {
    if (!isLocalId(user.id)) await axios.put(`${API_BASE}/users/${user.id}`, user);
    return user;
  },
  async deleteUser(id: string): Promise<void> {
    if (!isLocalId(id)) await axios.delete(`${API_BASE}/users/${id}`);
  },

  // POSTS (100)
  async getPosts(): Promise<Post[]> {
    const response = await axios.get<any[]>(`${API_BASE}/posts`);
    return response.data.map((item) => ({ ...item, id: String(item.id) }));
  },
  async createPost(post: Omit<Post, "id">): Promise<Post> {
    await axios.post<any>(`${API_BASE}/posts`, post);
    return { ...post, id: newClientId("post") };
  },
  async updatePost(post: Post): Promise<Post> {
    if (!isLocalId(post.id)) await axios.put(`${API_BASE}/posts/${post.id}`, post);
    return post;
  },
  async deletePost(id: string): Promise<void> {
    if (!isLocalId(id)) await axios.delete(`${API_BASE}/posts/${id}`);
  },

  // COMMENTS (500)
  async getComments(): Promise<Comment[]> {
    const response = await axios.get<any[]>(`${API_BASE}/comments`);
    return response.data.map((item) => ({ ...item, id: String(item.id) }));
  },
  async createComment(comment: Omit<Comment, "id">): Promise<Comment> {
    await axios.post<any>(`${API_BASE}/comments`, comment);
    return { ...comment, id: newClientId("comment") };
  },
  async updateComment(comment: Comment): Promise<Comment> {
    if (!isLocalId(comment.id)) await axios.put(`${API_BASE}/comments/${comment.id}`, comment);
    return comment;
  },
  async deleteComment(id: string): Promise<void> {
    if (!isLocalId(id)) await axios.delete(`${API_BASE}/comments/${id}`);
  },

  // ALBUMS (100)
  async getAlbums(): Promise<Album[]> {
    const response = await axios.get<any[]>(`${API_BASE}/albums`);
    return response.data.map((item) => ({ ...item, id: String(item.id) }));
  },
  async createAlbum(album: Omit<Album, "id">): Promise<Album> {
    await axios.post<any>(`${API_BASE}/albums`, album);
    return { ...album, id: newClientId("album") };
  },
  async updateAlbum(album: Album): Promise<Album> {
    if (!isLocalId(album.id)) await axios.put(`${API_BASE}/albums/${album.id}`, album);
    return album;
  },
  async deleteAlbum(id: string): Promise<void> {
    if (!isLocalId(id)) await axios.delete(`${API_BASE}/albums/${id}`);
  },

  // PHOTOS (5000)
  async getPhotos(): Promise<Photo[]> {
    const response = await axios.get<any[]>(`${API_BASE}/photos`);
    return response.data.map((item) => ({ ...item, id: String(item.id) }));
  },
  async createPhoto(photo: Omit<Photo, "id">): Promise<Photo> {
    await axios.post<any>(`${API_BASE}/photos`, photo);
    return { ...photo, id: newClientId("photo") };
  },
  async updatePhoto(photo: Photo): Promise<Photo> {
    if (!isLocalId(photo.id)) await axios.put(`${API_BASE}/photos/${photo.id}`, photo);
    return photo;
  },
  async deletePhoto(id: string): Promise<void> {
    if (!isLocalId(id)) await axios.delete(`${API_BASE}/photos/${id}`);
  },

  // TODOS (200)
  async getTodos(): Promise<Todo[]> {
    const response = await axios.get<any[]>(`${API_BASE}/todos`);
    return response.data.map((item) => ({ ...item, id: String(item.id) }));
  },
  async createTodo(todo: Omit<Todo, "id">): Promise<Todo> {
    await axios.post<any>(`${API_BASE}/todos`, todo);
    return { ...todo, id: newClientId("todo") };
  },
  async updateTodo(todo: Todo): Promise<Todo> {
    if (!isLocalId(todo.id)) await axios.put(`${API_BASE}/todos/${todo.id}`, todo);
    return todo;
  },
  async deleteTodo(id: string): Promise<void> {
    if (!isLocalId(id)) await axios.delete(`${API_BASE}/todos/${id}`);
  },
};
