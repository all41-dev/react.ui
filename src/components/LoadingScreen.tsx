import { type FC } from "react";

export interface LoadingScreenProps {
  message?: string;
  gradientStart?: string;
  gradientEnd?: string;
  spinnerColor?: string;
  textColor?: string;
  ringColor?: string;
}

export const LoadingScreen: FC<LoadingScreenProps> = ({
  message = "Loading...",
  gradientStart = "from-primary/20",
  gradientEnd = "to-info/20",
  spinnerColor = "border-t-primary",
  textColor = "text-zinc-100",
  ringColor = "border-zinc-800",
}) => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-zinc-950 text-white z-50">
      <div className="relative flex flex-col items-center">
        <div
          className={`absolute -inset-4 bg-linear-to-r ${gradientStart} ${gradientEnd} blur-xl rounded-full animate-pulse`}
        />

        <div className="relative w-16 h-16 mb-8">
          <div
            className={`absolute inset-0 border-4 ${ringColor} rounded-full`}
          />
          <div
            className={`absolute inset-0 border-4 ${spinnerColor} border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin`}
          />
          <div className="absolute inset-2 border-4 border-t-transparent border-r-info border-b-transparent border-l-transparent rounded-full animate-spin [animation-duration:1.5s] [animation-direction:reverse]" />
        </div>

        <div className="flex flex-col items-center gap-2 animate-slide-down">
          <h2 className={`text-xl font-medium tracking-wide ${textColor}`}>
            {message}
          </h2>
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
