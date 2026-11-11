// Fusionne les contacts en double dans une même entreprise (même personne, nom
// écrit avec ou sans titre/description). Essai par défaut ; --apply pour écrire.
//   node --env-file=.env.local scripts/fusionner-doublons-contacts.mjs [--apply]
//
// Pour chaque groupe : on garde le contact qui a un suivi de prospection (sinon
// celui qui a un poste, sinon le plus ancien), on complète ses champs vides avec
// ceux des autres, on lui rattache leurs suivis s'il n'en a pas, puis on supprime
// les autres. Les personnes présentes dans deux entreprises différentes ne sont
// pas touchées (seulement signalées).
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const supabase = createClient(
  process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const norm = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const splitNom = (s) => {
  const m = String(s ?? "").match(/^(.*?)(?:\s[—–-]\s|\s*\(|,\s)(.*)$/);
  return m
    ? { base: m[1].trim(), suffixe: m[2].replace(/\)\s*$/, "").trim() }
    : { base: String(s ?? "").trim(), suffixe: "" };
};
const personKey = (s) =>
  norm(splitNom(s).base)
    .replace(/\b(dr|mme|mr|m|pr)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const generique = (n) => /^(contact|service contact)/i.test(String(n).trim());
const linkedinSlug = (u) => {
  const m = String(u ?? "")
    .toLowerCase()
    .match(/linkedin\.com\/in\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]).replace(/\/$/, "") : null;
};

const contacts = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from("entreprise_contacts")
    .select("*, entreprises(nom), prospection_contacts(id, canal, etape)")
    .order("created_at")
    .range(from, from + 999);
  if (error) throw error;
  contacts.push(...data);
  if (data.length < 1000) break;
}

const groupes = new Map();
for (const c of contacts) {
  const cle = generique(c.nom) ? `g:${norm(c.nom)}|${norm(c.email)}` : `p:${personKey(c.nom)}`;
  const k = `${c.entreprise_id}|${cle}`;
  groupes.set(k, [...(groupes.get(k) ?? []), c]);
}

const CHAMPS = [
  "linkedin",
  "email",
  "telephone",
  "poste",
  "categorie_poste",
  "remarque",
  "responsable",
  "responsable_id",
];
let nbGroupes = 0;
let nbSupprimes = 0;
let nbSuivisDeplaces = 0;

for (const groupe of groupes.values()) {
  if (groupe.length < 2) continue;
  nbGroupes++;
  const garde =
    groupe.find((c) => c.prospection_contacts.length > 0 && c.poste) ??
    groupe.find((c) => c.prospection_contacts.length > 0) ??
    groupe.find((c) => c.poste) ??
    groupe[0];
  const autres = groupe.filter((c) => c.id !== garde.id);

  const patch = {};
  for (const champ of CHAMPS) {
    if (garde[champ]) continue;
    const v = autres.find((c) => c[champ])?.[champ];
    if (v) patch[champ] = v;
  }
  // Nom propre (sans la description) ; la description sert de poste si besoin.
  if (!generique(garde.nom)) {
    const { base, suffixe } = splitNom(garde.nom);
    if (suffixe) {
      patch.nom = base;
      if (!garde.poste && !patch.poste) patch.poste = suffixe;
    }
    if (!garde.poste && !patch.poste) {
      const s = autres.map((c) => splitNom(c.nom).suffixe).find(Boolean);
      if (s) patch.poste = s;
    }
  }

  // Descriptions longues des fiches supprimées (autre personne citée, contexte) :
  // conservées dans la remarque pour ne rien perdre.
  const notes = autres
    .map((c) => c.nom.trim())
    .filter((n) => splitNom(n).suffixe.length > 60 && !(garde.remarque ?? "").includes(n));
  if (notes.length) {
    const base = patch.remarque ?? garde.remarque ?? "";
    patch.remarque = [base, ...notes.map((n) => `Fiche fusionnée : ${n}`)]
      .filter(Boolean)
      .join("\n");
  }

  const canauxGarde = new Set(garde.prospection_contacts.map((p) => p.canal));
  const suivisADeplacer = [];
  for (const c of autres)
    for (const p of c.prospection_contacts)
      if (!canauxGarde.has(p.canal)) {
        suivisADeplacer.push(p.id);
        canauxGarde.add(p.canal);
      }

  console.log(`\n# ${garde.entreprises?.nom}`);
  console.log(
    `  garde   : ${garde.nom}${Object.keys(patch).length ? `  + ${Object.keys(patch).join(", ")}` : ""}`,
  );
  for (const c of autres) console.log(`  supprime: ${c.nom}`);
  if (suivisADeplacer.length)
    console.log(`  suivi rattaché au contact gardé : ${suivisADeplacer.length}`);
  nbSupprimes += autres.length;
  nbSuivisDeplaces += suivisADeplacer.length;

  if (!APPLY) continue;
  const ids = autres.map((c) => c.id);
  if (suivisADeplacer.length) {
    const { error } = await supabase
      .from("prospection_contacts")
      .update({ contact_id: garde.id })
      .in("id", suivisADeplacer);
    if (error) throw error;
  }
  for (const table of ["prospection_historique"]) {
    const { error } = await supabase
      .from(table)
      .update({ contact_id: garde.id })
      .in("contact_id", ids);
    if (error) throw error;
  }
  {
    const { error } = await supabase
      .from("entreprise_contacts")
      .update({ recommande_par: garde.id })
      .in("recommande_par", ids);
    if (error) throw error;
  }
  if (Object.keys(patch).length) {
    const { error } = await supabase.from("entreprise_contacts").update(patch).eq("id", garde.id);
    if (error) throw error;
  }
  const { error } = await supabase.from("entreprise_contacts").delete().in("id", ids);
  if (error) throw error;
}

// Même profil LinkedIn dans plusieurs entreprises : signalé seulement.
const parProfil = new Map();
for (const c of contacts) {
  const s = linkedinSlug(c.linkedin);
  if (s) parProfil.set(s, [...(parProfil.get(s) ?? []), c]);
}
const multi = [...parProfil.values()].filter(
  (g) => new Set(g.map((c) => c.entreprise_id)).size > 1,
);
console.log(`\n== Même personne (même LinkedIn) dans plusieurs entreprises : ${multi.length}`);
for (const g of multi) {
  const parEnt = new Map(g.map((c) => [c.entreprise_id, c]));
  console.log(
    `  ${splitNom(g[0].nom).base} : ${[...parEnt.values()].map((c) => `${c.entreprises?.nom}${c.prospection_contacts.length ? " (suivi)" : ""}`).join(" | ")}`,
  );
}

console.log(
  `\n${nbGroupes} groupes de doublons, ${nbSupprimes} contacts en trop, ${nbSuivisDeplaces} suivis rattachés.`,
);
console.log(
  APPLY ? "Fusion terminée." : "Essai uniquement : relancer avec --apply pour écrire en base.",
);
