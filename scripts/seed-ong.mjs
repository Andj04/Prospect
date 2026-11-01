// Importe les ONG depuis ong_amal_biladi_seed.json (produit par
// scripts/build-ong-seed.py à partir de Base_ONG_partenaires_Amal_Biladi.xlsx).
// Utilise la clé service_role (côté serveur uniquement) — ne jamais exposer
// la sortie ni l'environnement de ce script au navigateur.
//
// Usage : node --env-file=.env.local scripts/seed-ong.mjs
// Idempotent : rejouable sans créer de doublons (upsert par nom). À la relecture :
//   - les ONG dont les régions ont été validées (regions_verifiees) gardent leurs régions ;
//   - le suivi pipeline (statut, responsable, historique…) n'est jamais écrasé ;
//   - les liens partenaire -> entreprise (passerelles) validés sont conservés.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Variables manquantes. Lancer avec : node --env-file=.env.local scripts/seed-ong.mjs");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const seed = JSON.parse(readFileSync(join(__dirname, "..", "ong_amal_biladi_seed.json"), "utf-8"));

const norm = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

async function loadProjets() {
  const { data, error } = await supabase.from("projets").select("id, nom");
  if (error) throw error;
  return new Map(data.map((p) => [p.nom, p.id]));
}

async function seedOng(projetIdByName) {
  console.log(`Import de ${seed.ong.length} ONG…`);
  let created = 0;
  let updated = 0;
  const missingProjets = new Set();

  for (const f of seed.ong) {
    const { numero, contacts, partenaires, projets, pipeline, ...champs } = f;

    const { data: existing, error: findError } = await supabase
      .from("ong")
      .select("id, regions, regions_verifiees")
      .eq("nom", f.nom)
      .maybeSingle();
    if (findError) throw findError;

    let ongId;
    if (existing) {
      const payload = { ...champs };
      if (existing.regions_verifiees) {
        payload.regions = existing.regions;
        payload.regions_verifiees = true;
      }
      const { error } = await supabase.from("ong").update(payload).eq("id", existing.id);
      if (error) throw error;
      ongId = existing.id;
      updated += 1;
    } else {
      const { data, error } = await supabase.from("ong").insert(champs).select("id").single();
      if (error) throw error;
      ongId = data.id;
      created += 1;
      // La ligne pipeline_ong est créée par trigger ; on ne fixe le statut du
      // fichier que pour une ONG nouvelle.
      if (pipeline?.statut && pipeline.statut !== "a-contacter") {
        const { error: pErr } = await supabase
          .from("pipeline_ong")
          .update({ statut: pipeline.statut })
          .eq("ong_id", ongId);
        if (pErr) throw pErr;
      }
    }

    // Contacts
    {
      const { error: delErr } = await supabase.from("ong_contacts").delete().eq("ong_id", ongId);
      if (delErr) throw delErr;
      if (contacts.length > 0) {
        const { error } = await supabase.from("ong_contacts").insert(
          contacts.map((c) => ({
            ong_id: ongId,
            fonction_categorie: c.fonction_categorie,
            fonction_detail: c.fonction_detail ?? "",
            nom: c.nom,
          })),
        );
        if (error) throw error;
      }
    }

    // Partenaires : on conserve les passerelles déjà validées
    {
      const { data: anciens, error: oldErr } = await supabase
        .from("ong_partenaires")
        .select("nom, type, entreprise_id")
        .eq("ong_id", ongId);
      if (oldErr) throw oldErr;
      const liens = new Map(
        anciens.filter((a) => a.entreprise_id).map((a) => [`${norm(a.nom)}|${a.type}`, a.entreprise_id]),
      );
      const { error: delErr } = await supabase.from("ong_partenaires").delete().eq("ong_id", ongId);
      if (delErr) throw delErr;
      if (partenaires.length > 0) {
        const { error } = await supabase.from("ong_partenaires").insert(
          partenaires.map((p) => ({
            ong_id: ongId,
            nom: p.nom,
            type: p.type,
            entreprise_id: liens.get(`${norm(p.nom)}|${p.type}`) ?? null,
          })),
        );
        if (error) throw error;
      }
    }

    // Projets (matrice ONG x Projets)
    {
      const { error: delErr } = await supabase.from("ong_projets").delete().eq("ong_id", ongId);
      if (delErr) throw delErr;
      const rows = [];
      for (const p of projets) {
        const projetId = projetIdByName.get(p.projet);
        if (!projetId) {
          missingProjets.add(p.projet);
          continue;
        }
        rows.push({ ong_id: ongId, projet_id: projetId, role: p.role });
      }
      if (rows.length > 0) {
        const { error } = await supabase.from("ong_projets").insert(rows);
        if (error) throw error;
      }
    }
  }

  console.log(`  -> ${created} ONG créées, ${updated} mises à jour.`);
  if (missingProjets.size > 0) {
    console.warn(`  !! Projets introuvables dans la table projets : ${[...missingProjets].join(", ")}`);
  }
}

async function main() {
  const projetIdByName = await loadProjets();
  await seedOng(projetIdByName);
  console.log("Seed ONG terminé.");
}

main().catch((err) => {
  console.error("Erreur pendant le seed ONG :", err);
  process.exit(1);
});
