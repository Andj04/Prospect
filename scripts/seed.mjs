// Seeds the Supabase project from entreprises_amal_biladi_seed.json.
// Uses the service_role key (server-side only) — never expose this script's
// output/env to the browser.
//
// Usage: node --env-file=.env.local scripts/seed.mjs
// Idempotent: safe to re-run (upserts by name / by email).

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Variables manquantes. Lancer avec : node --env-file=.env.local scripts/seed.mjs");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const seedPath = join(__dirname, "..", "entreprises_amal_biladi_seed.json");
const seed = JSON.parse(readFileSync(seedPath, "utf-8"));

async function seedProjets() {
  console.log(`Seeding ${seed.projets_reference.length} projets…`);
  const rows = seed.projets_reference.map((nom, i) => ({ nom, ordre: i }));
  const { data, error } = await supabase
    .from("projets")
    .upsert(rows, { onConflict: "nom" })
    .select("id, nom");
  if (error) throw error;
  console.log(`  -> ${data.length} projets en base.`);
  return new Map(data.map((p) => [p.nom, p.id]));
}

async function seedEntreprises(projetIdByName) {
  console.log(`Seeding ${seed.entreprises.length} entreprises…`);
  let count = 0;
  let excluded = 0;

  for (const e of seed.entreprises) {
    const { data: existing, error: findError } = await supabase
      .from("entreprises")
      .select("id")
      .eq("nom", e.nom)
      .maybeSingle();
    if (findError) throw findError;

    const payload = {
      nom: e.nom,
      groupe: e.groupe_maison_mere ?? "",
      secteur: e.secteur ?? "",
      structure_dediee: e.structure_dediee ?? null,
      comment_mode_acces: e.comment_mode_acces ?? "",
      comment_budget: e.comment_budget ?? "",
      comment_type_engagement: e.comment_type_engagement ?? "",
      quoi_descriptif: e.quoi_descriptif ?? "",
      quoi_programmes: e.quoi_programmes ?? "",
      quoi_projets_finances: e.quoi_projets_finances ?? "",
      quoi_notes_complementaires: e.quoi_notes_complementaires ?? "",
      pourquoi_alignement: e.pourquoi_alignement ?? "",
      pourquoi_precedent_fort: e.pourquoi_precedent_fort ?? "",
      pourquoi_proposition: e.pourquoi_proposition ?? "",
      exclue: !!e.exclue,
      raison_exclusion: e.raison_exclusion ?? "",
    };

    let entrepriseId;
    if (existing) {
      const { data, error } = await supabase
        .from("entreprises")
        .update(payload)
        .eq("id", existing.id)
        .select("id")
        .single();
      if (error) throw error;
      entrepriseId = data.id;
    } else {
      const { data, error } = await supabase
        .from("entreprises")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      entrepriseId = data.id;
    }

    await supabase.from("entreprise_projets").delete().eq("entreprise_id", entrepriseId);
    const projetIds = (e.projets ?? [])
      .map((nom) => projetIdByName.get(nom))
      .filter((id) => Boolean(id));
    if (projetIds.length > 0) {
      const { error } = await supabase
        .from("entreprise_projets")
        .insert(projetIds.map((projet_id) => ({ entreprise_id: entrepriseId, projet_id })));
      if (error) throw error;
    }

    count += 1;
    if (e.exclue) excluded += 1;
  }

  console.log(`  -> ${count} entreprises importées (${excluded} exclues).`);
}

async function seedAdminAccount() {
  const email = "mathieut157@gmail.com";
  console.log(`Vérification du compte admin ${email}…`);

  const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) throw listError;
  let user = listData.users.find((u) => u.email === email);

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password: "123456789",
      email_confirm: true,
      user_metadata: { full_name: "Mathieu", structure: "180DC" },
    });
    if (error) throw error;
    user = data.user;
    console.log("  -> Compte admin créé (mot de passe temporaire : 123456789).");
  } else {
    console.log("  -> Compte admin déjà existant, profil resynchronisé.");
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: user.id,
    email,
    full_name: "Mathieu",
    structure: "180DC",
    role: "admin",
    password_change_required: true,
  });
  if (profileError) throw profileError;
}

async function main() {
  const projetIdByName = await seedProjets();
  await seedEntreprises(projetIdByName);
  await seedAdminAccount();
  console.log("Seed terminé.");
}

main().catch((err) => {
  console.error("Erreur pendant le seed :", err);
  process.exit(1);
});
