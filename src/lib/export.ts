import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoAmalBiladi from "@/assets/logo-amal-biladi.png";
import { BONUS_CHECKS, REQUIRED_CHECKS, missingRequired } from "@/lib/completeness";
import {
  CONTACT_FONCTIONS,
  STATUTS,
  type Company,
  type PipelineItem,
  type Projet,
  type SousComposante,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Helpers communs                                                     */
/* ------------------------------------------------------------------ */

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function todayFr() {
  return new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function slugify(text: string) {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "entreprise"
  );
}

const structureDedieeLabel = (v: boolean | null) => (v == null ? "" : v ? "Oui" : "Non");
const statutLabel = (s: string) => STATUTS.find((x) => x.value === s)?.label ?? s;
const fonctionLabel = (f: string) => CONTACT_FONCTIONS.find((x) => x.value === f)?.label ?? f;
const engagementLabel = (t?: string) =>
  t === "recurrent" ? "Récurrent" : t === "ponctuel" ? "Ponctuel" : "";

function makeLookups(projets: Projet[], sousComposantes: SousComposante[]) {
  const projetName = (id: string) => projets.find((p) => p.id === id)?.nom ?? id;
  const sousComposante = (id: string) => sousComposantes.find((s) => s.id === id);
  return { projetName, sousComposante };
}

// Couleurs de la marque Amal Biladi (bleu, orange, vert du logo).
const BRAND = {
  blue: [31, 63, 122] as [number, number, number],
  blueLight: [232, 238, 251] as [number, number, number],
  orange: [224, 138, 43] as [number, number, number],
  green: [63, 143, 63] as [number, number, number],
  red: [192, 57, 43] as [number, number, number],
  grey: [100, 112, 138] as [number, number, number],
};

async function imageToDataUrl(src: string): Promise<string | null> {
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* PDF — fiche entreprise                                              */
/* ------------------------------------------------------------------ */

export async function exportCompanyToPdf({
  company,
  projets,
  sousComposantes,
  pipeline,
}: {
  company: Company;
  projets: Projet[];
  sousComposantes: SousComposante[];
  pipeline?: PipelineItem | undefined;
}) {
  const { projetName, sousComposante } = makeLookups(projets, sousComposantes);
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 14; // marge latérale
  const BOTTOM = 18; // réservé au pied de page
  let y = 0;

  const lastY = () =>
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - BOTTOM) {
      doc.addPage();
      y = 18;
    }
  };

  // En-tête bleu de la marque
  doc.setFillColor(...BRAND.blue);
  doc.rect(0, 0, pageW, 34, "F");
  doc.setFillColor(255, 255, 255);
  doc.circle(M + 9, 17, 10, "F");
  const logo = await imageToDataUrl(logoAmalBiladi);
  if (logo) doc.addImage(logo, "PNG", M + 2, 10, 14, 14);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text("AMAL BILADI · FICHE DE PROSPECTION RSE", M + 24, 12);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(doc.splitTextToSize(company.nom, pageW - M * 2 - 60)[0] ?? company.nom, M + 24, 21);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Édité le ${todayFr()}`, pageW - M, 12, { align: "right" });
  y = 42;

  // Pastilles : secteur, pays, groupe, fondation
  const pills = [
    company.secteur,
    company.paysOrigine,
    company.structureDediee ? "Fondation dédiée" : null,
  ].filter(Boolean) as string[];
  let x = M;
  doc.setFontSize(8);
  for (const p of pills) {
    const w = doc.getTextWidth(p) + 6;
    doc.setFillColor(...BRAND.blueLight);
    doc.roundedRect(x, y - 4.5, w, 6.5, 3, 3, "F");
    doc.setTextColor(...BRAND.blue);
    doc.text(p, x + 3, y);
    x += w + 3;
  }
  if (company.groupe) {
    doc.setTextColor(...BRAND.grey);
    doc.text(doc.splitTextToSize(`Groupe : ${company.groupe}`, pageW - M * 2), M, y + 7);
    y += 5;
  }
  y += 10;

  // Complétude
  const missing = missingRequired(company);
  const done = REQUIRED_CHECKS.length - missing.length;
  const barW = 50;
  doc.setTextColor(0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Complétude de la fiche : ${done}/${REQUIRED_CHECKS.length}`, M, y);
  doc.setFont("helvetica", "normal");
  doc.setFillColor(230, 233, 240);
  doc.roundedRect(M + 62, y - 3, barW, 3.5, 1.7, 1.7, "F");
  const tone = missing.length === 0 ? BRAND.green : missing.length <= 3 ? BRAND.orange : BRAND.red;
  doc.setFillColor(...tone);
  doc.roundedRect(M + 62, y - 3, (barW * done) / REQUIRED_CHECKS.length, 3.5, 1.7, 1.7, "F");
  if (missing.length) {
    y += 5;
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND.grey);
    const lines = doc.splitTextToSize(`À compléter : ${missing.join(", ")}`, pageW - M * 2);
    doc.text(lines, M, y);
    y += lines.length * 3.5;
  }
  doc.setTextColor(0);
  y += 6;

  const tableDefaults = {
    margin: { left: M, right: M, top: 18, bottom: BOTTOM },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.2,
      overflow: "linebreak" as const,
      valign: "top" as const,
    },
    headStyles: { fillColor: BRAND.blue, textColor: 255, fontStyle: "bold" as const },
  };

  const section = (title: string, rows: [string, string][]) => {
    const filtered = rows.filter(([, v]) => v && v.trim());
    if (!filtered.length) return;
    autoTable(doc, {
      ...tableDefaults,
      startY: y,
      head: [[title, ""]],
      body: filtered,
      theme: "grid",
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 48, fillColor: [245, 247, 251] } },
    });
    y = lastY() + 6;
  };

  section("Comment : mécanisme de financement", [
    ["Mode d'accès au financement", company.modeAcces ?? ""],
    ["Budget / volume RSE", company.budgetRSE ?? ""],
    ["Type d'engagement", engagementLabel(company.typeEngagement)],
    ["Structure dédiée", structureDedieeLabel(company.structureDediee)],
  ]);

  section("Quoi : ce qu'ils financent déjà", [
    ["Descriptif des activités", company.descriptifActivites ?? ""],
    ["Programmes", company.programmes ?? ""],
    ["Projets déjà financés", company.projetsFinances ?? ""],
  ]);

  section("Pourquoi : pertinence pour Amal Biladi", [
    ["Alignement thématique", company.alignementThematique ?? ""],
    ["Précédent le plus fort", company.precedentFort ?? ""],
    ["Proposition concrète", company.propositionConcrete ?? ""],
  ]);

  // Contacts — toujours présents, avec liens cliquables.
  ensureSpace(20);
  if (company.contacts.length > 0) {
    autoTable(doc, {
      ...tableDefaults,
      startY: y,
      head: [["Contacts", "Fonction", "Email", "Téléphone", "LinkedIn"]],
      body: company.contacts.map((c) => [
        c.nom,
        fonctionLabel(c.fonction),
        c.email ?? "",
        c.telephone ?? "",
        c.linkedin ? "Voir le profil" : "",
      ]),
      theme: "grid",
      columnStyles: {
        0: { cellWidth: 48, fontStyle: "bold" },
        1: { cellWidth: 26 },
        2: { cellWidth: 44 },
        3: { cellWidth: 28 },
      },
      didDrawCell: (data) => {
        if (data.section !== "body") return;
        const contact = company.contacts[data.row.index];
        if (!contact) return;
        const { x: cx, y: cy, width, height } = data.cell;
        if (data.column.index === 4 && contact.linkedin) {
          doc.link(cx, cy, width, height, { url: contact.linkedin });
        }
        if (data.column.index === 2 && contact.email) {
          doc.link(cx, cy, width, height, { url: `mailto:${contact.email}` });
        }
      },
      didParseCell: (data) => {
        if (data.section === "body" && (data.column.index === 4 || data.column.index === 2)) {
          data.cell.styles.textColor = BRAND.blue;
        }
      },
    });
    y = lastY() + 6;
  } else {
    autoTable(doc, {
      ...tableDefaults,
      startY: y,
      head: [["Contacts"]],
      body: [["Aucun contact renseigné pour cette entreprise."]],
      theme: "grid",
      bodyStyles: { textColor: BRAND.grey, fontStyle: "italic" },
    });
    y = lastY() + 6;
  }

  // Projets et sous-composantes Amal Biladi
  if (company.projets.length > 0) {
    const rows = company.projets.map((pid) => {
      const scs = company.sousComposantes
        .map(sousComposante)
        .filter((sc) => sc && sc.projetId === pid)
        .map((sc) => sc!.nom);
      return [projetName(pid), scs.join(" · ") || "—"];
    });
    autoTable(doc, {
      ...tableDefaults,
      startY: y,
      head: [["Projets Amal Biladi", "Sous-composantes"]],
      body: rows,
      theme: "grid",
      columnStyles: { 0: { cellWidth: 60, fontStyle: "bold" } },
    });
    y = lastY() + 6;
  }

  // Suivi pipeline
  if (pipeline) {
    section("Suivi de prospection", [
      ["Statut", statutLabel(pipeline.statut)],
      ["Priorité", pipeline.priorite.charAt(0).toUpperCase() + pipeline.priorite.slice(1)],
      ["Responsable", pipeline.responsable],
      ["Prochaine action", pipeline.prochaineAction],
    ]);
  }

  if (company.notesComplementaires) {
    section("Notes complémentaires", [["Notes", company.notesComplementaires]]);
  }

  if (company.exclue) {
    ensureSpace(12);
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.red);
    const lines = doc.splitTextToSize(
      `Entreprise exclue de la prospection : ${company.raisonExclusion || "raison non précisée"}`,
      pageW - M * 2,
    );
    doc.text(lines, M, y);
    doc.setTextColor(0);
  }

  // Pied de page sur chaque page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(227, 231, 240);
    doc.line(M, pageH - 12, pageW - M, pageH - 12);
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND.grey);
    doc.text(`Amal Biladi · Base de prospection RSE · ${company.nom}`, M, pageH - 7);
    doc.text(`Page ${i} / ${pages}`, pageW - M, pageH - 7, { align: "right" });
  }

  doc.save(`${slugify(company.nom)}.pdf`);
}

/* ------------------------------------------------------------------ */
/* Excel — export avec options                                         */
/* ------------------------------------------------------------------ */

export type ColumnGroup =
  | "identite"
  | "financement"
  | "contenu"
  | "pertinence"
  | "contacts"
  | "projets"
  | "pipeline"
  | "qualite"
  | "exclusion";

export const COLUMN_GROUPS: { key: ColumnGroup; label: string; description: string }[] = [
  { key: "identite", label: "Identité", description: "Groupe, secteur, pays, fondation, logo" },
  { key: "financement", label: "Financement", description: "Mode d'accès, budget, engagement" },
  {
    key: "contenu",
    label: "Activités",
    description: "Descriptif, programmes, projets financés, notes",
  },
  { key: "pertinence", label: "Pertinence", description: "Alignement, précédent, proposition" },
  { key: "contacts", label: "Contacts", description: "Liste des contacts de chaque fiche" },
  { key: "projets", label: "Projets Amal Biladi", description: "Projets et sous-composantes liés" },
  {
    key: "pipeline",
    label: "Pipeline",
    description: "Statut, priorité, responsable, prochaine action",
  },
  { key: "qualite", label: "Qualité de la fiche", description: "Complétude et champs manquants" },
  { key: "exclusion", label: "Exclusion", description: "Exclue et raison" },
];

export type ContactsMode = "cell" | "sheet" | "both";

export type ExcelExportOptions = {
  groups: ColumnGroup[];
  contactsMode: ContactsMode;
  includeStats: boolean;
  scopeLabel: string;
};

type Col = { header: string; key: string; width: number; group: ColumnGroup | "base" };

const COLUMNS: Col[] = [
  { header: "Entreprise", key: "nom", width: 30, group: "base" },
  { header: "Groupe", key: "groupe", width: 24, group: "identite" },
  { header: "Secteur", key: "secteur", width: 24, group: "identite" },
  { header: "Pays d'origine", key: "paysOrigine", width: 16, group: "identite" },
  { header: "Structure dédiée", key: "structureDediee", width: 14, group: "identite" },
  { header: "Logo (URL)", key: "logoUrl", width: 28, group: "identite" },
  { header: "Mode d'accès au financement", key: "modeAcces", width: 40, group: "financement" },
  { header: "Budget RSE", key: "budgetRSE", width: 26, group: "financement" },
  { header: "Type d'engagement", key: "typeEngagement", width: 16, group: "financement" },
  { header: "Descriptif", key: "descriptifActivites", width: 45, group: "contenu" },
  { header: "Programmes", key: "programmes", width: 45, group: "contenu" },
  { header: "Projets déjà financés", key: "projetsFinances", width: 45, group: "contenu" },
  { header: "Notes complémentaires", key: "notesComplementaires", width: 45, group: "contenu" },
  { header: "Alignement thématique", key: "alignementThematique", width: 45, group: "pertinence" },
  { header: "Précédent le plus fort", key: "precedentFort", width: 45, group: "pertinence" },
  { header: "Proposition concrète", key: "propositionConcrete", width: 40, group: "pertinence" },
  { header: "Contacts", key: "contacts", width: 45, group: "contacts" },
  { header: "Nombre de contacts", key: "nbContacts", width: 12, group: "contacts" },
  { header: "Projets Amal Biladi", key: "projets", width: 36, group: "projets" },
  { header: "Sous-composantes", key: "sousComposantes", width: 45, group: "projets" },
  { header: "Statut pipeline", key: "statut", width: 22, group: "pipeline" },
  { header: "Priorité", key: "priorite", width: 11, group: "pipeline" },
  { header: "Responsable", key: "responsable", width: 18, group: "pipeline" },
  { header: "Prochaine action", key: "prochaineAction", width: 30, group: "pipeline" },
  { header: "Complétude (/10)", key: "completude", width: 12, group: "qualite" },
  { header: "Champs requis manquants", key: "manquants", width: 40, group: "qualite" },
  { header: "Exclue", key: "exclue", width: 9, group: "exclusion" },
  { header: "Raison exclusion", key: "raisonExclusion", width: 34, group: "exclusion" },
];

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1F3F7A" },
};

function styleTableSheet(sheet: ExcelJS.Worksheet, colCount: number) {
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = HEADER_FILL;
  header.alignment = { vertical: "middle", wrapText: true };
  header.height = 28;
  sheet.views = [{ state: "frozen", xSplit: 1, ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: colCount } };
  sheet.eachRow((row, i) => {
    if (i === 1) return;
    row.alignment = { vertical: "top", wrapText: true };
    if (i % 2 === 0) {
      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F7FB" } };
    }
  });
}

function contactLine(ct: Company["contacts"][number]) {
  const details = [ct.email, ct.telephone, ct.linkedin].filter(Boolean).join(" · ");
  const base = [ct.nom, fonctionLabel(ct.fonction)].filter(Boolean).join(" — ");
  return details ? `${base} (${details})` : base;
}

export async function exportCompaniesToExcel(
  companies: Company[],
  pipeline: PipelineItem[],
  projets: Projet[],
  sousComposantes: SousComposante[],
  options: ExcelExportOptions = {
    groups: COLUMN_GROUPS.map((g) => g.key),
    contactsMode: "cell",
    includeStats: false,
    scopeLabel: "",
  },
) {
  const { projetName, sousComposante } = makeLookups(projets, sousComposantes);
  const groups = new Set(options.groups);
  const contactsInCell = groups.has("contacts") && options.contactsMode !== "sheet";
  const cols = COLUMNS.filter(
    (c) =>
      c.group === "base" ||
      (groups.has(c.group as ColumnGroup) && !(c.key === "contacts" && !contactsInCell)),
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Amal Biladi — Base de prospection RSE";
  workbook.created = new Date();

  // Onglet principal
  const sheet = workbook.addWorksheet("Entreprises");
  sheet.columns = cols.map(({ header, key, width }) => ({ header, key, width }));
  for (const c of companies) {
    const pl = pipeline.find((p) => p.companyId === c.id);
    const miss = missingRequired(c);
    sheet.addRow({
      nom: c.nom,
      groupe: c.groupe ?? "",
      secteur: c.secteur ?? "",
      paysOrigine: c.paysOrigine ?? "",
      structureDediee: structureDedieeLabel(c.structureDediee),
      logoUrl: c.logoUrl ?? "",
      modeAcces: c.modeAcces ?? "",
      budgetRSE: c.budgetRSE ?? "",
      typeEngagement: engagementLabel(c.typeEngagement),
      descriptifActivites: c.descriptifActivites ?? "",
      programmes: c.programmes ?? "",
      projetsFinances: c.projetsFinances ?? "",
      notesComplementaires: c.notesComplementaires ?? "",
      alignementThematique: c.alignementThematique ?? "",
      precedentFort: c.precedentFort ?? "",
      propositionConcrete: c.propositionConcrete ?? "",
      contacts: c.contacts.map(contactLine).join("\n"),
      nbContacts: c.contacts.length,
      projets: c.projets.map(projetName).join(", "),
      sousComposantes: c.sousComposantes
        .map((id) => {
          const sc = sousComposante(id);
          return sc ? `${projetName(sc.projetId)} — ${sc.nom}` : id;
        })
        .join("\n"),
      statut: pl ? statutLabel(pl.statut) : "",
      priorite: pl?.priorite ?? "",
      responsable: pl?.responsable ?? "",
      prochaineAction: pl?.prochaineAction ?? "",
      completude: REQUIRED_CHECKS.length - miss.length,
      manquants: miss.join(", "),
      exclue: c.exclue ? "Oui" : "Non",
      raisonExclusion: c.raisonExclusion ?? "",
    });
  }
  styleTableSheet(sheet, cols.length);

  // Onglet Contacts : une ligne par contact (pratique pour un publipostage)
  if (groups.has("contacts") && options.contactsMode !== "cell") {
    const cs = workbook.addWorksheet("Contacts");
    cs.columns = [
      { header: "Entreprise", key: "entreprise", width: 30 },
      { header: "Secteur", key: "secteur", width: 24 },
      { header: "Nom", key: "nom", width: 32 },
      { header: "Fonction", key: "fonction", width: 20 },
      { header: "Email", key: "email", width: 32 },
      { header: "Téléphone", key: "telephone", width: 20 },
      { header: "LinkedIn", key: "linkedin", width: 40 },
    ];
    for (const c of companies) {
      for (const ct of c.contacts) {
        cs.addRow({
          entreprise: c.nom,
          secteur: c.secteur ?? "",
          nom: ct.nom,
          fonction: fonctionLabel(ct.fonction),
          email: ct.email ?? "",
          telephone: ct.telephone ?? "",
          linkedin: ct.linkedin ? { text: ct.linkedin, hyperlink: ct.linkedin } : "",
        });
      }
    }
    styleTableSheet(cs, 7);
  }

  // Onglet Statistiques, calculé sur les entreprises exportées
  if (options.includeStats) {
    const st = workbook.addWorksheet("Statistiques");
    st.columns = [
      { key: "a", width: 42 },
      { key: "b", width: 14 },
      { key: "c", width: 12 },
    ];
    const total = companies.length;
    const pct = (n: number) => (total ? n / total : 0);
    const title = (text: string) => {
      const r = st.addRow([text]);
      r.font = { bold: true, size: 12, color: { argb: "FF1F3F7A" } };
      st.addRow([]);
    };
    const table = (heading: string, rows: [string, number][]) => {
      const h = st.addRow([heading, "Nombre", "% du total"]);
      h.font = { bold: true, color: { argb: "FFFFFFFF" } };
      h.fill = HEADER_FILL;
      for (const [label, n] of rows) {
        const r = st.addRow([label, n, pct(n)]);
        r.getCell(3).numFmt = "0%";
      }
      st.addRow([]);
    };
    const countBy = (key: (c: Company) => string[]) => {
      const m = new Map<string, number>();
      for (const c of companies) for (const k of key(c)) m.set(k, (m.get(k) ?? 0) + 1);
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };

    const titleRow = st.addRow(["Statistiques — Base de prospection RSE Amal Biladi"]);
    titleRow.font = { bold: true, size: 14, color: { argb: "FF1F3F7A" } };
    st.addRow([`Édité le ${todayFr()} · ${options.scopeLabel || `${total} entreprises`}`]).font = {
      italic: true,
      color: { argb: "FF64708A" },
    };
    st.addRow([]);

    const complete = companies.filter((c) => missingRequired(c).length === 0).length;
    title("Chiffres clés");
    table("Indicateur", [
      ["Entreprises exportées", total],
      ["Avec fondation dédiée", companies.filter((c) => c.structureDediee).length],
      ["Entreprises marocaines", companies.filter((c) => c.paysOrigine === "Maroc").length],
      [
        "Entreprises étrangères",
        companies.filter((c) => c.paysOrigine && c.paysOrigine !== "Maroc").length,
      ],
      ["Fiches complètes (10/10)", complete],
      ["Avec au moins un contact", companies.filter((c) => c.contacts.length > 0).length],
    ]);

    title("Répartition");
    table(
      "Secteur",
      countBy((c) => [c.secteur || "Non renseigné"]),
    );
    table(
      "Pays d'origine",
      countBy((c) => [c.paysOrigine || "Non renseigné"]),
    );
    table(
      "Projet Amal Biladi (une entreprise peut en avoir plusieurs)",
      countBy((c) => (c.projets.length ? c.projets.map(projetName) : ["Aucun projet lié"])),
    );
    const plByCompany = new Map(pipeline.map((p) => [p.companyId, p]));
    table(
      "Statut pipeline",
      countBy((c) => [statutLabel(plByCompany.get(c.id)?.statut ?? "identifie")]),
    );

    title("Qualité des fiches");
    table(
      "Champ requis manquant",
      REQUIRED_CHECKS.map(
        (f) => [f.label, companies.filter((c) => !f.test(c)).length] as [string, number],
      ).sort((a, b) => b[1] - a[1]),
    );
    table(
      "Information bonus manquante",
      BONUS_CHECKS.map(
        (f) => [f.label, companies.filter((c) => !f.test(c)).length] as [string, number],
      ).sort((a, b) => b[1] - a[1]),
    );
  }

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `entreprises-amal-biladi-${todayStamp()}.xlsx`,
  );
}
