import { useEffect, useState, useCallback, useMemo } from "react";
import { DataGrid } from "../../components/datagrid/DataGrid";
import { FAKE_USERS } from "./mocks/fakeData";
import {
  mockApi,
} from "./mocks/mockApi";
import { z } from "zod";
import { toast } from "../../utils/toast";
import { ApiError } from "../../api/errors";
import type { WithMeta } from "../../components/datagrid/types/column";
import {
  AlertTriangle,
  RefreshCw,
  Database,
  Layout,
  Layers,
  Sparkles,
  Inbox,
  FileText,
  MessageSquare,
  Folder,
  Image as ImageIcon,
  CheckSquare,
  Users as UsersIcon,
} from "lucide-react";

// Resource types
type ResourceType = "users" | "posts" | "comments" | "albums" | "photos" | "todos";
type DataSource = "mock-data" | "mock-api";

// Schemas
const userSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z.string().min(2, "Username must be at least 2 characters"),
  email: z.string().email("Must be a valid email address"),
  phone: z.string().min(6, "Phone number is too short"),
  website: z.string().min(3, "Website is too short"),
  role: z.string(),
  status: z.enum(["active", "inactive", "pending"]),
  lastLogin: z.string().optional().or(z.literal("")),
});

const postSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, "Title must be at least 3 characters"),
  body: z.string().min(5, "Body must be at least 5 characters"),
  userId: z.number().or(z.string().transform(Number)),
});

const commentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Must be a valid email"),
  body: z.string().min(5, "Comment body is required"),
  postId: z.number().or(z.string().transform(Number)),
});

const albumSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, "Title is required"),
  userId: z.number().or(z.string().transform(Number)),
});

const photoSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, "Title is required"),
  url: z.string().url("Must be a valid image URL"),
  thumbnailUrl: z.string().url("Must be a valid thumbnail URL"),
  albumId: z.number().or(z.string().transform(Number)),
});

const todoSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, "Title is required"),
  completed: z.boolean(),
  userId: z.number().or(z.string().transform(Number)),
});

export function DataGridDemo() {
  const [activeResource, setActiveResource] = useState<ResourceType>("users");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Config State
  const [containerType, setContainerType] = useState<"right" | "modal" | "inline">("right");
  const [dataSource, setDataSource] = useState<DataSource>("mock-api");
  const [formCols, setFormCols] = useState<1 | 2 | 3>(2);
  const [enableExpandable, setEnableExpandable] = useState(true);
  const [accordionMode, setAccordionMode] = useState(true);
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string | number>>(new Set());

  // Error Simulation Toggles
  const [simFetchError, setSimFetchError] = useState(false);
  const [simSaveError, setSimSaveError] = useState(false);
  const [simDeleteError, setSimDeleteError] = useState(false);
  const [simDelay, setSimDelay] = useState(300);

  // Load data based on selected resource & error simulation
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (simDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, simDelay));
      }

      if (simFetchError) {
        throw new ApiError(
          `Failed to load ${activeResource} from server (HTTP 500 Internal Server Error)`,
          { status: 500, code: "FETCH_FAILED" }
        );
      }

      if (dataSource === "mock-data" && activeResource === "users") {
        setData([...FAKE_USERS]);
      } else {
        let result: any[] = [];
        if (activeResource === "users") result = await mockApi.getUsers();
        else if (activeResource === "posts") result = await mockApi.getPosts();
        else if (activeResource === "comments") result = await mockApi.getComments();
        else if (activeResource === "albums") result = await mockApi.getAlbums();
        else if (activeResource === "photos") result = await mockApi.getPhotos();
        else if (activeResource === "todos") result = await mockApi.getTodos();
        setData(result);
      }
    } catch (err: any) {
      const msg = err?.message || `Failed to load ${activeResource}`;
      setError(msg);
      toast.error(msg);
    } finally {
      // Expanded ids point at rows from the previous resource; clear them here
      // (after the await) rather than synchronously inside the effect below.
      setExpandedRowIds(new Set());
      setLoading(false);
    }
  }, [activeResource, dataSource, simFetchError, simDelay]);

  useEffect(() => {
    // loadData() sets `loading`/`error` synchronously before its first await —
    // the standard hand-rolled fetch pattern the compiler rule warns about. The
    // real fix is to drive this demo with the React Query provider the sandbox
    // already mounts but never uses; until then, keep the pattern explicit.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const toggleExpanded = (id: string | number) => {
    setExpandedRowIds((prev) => {
      if (accordionMode) {
        if (prev.has(id)) return new Set();
        return new Set([id]);
      } else {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }
    });
  };

  // Columns per Resource
  const currentColumns = useMemo(() => {
    if (activeResource === "users") {
      return [
        {
          accessorKey: "name",
          header: "Name",
          meta: { editor: "text", required: true, formLayout: { order: 1 } },
        },
        {
          accessorKey: "username",
          header: "Username",
          meta: { editor: "text", required: true, formLayout: { order: 2 } },
        },
        {
          accessorKey: "email",
          header: "Email",
          meta: { editor: "text", required: true, formLayout: { order: 3 } },
        },
        {
          accessorKey: "role",
          header: "Role",
          cell: ({ getValue }: any) => {
            const val = getValue();
            const badgeClass =
              val === "Admin"
                ? "bg-purple-100 text-purple-700 border-purple-200"
                : val === "Editor"
                  ? "bg-blue-100 text-blue-700 border-blue-200"
                  : "bg-gray-100 text-gray-700 border-gray-200";
            return (
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${badgeClass}`}>
                {val}
              </span>
            );
          },
          meta: {
            editor: "select",
            options: [
              { label: "Admin", value: "Admin" },
              { label: "User", value: "User" },
              { label: "Editor", value: "Editor" },
            ],
            formLayout: { order: 4 },
          },
        },
        {
          accessorKey: "status",
          header: "Status",
          cell: ({ getValue }: any) => {
            const val = getValue();
            const badgeClass =
              val === "active"
                ? "bg-green-100 text-green-700"
                : val === "inactive"
                  ? "bg-red-100 text-red-700"
                  : "bg-amber-100 text-amber-700";
            return (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${badgeClass}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${val === "active" ? "bg-green-500" : val === "inactive" ? "bg-red-500" : "bg-amber-500"}`} />
                {val}
              </span>
            );
          },
          meta: {
            editor: "select",
            options: [
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
              { label: "Pending", value: "pending" },
            ],
            formLayout: { order: 5 },
          },
        },
        {
          accessorKey: "phone",
          header: "Phone",
          meta: { editor: "text", hideOnMobile: true, formLayout: { order: 6 } },
        },
        {
          accessorKey: "website",
          header: "Website",
          meta: { editor: "text", hideOnMobile: true, formLayout: { order: 7 } },
        },
        {
          accessorKey: "lastLogin",
          header: "Last Login",
          cell: ({ getValue }: any) => {
            const value = getValue() as string;
            if (!value) return "—";
            const date = new Date(value);
            return isNaN(date.getTime())
              ? value
              : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
          },
          meta: { editor: "date", hideOnMobile: true, formLayout: { order: 8 } },
        },
      ] as WithMeta<any>[];
    }

    if (activeResource === "posts") {
      return [
        {
          accessorKey: "id",
          header: "ID",
          meta: { formLayout: { order: 1 } },
        },
        {
          accessorKey: "title",
          header: "Title",
          meta: { editor: "text", required: true, formLayout: { order: 2, colSpan: "full" } },
        },
        {
          accessorKey: "body",
          header: "Body Content",
          meta: { editor: "textarea", required: true, formLayout: { order: 3, colSpan: "full" } },
        },
        {
          accessorKey: "userId",
          header: "User ID",
          meta: { editor: "number", formLayout: { order: 4 } },
        },
      ] as WithMeta<any>[];
    }

    if (activeResource === "comments") {
      return [
        { accessorKey: "id", header: "ID" },
        {
          accessorKey: "name",
          header: "Name",
          meta: { editor: "text", required: true, formLayout: { order: 1 } },
        },
        {
          accessorKey: "email",
          header: "Email",
          meta: { editor: "text", required: true, formLayout: { order: 2 } },
        },
        {
          accessorKey: "body",
          header: "Comment",
          meta: { editor: "textarea", required: true, formLayout: { order: 3, colSpan: "full" } },
        },
        {
          accessorKey: "postId",
          header: "Post ID",
          meta: { editor: "number", formLayout: { order: 4 } },
        },
      ] as WithMeta<any>[];
    }

    if (activeResource === "albums") {
      return [
        { accessorKey: "id", header: "ID" },
        {
          accessorKey: "title",
          header: "Album Title",
          meta: { editor: "text", required: true, formLayout: { order: 1, colSpan: "full" } },
        },
        {
          accessorKey: "userId",
          header: "User ID",
          meta: { editor: "number", formLayout: { order: 2 } },
        },
      ] as WithMeta<any>[];
    }

    if (activeResource === "photos") {
      return [
        { accessorKey: "id", header: "ID" },
        {
          accessorKey: "thumbnailUrl",
          header: "Thumbnail",
          cell: ({ getValue }: any) => (
            <img
              src={getValue()}
              alt="photo"
              className="h-9 w-9 rounded object-cover border border-gray-200"
              loading="lazy"
            />
          ),
          meta: { editor: "text", formLayout: { order: 1 } },
        },
        {
          accessorKey: "title",
          header: "Photo Title",
          meta: { editor: "text", required: true, formLayout: { order: 2 } },
        },
        {
          accessorKey: "url",
          header: "Full Image URL",
          meta: { editor: "text", hideOnMobile: true, formLayout: { order: 3 } },
        },
        {
          accessorKey: "albumId",
          header: "Album ID",
          meta: { editor: "number", formLayout: { order: 4 } },
        },
      ] as WithMeta<any>[];
    }

    // Todos (200)
    return [
      { accessorKey: "id", header: "ID" },
      {
        accessorKey: "title",
        header: "Todo Task",
        meta: { editor: "text", required: true, formLayout: { order: 1 } },
      },
      {
        accessorKey: "completed",
        header: "Status",
        cell: ({ getValue }: any) => {
          const done = Boolean(getValue());
          return (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${done ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${done ? "bg-emerald-600" : "bg-amber-600"}`} />
              {done ? "Completed" : "Pending"}
            </span>
          );
        },
        meta: { editor: "switch", label: "Task Completed", formLayout: { order: 2 } },
      },
      {
        accessorKey: "userId",
        header: "User ID",
        meta: { editor: "number", formLayout: { order: 3 } },
      },
    ] as WithMeta<any>[];
  }, [activeResource]);

  // Current Zod Schema
  const currentSchema = useMemo(() => {
    if (activeResource === "posts") return postSchema;
    if (activeResource === "comments") return commentSchema;
    if (activeResource === "albums") return albumSchema;
    if (activeResource === "photos") return photoSchema;
    if (activeResource === "todos") return todoSchema;
    return userSchema;
  }, [activeResource]);

  // Persist Handler
  const handlePersist = async (mode: "create" | "edit", itemData: any, prev?: any) => {
    if (simDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, simDelay));
    }

    if (simSaveError) {
      throw new ApiError(
        `Server failed to save ${activeResource} item (HTTP 500: Database lock timeout)`,
        { status: 500, code: "SAVE_FAILED" }
      );
    }

    let savedItem: any;
    if (activeResource === "users") {
      if (mode === "create") savedItem = await mockApi.createUser(itemData);
      else savedItem = await mockApi.updateUser({ ...prev, ...itemData });
    } else if (activeResource === "posts") {
      if (mode === "create") savedItem = await mockApi.createPost(itemData);
      else savedItem = await mockApi.updatePost({ ...prev, ...itemData });
    } else if (activeResource === "comments") {
      if (mode === "create") savedItem = await mockApi.createComment(itemData);
      else savedItem = await mockApi.updateComment({ ...prev, ...itemData });
    } else if (activeResource === "albums") {
      if (mode === "create") savedItem = await mockApi.createAlbum(itemData);
      else savedItem = await mockApi.updateAlbum({ ...prev, ...itemData });
    } else if (activeResource === "photos") {
      if (mode === "create") savedItem = await mockApi.createPhoto(itemData);
      else savedItem = await mockApi.updatePhoto({ ...prev, ...itemData });
    } else {
      if (mode === "create") savedItem = await mockApi.createTodo(itemData);
      else savedItem = await mockApi.updateTodo({ ...prev, ...itemData });
    }

    if (mode === "create") {
      setData((prevData) => [savedItem, ...prevData]);
      toast.success(`New ${activeResource.slice(0, -1)} created!`);
    } else {
      setData((prevData) =>
        prevData.map((d) => (String(d.id) === String(savedItem.id) ? savedItem : d))
      );
      toast.success(`${activeResource.slice(0, -1)} updated!`);
    }
    return savedItem;
  };

  // Delete Handler
  const handleDelete = async (row: any) => {
    if (simDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, simDelay));
    }

    if (simDeleteError) {
      throw new ApiError(
        `Permission Denied: You do not have permission to delete this ${activeResource.slice(0, -1)} (HTTP 403)`,
        { status: 403, code: "DELETE_FORBIDDEN" }
      );
    }

    const id = String(row.id);
    if (activeResource === "users") await mockApi.deleteUser(id);
    else if (activeResource === "posts") await mockApi.deletePost(id);
    else if (activeResource === "comments") await mockApi.deleteComment(id);
    else if (activeResource === "albums") await mockApi.deleteAlbum(id);
    else if (activeResource === "photos") await mockApi.deletePhoto(id);
    else await mockApi.deleteTodo(id);

    setData((prev) => prev.filter((item) => String(item.id) !== id));
    toast.success(`Deleted ${activeResource.slice(0, -1)} #${id}`);
  };

  // Expanded Row Content
  const renderExpandedRow = (item: any) => (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-sm">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
        <span>Resource JSON Details ({activeResource})</span>
        <span>ID: #{item.id}</span>
      </div>
      <pre className="bg-slate-950 text-emerald-400 p-3 rounded-md text-xs font-mono overflow-x-auto">
        {JSON.stringify(item, null, 2)}
      </pre>
    </div>
  );

  const resourceConfig: {
    key: ResourceType;
    label: string;
    count: string;
    icon: any;
    color: string;
  }[] = [
      { key: "users", label: "Users", count: "10 items", icon: UsersIcon, color: "bg-blue-600 text-white" },
      { key: "posts", label: "Posts", count: "100 items", icon: FileText, color: "bg-indigo-600 text-white" },
      { key: "comments", label: "Comments", count: "500 items", icon: MessageSquare, color: "bg-purple-600 text-white" },
      { key: "albums", label: "Albums", count: "100 items", icon: Folder, color: "bg-amber-600 text-white" },
      { key: "photos", label: "Photos", count: "5,000 items (Virtual)", icon: ImageIcon, color: "bg-rose-600 text-white" },
      { key: "todos", label: "Todos", count: "200 items", icon: CheckSquare, color: "bg-emerald-600 text-white" },
    ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">
            JSONPlaceholder API & DataGrid Sandbox
          </h2>
        </div>
        <p className="text-gray-600 text-sm mt-1">
          Test virtual scrolling, pagination, form containers, and error handling across all JSONPlaceholder REST endpoints.
        </p>
      </div>

      {/* Resource Endpoint Selector */}
      {dataSource === "mock-api" && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-900 font-bold text-sm">
              <Database className="h-4 w-4 text-blue-600" />
              <span>Select Endpoint Dataset:</span>
            </div>
            <span className="text-xs text-gray-500 font-medium">
              Active: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-blue-600">/{activeResource}</code> ({data.length} items loaded)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {resourceConfig.map((res) => {
              const Icon = res.icon;
              const isActive = activeResource === res.key;
              return (
                <button
                  key={res.key}
                  onClick={() => setActiveResource(res.key)}
                  className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${isActive
                    ? "border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/50 shadow-xs"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/80 bg-white"
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`p-1.5 rounded-md ${isActive ? res.color : "bg-gray-100 text-gray-600"}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    {isActive && <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />}
                  </div>
                  <div>
                    <div className={`font-bold text-sm ${isActive ? "text-blue-900" : "text-gray-800"}`}>
                      {res.label}
                    </div>
                    <div className="text-[11px] text-gray-500 font-medium">
                      {res.count}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {/* Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Error Simulation */}
        <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span>Error Simulation Center</span>
          </div>

          <div className="space-y-2 text-xs">
            <label className="flex items-center justify-between cursor-pointer p-1.5 rounded hover:bg-amber-100/50">
              <span className="font-medium text-amber-900">Fetch Error (500)</span>
              <input
                type="checkbox"
                checked={simFetchError}
                onChange={(e) => setSimFetchError(e.target.checked)}
                className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer p-1.5 rounded hover:bg-amber-100/50">
              <span className="font-medium text-amber-900">Save Error (500)</span>
              <input
                type="checkbox"
                checked={simSaveError}
                onChange={(e) => setSimSaveError(e.target.checked)}
                className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer p-1.5 rounded hover:bg-amber-100/50">
              <span className="font-medium text-amber-900">Delete Error (403)</span>
              <input
                type="checkbox"
                checked={simDeleteError}
                onChange={(e) => setSimDeleteError(e.target.checked)}
                className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Card 2: Edit Container & Layout */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-gray-800 font-semibold text-sm">
            <Layout className="h-4 w-4 text-blue-600" />
            <span>Form Container & Grid</span>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="block text-gray-500 font-medium mb-1">Edit Container:</span>
              <div className="grid grid-cols-3 gap-1">
                {(["right", "modal", "inline"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setContainerType(type)}
                    className={`py-1 px-2 rounded text-center capitalize font-medium cursor-pointer transition-colors ${containerType === type ? "bg-blue-600 text-white shadow-xs" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-gray-500 font-medium mb-1">Form Columns:</span>
              <div className="grid grid-cols-3 gap-1">
                {([1, 2, 3] as const).map((num) => (
                  <button
                    key={num}
                    onClick={() => setFormCols(num)}
                    className={`py-1 px-2 rounded text-center font-medium cursor-pointer transition-colors ${formCols === num ? "bg-blue-600 text-white shadow-xs" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                  >
                    {num} Col
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Data Source & Latency */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-gray-800 font-semibold text-sm">
            <Database className="h-4 w-4 text-emerald-600" />
            <span>Data Provider & Delay</span>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <span className="block text-gray-500 font-medium mb-1">Provider:</span>
              <div className="grid grid-cols-2 gap-1">
                <button
                  onClick={() => setDataSource("mock-data")}
                  disabled={activeResource !== "users"}
                  className={`py-1 px-2 rounded font-medium cursor-pointer transition-colors ${dataSource === "mock-data" ? "bg-emerald-600 text-white shadow-xs" : "bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                    }`}
                >
                  Local Mock
                </button>
                <button
                  onClick={() => setDataSource("mock-api")}
                  className={`py-1 px-2 rounded font-medium cursor-pointer transition-colors ${dataSource === "mock-api" ? "bg-emerald-600 text-white shadow-xs" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                >
                  HTTP API
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-gray-500 font-medium mb-1">
                <span>Latency:</span>
                <span className="text-gray-900 font-bold">{simDelay}ms</span>
              </div>
              <input
                type="range"
                min="0"
                max="2000"
                step="250"
                value={simDelay}
                onChange={(e) => setSimDelay(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            </div>
          </div>
        </div>

        {/* Card 4: Quick Actions & Reset */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-gray-800 font-semibold text-sm">
            <Layers className="h-4 w-4 text-purple-600" />
            <span>Quick Actions</span>
          </div>

          <div className="space-y-2 text-xs">
            <button
              onClick={loadData}
              className="w-full py-1 px-3 rounded bg-slate-800 hover:bg-slate-900 text-white font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Reload Data
            </button>

            <button
              onClick={() => setData([])}
              className="w-full py-1 px-3 rounded border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Inbox className="h-3.5 w-3.5 text-gray-400" /> Clear Data (Empty State)
            </button>

            <label className="flex items-center justify-between cursor-pointer pt-0.5">
              <span className="font-medium text-gray-700">Expandable JSON:</span>
              <input
                type="checkbox"
                checked={enableExpandable}
                onChange={(e) => setEnableExpandable(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
            </label>

            {enableExpandable && (
              <label className="flex items-center justify-between cursor-pointer pt-0.5">
                <span className="font-medium text-gray-700">Single Accordion:</span>
                <input
                  type="checkbox"
                  checked={accordionMode}
                  onChange={(e) => {
                    setAccordionMode(e.target.checked);
                    setExpandedRowIds(new Set());
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Active Error Simulations Banner */}
      {(simFetchError || simSaveError || simDeleteError) && (
        <div className="bg-amber-100 border-l-4 border-amber-500 p-3 rounded-r-lg text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>
              <strong>Active Error Simulations:</strong>{" "}
              {[
                simFetchError && "Fetch Error (500)",
                simSaveError && "Save Error (500)",
                simDeleteError && "Delete Error (403)",
              ]
                .filter(Boolean)
                .join(", ")}
            </span>
          </div>
          <button
            onClick={() => {
              setSimFetchError(false);
              setSimSaveError(false);
              setSimDeleteError(false);
            }}
            className="text-amber-700 underline font-medium hover:text-amber-900 cursor-pointer"
          >
            Clear All Simulations
          </button>
        </div>
      )}

      {/* DataGrid Instance */}
      <DataGrid
        key={activeResource}
        title={`${activeResource.toUpperCase()} Dataset (${data.length} items)`}
        columns={currentColumns}
        zodSchema={currentSchema}
        initialData={data}
        isLoading={loading}
        error={error}
        onRetry={loadData}
        idAccessor={(row) => row.id}
        editContainer={containerType}
        onPersist={handlePersist}
        onDelete={handleDelete}
        formLayout={{
          columns: formCols,
          gap: "gap-4",
        }}
        renderExpandedRow={enableExpandable ? renderExpandedRow : undefined}
        expandedRowIds={enableExpandable ? expandedRowIds : undefined}
        onRowClick={enableExpandable ? (row) => toggleExpanded(row.id) : undefined}
      />
    </div>
  );
}
