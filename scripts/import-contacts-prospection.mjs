// Importe contacts-complets-amal-biladi.xlsx dans entreprise_contacts et
// prépare le suivi LinkedIn (prospection_contacts, étape « À inviter »).
// Clé service_role (côté serveur uniquement).
//
// Usage :
//   node --env-file=.env.local scripts/import-contacts-prospection.mjs           (essai : rien n'est écrit)
//   node --env-file=.env.local scripts/import-contacts-prospection.mjs --apply   (écrit en base)
//
// Rejouable : un contact déjà présent (même lien LinkedIn, sinon même nom dans la
// même entreprise) est complété sans être dupliqué ; seuls les champs vides
// sont remplis, pour ne jamais écraser une saisie faite sur le site.

import ExcelJS from "exceljs";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes("--apply");

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Variables manquantes. Lancer avec : node --env-file=.env.local scripts/import-contacts-prospection.mjs",
  );
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const norm = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

// Identité d'une personne : nom sans titre de civilité ni description ajoutée
// (« Axel d'Hauthuille, Directeur Général » ou « Imad Toumi (PDG) » -> même clé).
const personKey = (s) =>
  norm(String(s ?? "").split(/\s[—–-]\s|\(|,/)[0])
    .replace(/\b(dr|mme|mr|m|pr)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const cellText = (v) => {
  if (v == null) return "";
  if (typeof v === "object") {
    if ("text" in v) return String(v.text ?? "").trim();
    if ("hyperlink" in v) return String(v.hyperlink ?? "").trim();
    if ("richText" in v)
      return v.richText
        .map((r) => r.text)
        .join("")
        .trim();
    if ("result" in v) return String(v.result ?? "").trim();
  }
  return String(v).trim();
};

// Identifiant stable d'un profil LinkedIn : la partie après /in/, décodée.
const linkedinSlug = (url) => {
  const m = String(url ?? "").match(/linkedin\.com\/in\/([^/?#]+)/i);
  if (!m) return "";
  try {
    return decodeURIComponent(m[1]).toLowerCase();
  } catch {
    return m[1].toLowerCase();
  }
};

// Catégories du fichier -> catégorie de poste (modèles de messages) et fonction (filtres)
const CATEGORIES = {
  dirigeant: { categorie: "dirigeant", fonction: "dirigeant" },
  "dirigeant adjoint regional ou chef de fondation": {
    categorie: "dirigeant-adjoint",
    fonction: "dirigeant",
  },
  "dirigeant sans poste precis": { categorie: "dirigeant", fonction: "dirigeant" },
  "rse developpement durable": { categorie: "rse", fonction: "rse-communication" },
  "communication marketing": { categorie: "communication", fonction: "marketing" },
  rh: { categorie: "rh", fonction: "rh" },
  "finance secretariat gouvernance": { categorie: "finance", fonction: "autre" },
  "autre ou poste non precise": { categorie: "autre", fonction: "autre" },
};

// Noms du fichier écrits autrement en base (rapprochement vérifié à la main)
const ALIAS = {
  inwi: "inwi (groupe Al Mada)",
  "holcim maroc": "Holcim Maroc (ex-Lafarge)",
  snam: "SNAM (Autoroutes du Maroc)",
  "c a p e p": "C.A.P.E.P (Capep Maroc)",
  "lamalif group": "Lamalif Group (Fondation Lamalif)",
  "kalaa bel": "Kalaa Bel",
  "credit agricole personnal finance and mobility": "Crédit Agricole Personal Finance & Mobility",
};

async function fetchAll(table, columns) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(join(__dirname, "..", "contacts-complets-amal-biladi.xlsx"));
  const sheet = wb.getWorksheet("Contacts");
  const generiques = wb.getWorksheet("Canaux génériques");

  const entreprises = await fetchAll("entreprises", "id, nom, contact_generique");
  const contacts = await fetchAll(
    "entreprise_contacts",
    "id, entreprise_id, nom, poste, categorie_poste, remarque, responsable, responsable_id, linkedin, email, telephone, fonction",
  );
  const profiles = await fetchAll("profiles", "id, full_name");
  const prospections = await fetchAll("prospection_contacts", "contact_id, canal");

  // Rapprochement des entreprises : nom exact normalisé, puis sans la parenthèse, puis alias
  const byNorm = new Map();
  for (const e of entreprises) {
    byNorm.set(norm(e.nom), e);
    byNorm.set(norm(e.nom.split("(")[0]), byNorm.get(norm(e.nom.split("(")[0])) ?? e);
  }
  const findEntreprise = (name) => {
    const n = norm(name);
    if (byNorm.has(n)) return byNorm.get(n);
    const a = ALIAS[n];
    if (a) return entreprises.find((e) => e.nom === a);
    const base = norm(String(name).split("(")[0]);
    if (byNorm.has(base)) return byNorm.get(base);
    const cands = entreprises.filter(
      (e) => norm(e.nom).startsWith(base + " ") || base.startsWith(norm(e.nom.split("(")[0]) + " "),
    );
    return cands.length === 1 ? cands[0] : undefined;
  };

  // Responsable : prénom du fichier -> compte du site (si un seul profil correspond)
  const findProfile = (prenom) => {
    const n = norm(prenom);
    if (!n) return undefined;
    const m = profiles.filter((p) => norm(p.full_name).split(" ")[0] === n);
    return m.length === 1 ? m[0] : undefined;
  };

  const header = sheet.getRow(1).values.map(cellText);
  const col = (name) => header.indexOf(name);
  const C = {
    entreprise: col("Entreprise"),
    nom: col("Nom de la personne"),
    poste: col("Poste"),
    categorie: col("Catégorie de poste"),
    email: col("Email"),
    tel: col("Téléphone"),
    linkedin: col("Lien LinkedIn"),
    qui: col("Qui envoie l'invitation LinkedIn"),
    remarque: col("Remarque"),
  };

  const report = {
    lignes: 0,
    entreprisesInconnues: new Map(),
    crees: 0,
    completes: 0,
    inchanges: 0,
    suivisCrees: 0,
    categoriesInconnues: new Set(),
  };
  const toInsert = [];
  const toUpdate = [];
  const prospectionKeys = new Set(prospections.map((p) => `${p.contact_id}|${p.canal}`));
  const newProspections = [];

  sheet.eachRow((row, i) => {
    if (i === 1) return;
    const v = row.values;
    const nomEntreprise = cellText(v[C.entreprise]);
    const nom = cellText(v[C.nom]);
    if (!nomEntreprise || !nom) return;
    report.lignes += 1;

    const e = findEntreprise(nomEntreprise);
    if (!e) {
      report.entreprisesInconnues.set(
        nomEntreprise,
        (report.entreprisesInconnues.get(nomEntreprise) ?? 0) + 1,
      );
      return;
    }
    const catLabel = cellText(v[C.categorie]);
    const cat = CATEGORIES[norm(catLabel)];
    if (!cat) report.categoriesInconnues.add(catLabel);
    const linkedin = cellText(v[C.linkedin]);
    const slug = linkedinSlug(linkedin);
    const qui = cellText(v[C.qui]);
    const profile = findProfile(qui);
    const fields = {
      poste: cellText(v[C.poste]),
      categorie_poste: cat?.categorie ?? "autre",
      remarque: cellText(v[C.remarque]),
      responsable: qui,
      responsable_id: profile?.id ?? null,
      linkedin: linkedin || null,
      email: cellText(v[C.email]) || null,
      telephone: cellText(v[C.tel]) || null,
    };

    const existing = contacts.find(
      (c) =>
        c.entreprise_id === e.id &&
        ((slug && linkedinSlug(c.linkedin) === slug) || personKey(c.nom) === personKey(nom)),
    );

    let contactId;
    if (existing) {
      // On ne remplit que ce qui est vide : une saisie faite sur le site prime.
      const patch = {};
      for (const [k, val] of Object.entries(fields)) {
        if (val && !existing[k]) patch[k] = val;
      }
      if (Object.keys(patch).length) {
        toUpdate.push({ id: existing.id, patch });
        report.completes += 1;
      } else report.inchanges += 1;
      contactId = existing.id;
    } else {
      contactId = crypto.randomUUID();
      toInsert.push({
        id: contactId,
        entreprise_id: e.id,
        nom,
        fonction: cat?.fonction ?? "autre",
        ...fields,
      });
      contacts.push({ id: contactId, entreprise_id: e.id, nom, linkedin, ...fields });
      report.crees += 1;
    }

    // Suivi LinkedIn : seulement pour les contacts qui ont un profil
    const hasLinkedin = slug || linkedinSlug(existing?.linkedin);
    if (hasLinkedin && !prospectionKeys.has(`${contactId}|linkedin`)) {
      prospectionKeys.add(`${contactId}|linkedin`);
      newProspections.push({ contact_id: contactId, canal: "linkedin", etape: "a-inviter" });
      report.suivisCrees += 1;
    }
  });

  // Canaux génériques -> entreprises.contact_generique (si vide)
  const generiqueUpdates = [];
  generiques?.eachRow((row, i) => {
    if (i === 1) return;
    const [, ent, canal, remarque] = row.values.map(cellText);
    if (!ent || !canal) return;
    const e = findEntreprise(ent);
    if (!e) return;
    const texte = remarque ? `${canal} — ${remarque}` : canal;
    const existing = generiqueUpdates.find((g) => g.id === e.id);
    if (existing) existing.texte += `\n${texte}`;
    else if (!e.contact_generique) generiqueUpdates.push({ id: e.id, texte });
  });

  console.log(`${report.lignes} lignes lues`);
  console.log(`  contacts à créer : ${report.crees}`);
  console.log(
    `  contacts existants complétés : ${report.completes} (inchangés : ${report.inchanges})`,
  );
  console.log(`  suivis LinkedIn à créer : ${report.suivisCrees}`);
  console.log(`  canaux génériques renseignés : ${generiqueUpdates.length}`);
  const resp = new Map();
  for (const c of toInsert)
    if (c.responsable)
      resp.set(c.responsable, c.responsable_id ? "compte du site" : "pas encore de compte");
  console.log("  responsables :", Object.fromEntries(resp));
  if (report.categoriesInconnues.size)
    console.log("  catégories inconnues :", [...report.categoriesInconnues]);
  if (report.entreprisesInconnues.size) {
    console.log(`  !! entreprises absentes de la base (contacts ignorés) :`);
    for (const [n, k] of report.entreprisesInconnues) console.log(`     - ${n} (${k} contacts)`);
  }

  if (!APPLY) {
    console.log("\nEssai uniquement : relancer avec --apply pour écrire en base.");
    return;
  }

  for (let i = 0; i < toInsert.length; i += 200) {
    const { error } = await supabase.from("entreprise_contacts").insert(toInsert.slice(i, i + 200));
    if (error) throw error;
  }
  for (const u of toUpdate) {
    const { error } = await supabase.from("entreprise_contacts").update(u.patch).eq("id", u.id);
    if (error) throw error;
  }
  for (let i = 0; i < newProspections.length; i += 200) {
    const { error } = await supabase
      .from("prospection_contacts")
      .upsert(newProspections.slice(i, i + 200), {
        onConflict: "contact_id,canal",
        ignoreDuplicates: true,
      });
    if (error) throw error;
  }
  for (const g of generiqueUpdates) {
    const { error } = await supabase
      .from("entreprises")
      .update({ contact_generique: g.texte })
      .eq("id", g.id);
    if (error) throw error;
  }
  console.log("\nImport terminé.");
}

main().catch((err) => {
  console.error("Erreur pendant l'import :", err);
  process.exit(1);
});
