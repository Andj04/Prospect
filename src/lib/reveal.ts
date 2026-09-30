import type { CSSProperties } from "react";

// Apparition en cascade : chaque élément d'une liste arrive avec un léger
// décalage. Purement décoratif — l'élément est visible même sans animation.
export function reveal(index: number): { className: string; style: CSSProperties } {
  return {
    className:
      "animate-in fade-in slide-in-from-bottom-2 duration-500 [animation-fill-mode:both] motion-reduce:animate-none",
    style: { animationDelay: `${Math.min(index, 12) * 45}ms` },
  };
}
