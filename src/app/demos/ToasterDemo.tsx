import { toast } from "../../utils/toast";

export function ToasterDemo() {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Toaster Demo</h2>
      <p className="mb-4 text-muted">
        Click the buttons below to trigger different toast notifications.
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => toast.success("Success! Operation completed.")}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          Success Toast
        </button>

        <button
          onClick={() => toast.error("Error! Something went wrong.")}
          className="px-4 py-2 bg-danger text-white rounded-md hover:bg-danger transition-colors"
        >
          Error Toast
        </button>

        <button
          onClick={() => {
            const id = toast.loading("Loading...");
            setTimeout(() => {
              toast.settleSuccess(id, "Done! Data loaded successfully.");
            }, 2000);
          }}
          className="px-4 py-2 bg-accent text-white rounded-md hover:bg-accent-hover transition-colors"
        >
          Loading → Success
        </button>

        <button
          onClick={() => {
            const id = toast.loading("Processing...");
            setTimeout(() => {
              toast.settleError(id, "Failed! Could not process.");
            }, 2000);
          }}
          className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors"
        >
          Loading → Error
        </button>
      </div>
    </div>
  );
}
