import { regionNomParCode } from "@/lib/ong-regions";
import {
  ODD_LABELS,
  PARTENAIRE_TYPES,
  STATUTS_ONG,
  TYPE_STRUCTURE_OPTIONS,
  type Ong,
  type OngPipelineItem,
  type Projet,
} from "@/lib/types";
import { echelleLabel, milieuLabel } from "@/lib/ong-utils";

// Les colonnes « qualité des données » ne sont jamais exportées.
export type OngColumnGroup =
  | "identite"
  | "activites"
  | "territoire"
  | "financement"
  | "reseau"
  | "amal"
  | "coordonnees"
  | "contacts"
  | "suivi";

type Ctx = { projets: Projet[]; pipeline: Map<string, OngPipelineItem> };
type Col = { header: string; value: (o: Ong, ctx: Ctx) => string | number };

const join = (xs: string[]) => xs.join(" ; ");
const oddText = (n: number) => `ODD ${n} — ${ODD_LABELS[n] ?? ""}`;
const partenaires = (o: Ong, type: string) =>
  join(o.partenaires.filter((p) => p.type === type).map((p) => p.nom));
const projetNom = (ctx: Ctx, id: string) => ctx.projets.find((p) => p.id === id)?.nom ?? id;

export const ONG_COLUMN_GROUPS: { id: OngColumnGroup; label: string; cols: Col[] }[] = [
  {
    id: "identite",
    label: "Identité",
    cols: [
      { header: "Nom", value: (o) => o.nom },
      { header: "Acronyme", value: (o) => o.acronyme ?? "" },
      {
        header: "Type de structure",
        value: (o) => TYPE_STRUCTURE_OPTIONS.find((t) => t.value === o.typeStructure)?.label ?? "",
      },
      { header: "Année de création", value: (o) => o.anneeCreation ?? "" },
      {
        header: "Utilité publique",
        value: (o) => (o.utilitePublique === null ? "" : o.utilitePublique ? "Oui" : "Non"),
      },
    ],
  },
  {
    id: "activites",
    label: "Ce qu'elle fait",
    cols: [
      { header: "Thématiques", value: (o) => join(o.thematiques) },
      { header: "ODD", value: (o) => join(o.odd.map(oddText)) },
      { header: "Activités principales", value: (o) => o.activitesPrincipales ?? "" },
      { header: "Publics cibles", value: (o) => o.publicsCibles ?? "" },
    ],
  },
  {
    id: "territoire",
    label: "Où elle agit",
    cols: [
      { header: "Siège", value: (o) => o.siege ?? "" },
      { header: "Échelle", value: (o) => join(o.echelle.map(echelleLabel)) },
      { header: "Milieu", value: (o) => join(o.milieu.map(milieuLabel)) },
      { header: "Régions", value: (o) => join(o.regions.map(regionNomParCode)) },
      { header: "Territoires précis", value: (o) => o.territoiresPrecis ?? "" },
    ],
  },
  {
    id: "financement",
    label: "Son financement",
    cols: [
      { header: "Comment elle se finance", value: (o) => o.accesFinancement ?? "" },
      { header: "Budget annuel", value: (o) => o.budgetAnnuel ?? "" },
      {
        header: "Sources",
        value: (o) =>
          join(o.financementSources.map((s) => (s === "diaspora" ? "Diaspora" : "International"))),
      },
      { header: "Bailleurs connus", value: (o) => partenaires(o, "bailleur") },
    ],
  },
  {
    id: "reseau",
    label: "Son réseau",
    cols: [
      ...PARTENAIRE_TYPES.filter((t) => t.value !== "bailleur").map((t) => ({
        header: t.label,
        value: (o: Ong) => partenaires(o, t.value),
      })),
      { header: "Comment elle noue ses partenariats", value: (o) => o.commentPartenariats ?? "" },
    ],
  },
  {
    id: "amal",
    label: "Lien avec Amal Biladi",
    cols: [
      { header: "Apports possibles", value: (o) => join(o.apports) },
      { header: "Atouts", value: (o) => o.atouts ?? "" },
      { header: "Pourquoi ce partenaire", value: (o) => o.pourquoiPartenaire ?? "" },
      { header: "Relation existante", value: (o) => o.relationAmalBiladi ?? "" },
      {
        header: "Projet principal",
        value: (o, c) => {
          const p = o.projets.find((l) => l.role === "principal");
          return p ? projetNom(c, p.projetId) : "";
        },
      },
      {
        header: "Projets liés",
        value: (o, c) =>
          join(o.projets.filter((l) => l.role === "lie").map((l) => projetNom(c, l.projetId))),
      },
      { header: "Transversale", value: (o) => (o.transversale ? "Oui" : "") },
    ],
  },
  {
    id: "coordonnees",
    label: "Coordonnées de la structure",
    cols: [
      { header: "Email", value: (o) => o.email ?? "" },
      { header: "Téléphone", value: (o) => o.telephone ?? "" },
      { header: "Site web", value: (o) => o.siteWeb ?? "" },
      {
        header: "Réseaux sociaux",
        value: (o) => join(o.reseaux.map((r) => `${r.type} : ${r.url}`)),
      },
    ],
  },
  {
    id: "contacts",
    label: "Personnes de contact",
    cols: [
      {
        header: "Contacts",
        value: (o) =>
          join(
            o.contacts.map((c) => (c.fonctionDetail ? `${c.nom} (${c.fonctionDetail})` : c.nom)),
          ),
      },
      { header: "Note", value: (o) => o.notes ?? "" },
    ],
  },
  {
    id: "suivi",
    label: "Suivi",
    cols: [
      {
        header: "Statut",
        value: (o, c) => {
          const s = c.pipeline.get(o.id)?.statut;
          return STATUTS_ONG.find((x) => x.value === s)?.label ?? "";
        },
      },
      { header: "Responsable", value: (o, c) => c.pipeline.get(o.id)?.responsable ?? "" },
      { header: "Dernier contact", value: (o, c) => c.pipeline.get(o.id)?.dernierContact ?? "" },
      { header: "Prochaine action", value: (o, c) => c.pipeline.get(o.id)?.prochaineAction ?? "" },
      { header: "Échéance", value: (o, c) => c.pipeline.get(o.id)?.prochaineActionDate ?? "" },
    ],
  },
];

export type OngExportOptions = {
  ongs: Ong[];
  groups: OngColumnGroup[];
  format: "xlsx" | "csv";
  projets: Projet[];
  pipeline: OngPipelineItem[];
  /** Excel seulement : une feuille par projet. */
  parProjet?: boolean;
};

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const sheetName = (nom: string) => nom.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Feuille";

export async function exportOng({
  ongs,
  groups,
  format,
  projets,
  pipeline,
  parProjet = false,
}: OngExportOptions) {
  const ctx: Ctx = { projets, pipeline: new Map(pipeline.map((p) => [p.ongId, p])) };
  const cols = ONG_COLUMN_GROUPS.filter((g) => groups.includes(g.id)).flatMap((g) => g.cols);
  const date = new Date().toISOString().slice(0, 10);
  const toRows = (list: Ong[]) => list.map((o) => cols.map((c) => c.value(o, ctx)));

  if (format === "csv") {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const body = [cols.map((c) => c.header), ...toRows(ongs)]
      .map((r) => r.map(esc).join(";"))
      .join("\r\n");
    download(new Blob(["\uFEFF" + body], { type: "text/csv;charset=utf-8" }), `ong-${date}.csv`);
    return;
  }

  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();

  const addSheet = (name: string, list: Ong[]) => {
    const rows = toRows(list);
    const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
    ws.addRow(cols.map((c) => c.header));
    rows.forEach((r) => ws.addRow(r));
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2F4F8F" } };
    ws.columns.forEach((c, i) => {
      const longest = Math.max(
        cols[i]!.header.length,
        ...rows.map((r) => String(r[i] ?? "").length),
      );
      c.width = Math.min(60, Math.max(12, longest + 2));
      c.alignment = { vertical: "top", wrapText: true };
    });
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
  };

  if (parProjet) {
    // Une feuille par projet ; une ONG liée à plusieurs projets figure dans chacune.
    for (const p of projets) {
      const list = ongs.filter((o) => o.projets.some((l) => l.projetId === p.id));
      if (list.length > 0) addSheet(sheetName(p.nom), list);
    }
    const sans = ongs.filter((o) => o.projets.length === 0);
    if (sans.length > 0) addSheet("Sans projet", sans);
  } else {
    addSheet("ONG", ongs);
  }

  if (groups.includes("contacts")) {
    const wc = wb.addWorksheet("Contacts", { views: [{ state: "frozen", ySplit: 1 }] });
    wc.addRow(["ONG", "Nom", "Fonction", "Email", "Téléphone"]);
    for (const o of ongs)
      for (const c of o.contacts)
        wc.addRow([o.nom, c.nom, c.fonctionDetail ?? "", c.email ?? "", c.telephone ?? ""]);
    wc.getRow(1).font = { bold: true };
    wc.columns.forEach((c) => (c.width = 30));
  }

  const buffer = await wb.xlsx.writeBuffer();
  download(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `ong-${date}.xlsx`,
  );
}
