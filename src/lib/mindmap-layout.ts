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

const PROJET_NODE_WIDTH = 200;
const ENTREPRISE_SPACING_X = 200;
const ENTREPRISE_SPACING_Y = 90;
const ENTREPRISE_ROW_START_Y = 150;
const CLUSTER_GAP_X = 140;
const CLUSTER_GAP_Y = 120;
// Largeur cible d'une "étagère" de clusters avant de passer à la ligne suivante.
const SHELF_TARGET_WIDTH = 3200;
const MAX_ENTREPRISE_COLS = 6;

export type LayoutPositions = {
  projetPositions: Map<string, { x: number; y: number }>;
  entreprisePositions: Map<string, { x: number; y: number }>;
};

// Deterministic layout without overlaps: each project's companies form a
// wrapped grid sized to their count (so a project with 40 companies gets a
// wide, tall cluster instead of spilling onto its neighbours), and clusters
// are packed left-to-right in shelves that wrap at SHELF_TARGET_WIDTH.
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

  const projetPositions = new Map<string, { x: number; y: number }>();
  const entreprisePositions = new Map<string, { x: number; y: number }>();

  let cursorX = 0;
  let cursorY = 0;
  let shelfHeight = 0;

  for (const projet of projets) {
    const companies = byProjet.get(projet.id) ?? [];
    const entCols = Math.max(
      1,
      Math.min(MAX_ENTREPRISE_COLS, Math.ceil(Math.sqrt(companies.length * 1.6))),
    );
    const rows = Math.ceil(companies.length / entCols);
    const clusterWidth = Math.max(PROJET_NODE_WIDTH, entCols * ENTREPRISE_SPACING_X);
    const clusterHeight = ENTREPRISE_ROW_START_Y + Math.max(1, rows) * ENTREPRISE_SPACING_Y;

    if (cursorX > 0 && cursorX + clusterWidth > SHELF_TARGET_WIDTH) {
      cursorX = 0;
      cursorY += shelfHeight + CLUSTER_GAP_Y;
      shelfHeight = 0;
    }

    const centerX = cursorX + clusterWidth / 2;
    projetPositions.set(projet.id, { x: centerX - PROJET_NODE_WIDTH / 2, y: cursorY });

    const gridWidth = (entCols - 1) * ENTREPRISE_SPACING_X;
    const startX = centerX - gridWidth / 2 - 85; // 85 = demi-largeur d'un noeud entreprise
    companies.forEach((occ, i) => {
      entreprisePositions.set(occ.key, {
        x: startX + (i % entCols) * ENTREPRISE_SPACING_X,
        y: cursorY + ENTREPRISE_ROW_START_Y + Math.floor(i / entCols) * ENTREPRISE_SPACING_Y,
      });
    });

    cursorX += clusterWidth + CLUSTER_GAP_X;
    shelfHeight = Math.max(shelfHeight, clusterHeight);
  }

  return { projetPositions, entreprisePositions };
}
