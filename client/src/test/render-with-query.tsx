import type { ReactElement } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";

type RenderWithQueryOptions = {
  queryClient?: QueryClient;
};

export function renderWithQuery(ui: ReactElement, options: RenderWithQueryOptions = {}) {
  const queryClient =
    options.queryClient ??
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}
