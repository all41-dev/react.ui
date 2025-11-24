# React UI Component Library

A modern, feature-rich React UI component library built with TypeScript, Vite, and Tailwind CSS. This library provides production-ready components including a powerful DataGrid with CRUD operations, Tooltips, and Toast notifications.

## Features

- **DataGrid** - Feature-complete data table with:
  - CRUD operations (Create, Read, Update, Delete)
  - Sorting, filtering, and pagination
  - Column resizing and visibility controls
  - Multiple edit containers (modal, drawer, inline)
  - Form validation with Zod
  - Mobile-responsive design
  - Virtual scrolling support
  - Custom cell renderers
  
- **Tooltip** - Accessible tooltip component
- **Toast** - Beautiful toast notifications powered by Sonner
- **Responsive** - Mobile-first design approach
- **Animations** - Smooth animations with Framer Motion
- **TypeScript** - Full type safety
- **Tailwind CSS** - Utility-first styling

## Quick Start

### Installation

```bash
npm install react.ui
# or
yarn add react.ui
# or
pnpm add react.ui
```

### Import Styles

Import the CSS in your main entry file:

```tsx
import 'react.ui/styles';
```

### Basic Usage

```tsx
import { DataGrid, toast } from 'react.ui';
import { z } from 'zod';

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

function App() {
  const columns = [
    { accessorKey: 'name', header: 'Name', meta: { editor: 'text' } },
    { accessorKey: 'email', header: 'Email', meta: { editor: 'text' } },
  ];

  const data = [
    { id: '1', name: 'John Doe', email: 'john@example.com' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
  ];

  return (
    <DataGrid
      title="Users"
      columns={columns}
      initialData={data}
      zodSchema={userSchema}
      idAccessor={(row) => row.id}
      onPersist={async (mode, data) => {
        // Handle create/update
        toast.success(`User ${mode === 'create' ? 'created' : 'updated'}!`);
      }}
      onDelete={async (row) => {
        // Handle delete
        toast.success('User deleted!');
      }}
    />
  );
}
```

## 📚 Components Documentation

### DataGrid

The DataGrid is a powerful and flexible table component with built-in CRUD functionality.

#### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | Yes | Grid title displayed in toolbar |
| `columns` | `ColumnDef[]` | Yes | Column definitions (TanStack Table format) |
| `initialData` | `T[]` | Yes | Initial data array |
| `zodSchema` | `ZodSchema` | Yes | Zod schema for form validation |
| `idAccessor` | `(row: T) => IdLike` | Yes | Function to extract row ID |
| `onPersist` | `(mode, data, prev?) => Promise<T>` | No | Create/update handler |
| `onDelete` | `(row: T) => Promise<void>` | No | Delete handler |
| `editContainer` | `'modal' \| 'right' \| 'inline'` | No | Edit UI style (default: 'modal') |
| `isLoading` | `boolean` | No | Show loading state |
| `error` | `string \| null` | No | Error message to display |
| `onRetry` | `() => void` | No | Retry callback for error state |

#### Column Configuration

Columns use TanStack Table's `ColumnDef` format with custom metadata:

```tsx
const columns = [
  {
    accessorKey: 'name',
    header: 'Name',
    meta: {
      editor: 'text', // Editor type
      required: true,
    }
  },
  {
    accessorKey: 'role',
    header: 'Role',
    meta: {
      editor: 'select',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'User', value: 'user' },
      ]
    }
  },
  {
    accessorKey: 'birthdate',
    header: 'Birth Date',
    meta: {
      editor: 'datetime-local',
    }
  },
];
```

#### Available Editors

- `text` - Text input
- `textarea` - Multi-line text input
- `number` - Number input
- `select` - Dropdown select (requires `options`)
- `switch` - Boolean toggle
- `datetime-local` - Date-time picker

#### Edit Container Types

1. **Modal** (`editContainer="modal"`)
   - Centered modal overlay
   - Best for focused editing

2. **Right Drawer** (`editContainer="right"`)
   - Slide-in panel from right
   - Great for side-by-side viewing

3. **Inline** (`editContainer="inline"`)
   - Expands below the row
   - Quick edits without navigation

#### Custom Cell Renderers

```tsx
{
  accessorKey: 'status',
  header: 'Status',
  cell: ({ getValue }: any) => {
    const status = getValue() as string;
    return (
      <span className={status === 'active' ? 'text-green-600' : 'text-gray-400'}>
        {status}
      </span>
    );
  },
  meta: { editor: 'select', options: [...] }
}
```

### Toast

Simple toast notifications using Sonner.

```tsx
import { toast } from 'react.ui';

// Success toast
toast.success('Operation completed!');

// Error toast
toast.error('Something went wrong!');

// Info toast
toast.info('Here is some information');

// Warning toast
toast.warning('Please be careful!');

// Custom toast
toast('Custom message', {
  description: 'Additional details here',
  duration: 5000,
});
```

### Tooltip

Accessible tooltip component.

```tsx
import { Tooltip } from 'react.ui';

<Tooltip content="Helpful information">
  <button>Hover me</button>
</Tooltip>
```

## 🛠️ Development

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd react.ui
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```
   
   The demo app will be available at `http://localhost:3333`

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with hot reload |
| `npm run build` | Build the demo application |
| `npm run build:lib` | Build the library for distribution |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build locally |

### Project Structure

```
react.ui/
├── src/
│   ├── components/        # Library components
│   │   ├── datagrid/     # DataGrid component
│   │   ├── tooltip/      # Tooltip component
│   │   └── toaster/      # Toast notifications
│   ├── app/              # Demo application
│   │   └── demos/        # Component demos
│   ├── mocks/            # Mock data for demos
│   ├── styles/           # Global styles
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   └── index.ts          # Library entry point
├── dist/                 # Build output
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript config (dev)
└── tsconfig.build.json   # TypeScript config (lib build)
```

## 📦 Building the Library

### Build for Distribution

```bash
npm run build:lib
```

This command:
1. Compiles TypeScript to declarations (`dist/index.d.ts`)
2. Bundles the library with Vite (ES and CommonJS formats)
3. Outputs to `dist/` directory

### Build Artifacts

- `dist/react-ui.js` - ES module build
- `dist/react-ui.cjs` - CommonJS build
- `dist/react.ui.css` - Bundled styles
- `dist/index.d.ts` - TypeScript declarations

## 🚢 Publishing Workflow

### Version Management

This library uses npm's built-in versioning with automated workflows.

#### Publish a New Version

1. **Update version and publish**
   ```bash
   npm version patch   # 0.0.0 -> 0.0.1
   npm version minor   # 0.0.0 -> 0.1.0
   npm version major   # 0.0.0 -> 1.0.0
   ```

2. **What happens automatically:**
   - `preversion`: Builds the library in production mode
   - Version number is updated in `package.json`
   - Git commit and tag are created
   - `postversion`: Pushes commits, tags, and publishes to npm

#### Manual Publish

If you need more control:

```bash
# Build the library
npm run build:lib --prod

# Update version manually in package.json
# Then commit and publish
git add .
git commit -m "chore: release v0.1.0"
git tag v0.1.0
git push && git push --tags
npm publish
```

### First-Time Publish Setup

Before your first publish:

1. **Login to npm**
   ```bash
   npm login
   ```

2. **Update package.json**
   ```json
   {
     "name": "@your-org/react-ui",
     "version": "0.1.0",
     "repository": {
       "type": "git",
       "url": "https://github.com/your-org/react-ui"
     },
     "author": "Your Name",
     "license": "MIT"
   }
   ```

3. **Publish**
   ```bash
   npm version minor
   ```

## 🧪 Testing the Library Locally

Before publishing, test the library in another project:

1. **Build the library**
   ```bash
   npm run build:lib
   ```

2. **Link locally**
   ```bash
   npm link
   ```

3. **In your test project**
   ```bash
   npm link react.ui
   ```

4. **Or use direct path**
   ```json
   {
     "dependencies": {
       "react.ui": "file:../react.ui"
     }
   }
   ```

## 🎨 Demo Application

The demo app showcases all components with interactive examples:

- **DataGrid Demo** - Comprehensive DataGrid features
  - Multiple edit containers
  - CRUD operations
  - Form validation
  - Pagination and filtering
  - Custom cell renderers

Access at `http://localhost:3333` when running `npm run dev`

## 🤝 Contributing

### Development Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/new-component
   ```

2. **Make your changes**
   - Add components in `src/components/`
   - Export from `src/index.ts`
   - Add demo in `src/app/demos/`

3. **Test thoroughly**
   - Test in demo app
   - Test library build
   - Verify TypeScript types

4. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: add new component"
   git push origin feature/new-component
   ```

### Code Style

- Use TypeScript for type safety
- Follow existing component patterns
- Keep components modular and reusable
- Document props with JSDoc comments
- Use Tailwind CSS for styling

## 📝 License

MIT

## 🙋‍♂️ Support

For questions or issues, please open an issue on the repository.