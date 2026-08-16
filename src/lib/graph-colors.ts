// Palette qualitative fixe pour la vue Réseau — chaque projet Amal Biladi
// obtient une couleur stable (dérivée d'un hash de son id), indépendante de
// l'ordre ou du nombre de projets actifs à un instant donné.
const PALETTE = [
  "#2563EB", // bleu
  "#DC2626", // rouge
  "#D97706", // ambre
  "#059669", // émeraude
  "#7C3AED", // violet
  "#DB2777", // rose
  "#0891B2", // cyan
  "#65A30D", // lime
  "#EA580C", // orange
  "#4F46E5", // indigo
  "#0D9488", // teal
  "#C026D3", // fuchsia
];

export const GRAPH_NEUTRAL_COLOR = "#94A3B8"; // slate-400 — entreprise sans projet lié

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getProjectColor(projetId: string): string {
  return PALETTE[hashString(projetId) % PALETTE.length] as string;
}

export function getEntrepriseColors(projetIds: string[]): string[] {
  if (projetIds.length === 0) return [GRAPH_NEUTRAL_COLOR];
  return projetIds.map(getProjectColor);
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
