import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // staleTime 0 (React Query's default) means every remount — e.g. switching
  // back to a tab you already visited — refetches over the network before
  // rendering, even though realtime sync (see lib/realtime.ts) already
  // invalidates these queries the moment another user actually changes
  // something. A short staleTime lets cached data render immediately.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000 } },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
