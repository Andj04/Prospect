import type { CSSProperties } from "react";

// Apparition en cascade : chaque élément d'une liste arrive avec un léger
// décalage. Purement décoratif — l'élément est visible même sans animation.
export function reveal(index: number): { className: string; style: CSSProperties } {
  return {
    className:
      "animate-in fade-in duration-200 [animation-fill-mode:both] motion-reduce:animate-none",
    // Décalage plafonné à 3 éléments : au-delà, l'attente se voyait (jusqu'à 1 s).
    style: { animationDelay: `${Math.min(index, 3) * 25}ms` },
  };
}
