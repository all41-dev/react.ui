import { useState } from "react";
import { LoadingScreen } from "../../components/LoadingScreen";

export const LoadingScreenDemo = () => {
  const [showDefault, setShowDefault] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  return (
    <div className="space-y-8 p-6">
      <div className="bg-surface-card rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Loading Screen Demo</h2>
        <p className="text-muted mb-6">
          Click the buttons below to preview different loading screen
          configurations. Click anywhere on the loading screen to close it (for
          demo purposes only).
        </p>

        <div className="flex gap-4">
          <button
            onClick={() => setShowDefault(true)}
            className="px-4 py-2 bg-surface-raised text-white rounded-md hover:bg-surface-inset transition-colors"
          >
            Show Default Loader
          </button>

          <button
            onClick={() => setShowCustom(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-500 transition-colors"
          >
            Show Custom Colors
          </button>
        </div>
      </div>

      {/* Default Loading Screen */}
      {showDefault && (
        <div onClick={() => setShowDefault(false)}>
          <LoadingScreen message="Default Loading..." />
        </div>
      )}

      {/* Custom Loading Screen */}
      {showCustom && (
        <div onClick={() => setShowCustom(false)}>
          <LoadingScreen
            message="Custom Colors..."
            gradientStart="from-indigo-500/30"
            gradientEnd="to-purple-500/30"
            spinnerColor="border-t-indigo-500"
            textColor="text-indigo-100"
            ringColor="border-indigo-900"
          />
        </div>
      )}
    </div>
  );
};
