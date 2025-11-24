import axios from "axios";
import type { User } from "./fakeData";

const API_BASE = "https://jsonplaceholder.typicode.com";

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

// Transform JSONPlaceholder user to our User type
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
  async getUsers(): Promise<User[]> {
    const response = await axios.get<JSONPlaceholderUser[]>(`${API_BASE}/users`);
    return response.data.map(transformUser);
  },

  async createUser(user: Omit<User, "id">): Promise<User> {
    // JSONPlaceholder doesn't actually create, but simulates it
    const response = await axios.post<JSONPlaceholderUser>(`${API_BASE}/users`, {
      name: user.name,
      email: user.email,
      username: user.email.split("@")[0],
    });

    // Return the user with a generated ID
    return {
      ...user,
      id: String(response.data.id || Date.now()),
    };
  },

  async updateUser(user: User): Promise<User> {
    // JSONPlaceholder doesn't actually update, but simulates it
    await axios.put<JSONPlaceholderUser>(`${API_BASE}/users/${user.id}`, {
      name: user.name,
      email: user.email,
      username: user.email.split("@")[0],
    });

    return user;
  },

  async deleteUser(userId: string): Promise<void> {
    // JSONPlaceholder doesn't actually delete, but simulates it
    await axios.delete(`${API_BASE}/users/${userId}`);
  },
};
