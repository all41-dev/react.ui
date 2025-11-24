export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  website: string;
  role: string;
  status: 'active' | 'inactive' | 'pending';
  lastLogin: string;
}

export const FAKE_USERS: User[] = [
  { id: '1', name: 'Alice Johnson', username: 'alice.j', email: 'alice@example.com', phone: '555-0101', website: 'alice.dev', role: 'Admin', status: 'active', lastLogin: '2024-01-15T10:30:00Z' },
  { id: '2', name: 'Bob Smith', username: 'bobsmith', email: 'bob@example.com', phone: '555-0102', website: 'bobsmith.io', role: 'User', status: 'inactive', lastLogin: '2024-01-10T08:45:00Z' },
  { id: '3', name: 'Charlie Brown', username: 'charlie_b', email: 'charlie@example.com', phone: '555-0103', website: 'charlieb.com', role: 'Editor', status: 'active', lastLogin: '2024-01-16T14:20:00Z' },
  { id: '4', name: 'Diana Prince', username: 'dprince', email: 'diana@example.com', phone: '555-0104', website: 'diana.net', role: 'User', status: 'pending', lastLogin: '2024-01-12T09:00:00Z' },
  { id: '5', name: 'Evan Wright', username: 'evanw', email: 'evan@example.com', phone: '555-0105', website: 'evanwright.dev', role: 'Admin', status: 'active', lastLogin: '2024-01-17T11:15:00Z' },
  { id: '6', name: 'Fiona Green', username: 'fgreen', email: 'fiona@example.com', phone: '555-0106', website: 'fiona.tech', role: 'Editor', status: 'active', lastLogin: '2024-01-16T16:30:00Z' },
  { id: '7', name: 'George Harris', username: 'georgeH', email: 'george@example.com', phone: '555-0107', website: 'harris.dev', role: 'User', status: 'inactive', lastLogin: '2024-01-08T07:20:00Z' },
  { id: '8', name: 'Hannah Lee', username: 'hlee', email: 'hannah@example.com', phone: '555-0108', website: 'hannahlee.io', role: 'Editor', status: 'active', lastLogin: '2024-01-17T13:45:00Z' },
  { id: '9', name: 'Ian Martinez', username: 'ianm', email: 'ian@example.com', phone: '555-0109', website: 'ianmartinez.com', role: 'User', status: 'pending', lastLogin: '2024-01-14T10:10:00Z' },
  { id: '10', name: 'Julia Davis', username: 'jdavis', email: 'julia@example.com', phone: '555-0110', website: 'juliadavis.dev', role: 'Admin', status: 'active', lastLogin: '2024-01-17T15:00:00Z' },
  { id: '11', name: 'Kevin Taylor', username: 'ktaylor', email: 'kevin@example.com', phone: '555-0111', website: 'kevintaylor.net', role: 'User', status: 'inactive', lastLogin: '2024-01-09T12:30:00Z' },
  { id: '12', name: 'Laura Wilson', username: 'lwilson', email: 'laura@example.com', phone: '555-0112', website: 'laurawilson.io', role: 'Editor', status: 'active', lastLogin: '2024-01-17T09:15:00Z' },
];

export const getUsers = async (): Promise<User[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(FAKE_USERS);
    }, 800);
  });
};
