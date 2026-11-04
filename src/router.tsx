import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // Le temps réel (voir lib/realtime.ts) invalide déjà ces requêtes dès qu'une
  // donnée change en base. Une durée de fraîcheur généreuse évite donc de
  // recharger à chaque changement de page sans rien perdre en réactivité :
  // 1 min pour ce qui bouge souvent, 10 min pour les référentiels.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 30 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Précharge le code d'une page dès que le lien est survolé : le clic n'attend plus le téléchargement.
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
  });

  return router;
};
