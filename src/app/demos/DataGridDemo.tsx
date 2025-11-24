import { useEffect, useState } from "react";
import { DataGrid } from "../../components/datagrid/DataGrid";
import { getUsers, type User } from "../../mocks/fakeData";
import { mockApi } from "../../mocks/mockApi";
import { z } from "zod";
import { toast } from "../../components/toaster/toast";

const userSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Name is too short"),
  username: z.string().min(2, "Username is too short"),
  email: z.string().email(),
  phone: z.string().min(6, "Phone number is too short"),
  website: z.string().min(3, "Website is too short"),
  role: z.string(),
  status: z.enum(["active", "inactive", "pending"]),
  lastLogin: z.string(),
});

type DataSource = "mock-data" | "mock-api";

export function DataGridDemo() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [containerType, setContainerType] = useState<"right" | "modal" | "inline">("right");
  const [dataSource, setDataSource] = useState<DataSource>("mock-data");

  // Load data based on selected source
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (dataSource === "mock-data") {
        const data = await getUsers();
        setUsers(data);
      } else {
        const data = await mockApi.getUsers();
        setUsers(data);
      }
    } catch (err) {
      setError("Failed to load users. Please check your connection.");
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dataSource]);

  const columns = [
    { accessorKey: "name", header: "Name", meta: { editor: "text" } },
    { accessorKey: "username", header: "Username", meta: { editor: "text" } },
    { accessorKey: "email", header: "Email", meta: { editor: "text" } },
    { accessorKey: "phone", header: "Phone", meta: { editor: "text" } },
    { accessorKey: "website", header: "Website", meta: { editor: "text" } },
    { 
      accessorKey: "role", 
      header: "Role", 
      meta: { 
        editor: "select", 
        options: [
          { label: "Admin", value: "Admin" }, 
          { label: "User", value: "User" }, 
          { label: "Editor", value: "Editor" }
        ] 
      } 
    },
    { 
      accessorKey: "status", 
      header: "Status", 
      meta: { 
        editor: "select", 
        options: [
          { label: "Active", value: "active" }, 
          { label: "Inactive", value: "inactive" }, 
          { label: "Pending", value: "pending" }
        ] 
      } 
    },
    { 
      accessorKey: "lastLogin", 
      header: "Last Login",
      cell: ({ getValue }: any) => {
        const value = getValue() as string;
        if (!value) return "";
        const date = new Date(value);
        return date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      },
      meta: { 
        editor: "datetime-local",
        format: (value: string) => {
          if (!value) return "";
          const date = new Date(value);
          return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });
        }
      } 
    },
  ] as any;

  const handlePersist = async (mode: "create" | "edit", data: any, prev?: User) => {
    try {
      if (dataSource === "mock-data") {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (mode === "create") {
          const newUser: User = {
            ...data,
            id: String(Date.now()),
          };
          setUsers(prev => [...prev, newUser]);
          toast.success("User created successfully!");
          return newUser;
        } else {
          const updatedUser = { ...prev, ...data } as User;
          setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
          toast.success("User updated successfully!");
          return updatedUser;
        }
      } else {
        if (mode === "create") {
          const newUser = await mockApi.createUser(data);
          setUsers(prev => [...prev, newUser]);
          toast.success("User created via API!");
          return newUser;
        } else {
          const updatedUser = { ...prev, ...data } as User;
          await mockApi.updateUser(updatedUser);
          setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
          toast.success("User updated via API!");
          return updatedUser;
        }
      }
    } catch (err) {
      toast.error("Operation failed. Please try again.");
      throw err;
    }
  };

  const handleDelete = async (row: User) => {
    try {
      if (dataSource === "mock-data") {
        await new Promise(resolve => setTimeout(resolve, 300));
        setUsers(prev => prev.filter(u => u.id !== row.id));
        toast.success("User deleted successfully!");
      } else {
        await mockApi.deleteUser(row.id);
        setUsers(prev => prev.filter(u => u.id !== row.id));
        toast.success("User deleted via API!");
      }
    } catch (err) {
      toast.error("Delete failed. Please try again.");
      throw err;
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">DataGrid Demo</h2>
        <p className="text-gray-600 mb-4">
          Test adding, editing, and deleting users with different edit container styles and data sources.
        </p>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Data Source:</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setDataSource("mock-data")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              dataSource === "mock-data"
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Mock Data (Local)
          </button>
          <button
            onClick={() => setDataSource("mock-api")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              dataSource === "mock-api"
                ? "bg-green-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Mock API (JSONPlaceholder)
          </button>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {dataSource === "mock-data" 
            ? "Using local fake data with simulated delays" 
            : "Using real HTTP calls to JSONPlaceholder API"}
        </p>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Edit Container Style:</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setContainerType("right")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              containerType === "right"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Right Panel
          </button>
          <button
            onClick={() => setContainerType("modal")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              containerType === "modal"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Modal
          </button>
          <button
            onClick={() => setContainerType("inline")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              containerType === "inline"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Inline Editor
          </button>
        </div>
      </div>

      {/* DataGrid */}
      <DataGrid
        title="Users"
        columns={columns}
        zodSchema={userSchema}
        initialData={users}
        isLoading={loading}
        error={error}
        onRetry={loadData}
        idAccessor={(row) => row.id}
        editContainer={containerType}
        onPersist={handlePersist}
        onDelete={handleDelete}
      />
    </div>
  );
}
