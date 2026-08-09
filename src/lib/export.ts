import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  CONTACT_FONCTIONS,
  STATUTS,
  type Company,
  type PipelineItem,
  type Projet,
} from "@/lib/types";

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

export async function exportCompaniesToExcel(
  companies: Company[],
  pipeline: PipelineItem[],
  projets: Projet[],
) {
  const projetName = (id: string) => projets.find((p) => p.id === id)?.nom ?? id;
  const statutLabel = (s: string) => STATUTS.find((x) => x.value === s)?.label ?? s;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Entreprises");
  sheet.columns = [
    { header: "Entreprise", key: "nom", width: 28 },
    { header: "Groupe", key: "groupe", width: 20 },
    { header: "Secteur", key: "secteur", width: 20 },
    { header: "Structure dédiée", key: "structureDediee", width: 16 },
    { header: "Mode d'accès au financement", key: "modeAcces", width: 34 },
    { header: "Budget RSE", key: "budgetRSE", width: 22 },
    { header: "Type d'engagement", key: "typeEngagement", width: 16 },
    { header: "Descriptif", key: "descriptifActivites", width: 40 },
    { header: "Programmes", key: "programmes", width: 40 },
    { header: "Projets déjà financés", key: "projetsFinances", width: 40 },
    { header: "Alignement thématique", key: "alignementThematique", width: 40 },
    { header: "Contacts", key: "contacts", width: 30 },
    { header: "Projets Amal Biladi", key: "projets", width: 34 },
    { header: "Statut pipeline", key: "statut", width: 22 },
    { header: "Exclue", key: "exclue", width: 10 },
    { header: "Raison exclusion", key: "raisonExclusion", width: 34 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: "middle" };

  for (const c of companies) {
    const pl = pipeline.find((p) => p.companyId === c.id);
    sheet.addRow({
      nom: c.nom,
      groupe: c.groupe ?? "",
      secteur: c.secteur ?? "",
      structureDediee: structureDedieeLabel(c.structureDediee),
      modeAcces: c.modeAcces ?? "",
      budgetRSE: c.budgetRSE ?? "",
      typeEngagement: c.typeEngagement ?? "",
      descriptifActivites: c.descriptifActivites ?? "",
      programmes: c.programmes ?? "",
      projetsFinances: c.projetsFinances ?? "",
      alignementThematique: c.alignementThematique ?? "",
      contacts: c.contacts
        .map((ct) => ct.nom)
        .filter(Boolean)
        .join(", "),
      projets: c.projets.map(projetName).join(", "),
      statut: pl ? statutLabel(pl.statut) : "",
      exclue: c.exclue ? "Oui" : "Non",
      raisonExclusion: c.raisonExclusion ?? "",
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `entreprises-amal-biladi-${todayStamp()}.xlsx`,
  );
}

export function exportCompanyToPdf(company: Company, projets: Projet[]) {
  const projetName = (id: string) => projets.find((p) => p.id === id)?.nom ?? id;
  const doc = new jsPDF();
  let y = 18;

  doc.setFontSize(16);
  doc.text(company.nom, 14, y);
  y += 6;
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text([company.groupe, company.secteur].filter(Boolean).join(" · ") || "—", 14, y);
  doc.setTextColor(0);
  y += 8;

  const section = (title: string, rows: [string, string][]) => {
    const filtered = rows.filter(([, v]) => v);
    if (!filtered.length) return;
    autoTable(doc, {
      startY: y,
      head: [[title, ""]],
      body: filtered,
      theme: "striped",
      styles: { fontSize: 9 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 45 } },
      margin: { left: 14, right: 14 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  };

  section("Identité", [
    ["Nom", company.nom],
    ["Groupe / maison mère", company.groupe ?? ""],
    ["Secteur d'activité", company.secteur ?? ""],
    ["Structure dédiée", structureDedieeLabel(company.structureDediee) || "Non renseigné"],
  ]);

  section("Comment — mécanisme de financement", [
    ["Mode d'accès au financement", company.modeAcces ?? ""],
    ["Budget / volume RSE", company.budgetRSE ?? ""],
    ["Type d'engagement", company.typeEngagement ?? ""],
  ]);

  section("Quoi — ce qu'ils financent déjà", [
    ["Descriptif des activités", company.descriptifActivites ?? ""],
    ["Programmes", company.programmes ?? ""],
    ["Projets déjà financés", company.projetsFinances ?? ""],
    ["Notes complémentaires", company.notesComplementaires ?? ""],
  ]);

  section("Pourquoi — pertinence pour Amal Biladi", [
    ["Alignement thématique", company.alignementThematique ?? ""],
    ["Précédent le plus fort", company.precedentFort ?? ""],
    ["Proposition concrète", company.propositionConcrete ?? ""],
  ]);

  if (company.contacts.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Fonction", "Nom", "Email", "Téléphone"]],
      body: company.contacts.map((c) => [
        CONTACT_FONCTIONS.find((f) => f.value === c.fonction)?.label ?? c.fonction,
        c.nom,
        c.email ?? "",
        c.telephone ?? "",
      ]),
      styles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  if (company.projets.length > 0) {
    doc.setFontSize(9);
    doc.text(
      `Projets Amal Biladi concernés : ${company.projets.map(projetName).join(", ")}`,
      14,
      y,
      {
        maxWidth: 180,
      },
    );
    y += 8;
  }

  if (company.exclue) {
    doc.setFontSize(9);
    doc.setTextColor(180, 30, 30);
    doc.text(`Entreprise exclue — ${company.raisonExclusion ?? ""}`, 14, y, { maxWidth: 180 });
    doc.setTextColor(0);
  }

  doc.save(`${slugify(company.nom)}.pdf`);
}
