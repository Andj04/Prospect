// Export de la campagne de contact : une ligne par contact, colonnes et
// organisation au choix (voir ProspectionExportDialog).
import {
  categorieLabel,
  etapeLabel,
  reponseLabel,
  TYPE_CONTACT_LABEL,
  typeContact,
  type ContactCampagne,
  type ProspectionItem,
} from "@/lib/prospection";
import { STATUTS, type PipelineItem } from "@/lib/types";

/** Une ligne exportée : le contact, son entreprise et, s'il en a un, son suivi. */
export type LigneExport = {
  contact: ContactCampagne;
  suivi?: ProspectionItem;
  pipeline?: PipelineItem;
};

export type ColonnesExport =
  "entreprise" | "contact" | "coordonnees" | "suivi" | "reponse" | "dates" | "notes";

type Col = { header: string; value: (l: LigneExport) => string };

const fr = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : "");
const PRIORITE: Record<string, string> = { haute: "Haute", moyenne: "Moyenne", basse: "Basse" };

export const COLONNES_EXPORT: { id: ColonnesExport; label: string; cols: Col[] }[] = [
  {
    id: "entreprise",
    label: "Entreprise",
    cols: [
      { header: "Entreprise", value: (l) => l.contact.entrepriseNom },
      { header: "Priorité", value: (l) => PRIORITE[l.pipeline?.priorite ?? ""] ?? "" },
      {
        header: "Statut",
        value: (l) => STATUTS.find((s) => s.value === l.pipeline?.statut)?.label ?? "",
      },
      { header: "Canaux génériques", value: (l) => l.contact.entrepriseGenerique },
    ],
  },
  {
    id: "contact",
    label: "Contact",
    cols: [
      { header: "Nom", value: (l) => l.contact.nom },
      { header: "Type", value: (l) => TYPE_CONTACT_LABEL[typeContact(l.contact)] },
      { header: "Poste", value: (l) => l.contact.poste },
      {
        header: "Catégorie",
        value: (l) => (l.contact.categoriePoste ? categorieLabel(l.contact.categoriePoste) : ""),
      },
      { header: "Remarque", value: (l) => l.contact.remarque },
    ],
  },
  {
    id: "coordonnees",
    label: "Coordonnées (LinkedIn, e-mail, téléphone)",
    cols: [
      { header: "LinkedIn", value: (l) => l.contact.linkedin ?? "" },
      { header: "E-mail", value: (l) => l.contact.email ?? "" },
      { header: "Téléphone", value: (l) => l.contact.telephone ?? "" },
    ],
  },
  {
    id: "suivi",
    label: "Suivi (responsable, étape, pause)",
    cols: [
      { header: "Responsable", value: (l) => l.contact.responsable },
      { header: "Étape", value: (l) => (l.suivi ? etapeLabel(l.suivi.etape) : "Hors campagne") },
      { header: "En pause", value: (l) => (l.suivi?.enPause ? "Oui" : "") },
      { header: "Motif de pause", value: (l) => l.suivi?.pauseMotif ?? "" },
    ],
  },
  {
    id: "reponse",
    label: "Réponse",
    cols: [
      { header: "Réponse", value: (l) => (l.suivi?.reponse ? reponseLabel(l.suivi.reponse) : "") },
      { header: "Détail de la réponse", value: (l) => l.suivi?.reponseNote ?? "" },
      { header: "Date de réponse", value: (l) => fr(l.suivi?.dates.reponse) },
    ],
  },
  {
    id: "dates",
    label: "Dates des étapes",
    cols: [
      { header: "Invitation envoyée", value: (l) => fr(l.suivi?.dates.invitation) },
      { header: "Invitation acceptée", value: (l) => fr(l.suivi?.dates.acceptee) },
      { header: "Message envoyé", value: (l) => fr(l.suivi?.dates.message) },
      { header: "1re relance", value: (l) => fr(l.suivi?.dates.relance1) },
      { header: "2e relance", value: (l) => fr(l.suivi?.dates.relance2) },
      { header: "Relance finale", value: (l) => fr(l.suivi?.dates.relanceFinale) },
    ],
  },
  {
    id: "notes",
    label: "Notes",
    cols: [{ header: "Notes", value: (l) => l.suivi?.notes ?? "" }],
  },
];

/** Excel : tout sur une feuille, ou une feuille par responsable, étape ou priorité. */
export type Feuilles = "une" | "responsable" | "etape" | "priorite";

export const FEUILLES: { value: Feuilles; label: string }[] = [
  { value: "une", label: "Une seule feuille" },
  { value: "responsable", label: "Une feuille par responsable" },
  { value: "etape", label: "Une feuille par étape" },
  { value: "priorite", label: "Une feuille par priorité d'entreprise" },
];

function cleFeuille(l: LigneExport, feuilles: Feuilles): string {
  switch (feuilles) {
    case "responsable":
      return l.contact.responsable || "Non assigné";
    case "etape":
      return l.suivi ? etapeLabel(l.suivi.etape) : "Hors campagne";
    case "priorite":
      return PRIORITE[l.pipeline?.priorite ?? ""] ?? "Sans priorité";
    default:
      return "Contacts";
  }
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const sheetName = (nom: string) => nom.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Feuille";

export async function exportProspection({
  lignes,
  colonnes,
  format,
  feuilles,
}: {
  lignes: LigneExport[];
  colonnes: ColonnesExport[];
  format: "xlsx" | "csv";
  feuilles: Feuilles;
}) {
  const cols = COLONNES_EXPORT.filter((g) => colonnes.includes(g.id)).flatMap((g) => g.cols);
  const date = new Date().toISOString().slice(0, 10);
  const tries = [...lignes].sort(
    (a, b) =>
      a.contact.entrepriseNom.localeCompare(b.contact.entrepriseNom, "fr") ||
      a.contact.nom.localeCompare(b.contact.nom, "fr"),
  );
  const toRows = (list: LigneExport[]) => list.map((l) => cols.map((c) => c.value(l)));

  if (format === "csv") {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const body = [cols.map((c) => c.header), ...toRows(tries)]
      .map((r) => r.map(esc).join(";"))
      .join("\r\n");
    download(
      new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" }),
      `campagne-contacts-${date}.csv`,
    );
    return;
  }

  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  const addSheet = (name: string, list: LigneExport[]) => {
    const rows = toRows(list);
    const ws = wb.addWorksheet(sheetName(name), { views: [{ state: "frozen", ySplit: 1 }] });
    ws.addRow(cols.map((c) => c.header));
    rows.forEach((r) => ws.addRow(r));
    ws.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2F4F8F" } };
    ws.columns.forEach((c, i) => {
      const longest = Math.max(cols[i]!.header.length, ...rows.map((r) => (r[i] ?? "").length));
      c.width = Math.min(50, Math.max(12, longest + 2));
      c.alignment = { vertical: "top", wrapText: true };
    });
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
  };

  const groupes = new Map<string, LigneExport[]>();
  for (const l of tries) {
    const k = cleFeuille(l, feuilles);
    groupes.set(k, [...(groupes.get(k) ?? []), l]);
  }
  const noms = [...groupes.keys()].sort((a, b) => a.localeCompare(b, "fr"));
  for (const nom of noms) addSheet(nom, groupes.get(nom)!);

  const buffer = await wb.xlsx.writeBuffer();
  download(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `campagne-contacts-${date}.xlsx`,
  );
}
