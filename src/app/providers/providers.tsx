import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type FC, type ReactNode, useState } from "react";
import { Toaster } from "sonner";

interface IProviders {
  readonly children: ReactNode;
}

export const Providers: FC<IProviders> = ({ children }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Mount once */}
      <Toaster position="top-right" richColors closeButton/>
    </QueryClientProvider>
  );
};
