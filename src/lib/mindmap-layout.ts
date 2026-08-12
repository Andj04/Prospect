import type { Company, Projet } from "@/lib/types";

export type Occurrence = {
  /** Unique per (entreprise, projet) pair — this is what makes duplication work. */
  key: string;
  company: Company;
  projetId: string;
};

// One occurrence per (non-exclue entreprise, projet) link — a company linked
// to 3 projects yields 3 distinct occurrences, each becoming its own node.
export function buildOccurrences(companies: Company[], projets: Projet[]): Occurrence[] {
  const projetIds = new Set(projets.map((p) => p.id));
  const occurrences: Occurrence[] = [];
  for (const company of companies) {
    if (company.exclue) continue;
    for (const projetId of company.projets) {
      if (!projetIds.has(projetId)) continue;
      occurrences.push({ key: `${company.id}::${projetId}`, company, projetId });
    }
  }
  return occurrences;
}

const CLUSTER_WIDTH = 900;
const CLUSTER_HEIGHT = 700;
const PROJET_NODE_WIDTH = 200;
const ENTREPRISE_COLS_PER_CLUSTER = 4;
const ENTREPRISE_SPACING_X = 190;
const ENTREPRISE_SPACING_Y = 120;
const ENTREPRISE_ROW_START_Y = 170;

export type LayoutPositions = {
  projetPositions: Map<string, { x: number; y: number }>;
  entreprisePositions: Map<string, { x: number; y: number }>;
};

// Deterministic grid-of-clusters layout: projects arranged in a grid, each
// project's companies arranged in a wrapped sub-grid centered under it — no
// general graph-layout library needed for this "grouped by project" shape.
export function computeDefaultLayout(
  projets: Projet[],
  occurrences: Occurrence[],
): LayoutPositions {
  const byProjet = new Map<string, Occurrence[]>();
  for (const occ of occurrences) {
    const list = byProjet.get(occ.projetId) ?? [];
    list.push(occ);
    byProjet.set(occ.projetId, list);
  }

  const cols = Math.max(1, Math.ceil(Math.sqrt(projets.length)));
  const projetPositions = new Map<string, { x: number; y: number }>();
  const entreprisePositions = new Map<string, { x: number; y: number }>();

  projets.forEach((projet, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    const clusterX = col * CLUSTER_WIDTH;
    const clusterY = row * CLUSTER_HEIGHT;
    const centerX = clusterX + CLUSTER_WIDTH / 2;

    projetPositions.set(projet.id, { x: centerX - PROJET_NODE_WIDTH / 2, y: clusterY });

    const companies = byProjet.get(projet.id) ?? [];
    const entCols = Math.max(1, Math.min(ENTREPRISE_COLS_PER_CLUSTER, companies.length));
    const gridWidth = (entCols - 1) * ENTREPRISE_SPACING_X;
    const startX = centerX - gridWidth / 2;

    companies.forEach((occ, i) => {
      const c = i % entCols;
      const r = Math.floor(i / entCols);
      entreprisePositions.set(occ.key, {
        x: startX + c * ENTREPRISE_SPACING_X,
        y: clusterY + ENTREPRISE_ROW_START_Y + r * ENTREPRISE_SPACING_Y,
      });
    });
  });

  return { projetPositions, entreprisePositions };
}
