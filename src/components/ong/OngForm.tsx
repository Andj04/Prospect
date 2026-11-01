import { Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  APPORTS,
  CONTACT_FONCTIONS,
  ECHELLES,
  MILIEUX,
  ODD_LABELS,
  PARTENAIRE_TYPES,
  REGIONS,
  TYPE_STRUCTURE_OPTIONS,
  type ContactFonction,
  type Ong,
  type OngPartenaireType,
  type Projet,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export type OngDraft = Omit<Ong, "id">;

export const emptyOng: OngDraft = {
  nom: "",
  typeStructure: "association",
  utilitePublique: null,
  thematiques: [],
  odd: [],
  echelle: [],
  milieu: [],
  regions: [],
  regionsVerifiees: false,
  financementSources: [],
  apports: [],
  transversale: false,
  reseaux: [],
  contacts: [],
  partenaires: [],
  projets: [],
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card-soft space-y-4 p-5 sm:p-6">
      <h2 className="border-b border-border pb-3 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Chips<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; title?: string }[];
  value: T[];
  onChange: (v: T[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={String(o.value)}
            type="button"
            title={o.title}
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value])}
            className={cn(
              "rounded-full border px-3 py-1 text-sm transition-colors",
              on
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const split = (s: string) =>
  s
    .split(/[;,]/)
    .map((x) => x.trim())
    .filter(Boolean);

// Formulaire ONG : même structure en blocs que la fiche. Les colonnes
// « qualité des données » n'y figurent pas.
export function OngForm({
  value,
  onChange,
  projets,
  submitLabel,
  onSubmit,
  onCancel,
  saving,
}: {
  value: OngDraft;
  onChange: (v: OngDraft) => void;
  projets: Projet[];
  submitLabel: string;
  onSubmit: () => void;
  onCancel: () => void;
  saving?: boolean;
}) {
  const set = <K extends keyof OngDraft>(k: K, v: OngDraft[K]) => onChange({ ...value, [k]: v });
  const [themes, setThemes] = useState(value.thematiques.join(", "));
  const principal = value.projets.find((p) => p.role === "principal")?.projetId ?? "";

  const setPrincipal = (id: string) => {
    const rest = value.projets.filter((p) => p.projetId !== id && p.role !== "principal");
    set("projets", id ? [{ projetId: id, role: "principal" }, ...rest] : rest);
  };
  const toggleLie = (id: string, on: boolean) =>
    set(
      "projets",
      on
        ? [...value.projets, { projetId: id, role: "lie" }]
        : value.projets.filter((p) => p.projetId !== id),
    );

  const reseau = (type: string) => value.reseaux.find((r) => r.type === type)?.url ?? "";
  const setReseau = (type: string, url: string) =>
    set("reseaux", [
      ...value.reseaux.filter((r) => r.type !== type),
      ...(url.trim() ? [{ type, url: url.trim() }] : []),
    ]);

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.nom.trim()) onSubmit();
      }}
    >
      <Section title="Identité">
        <div className="grid gap-4 sm:grid-cols-2">
          <Row label="Nom *">
            <Input required value={value.nom} onChange={(e) => set("nom", e.target.value)} />
          </Row>
          <Row label="Acronyme">
            <Input value={value.acronyme ?? ""} onChange={(e) => set("acronyme", e.target.value)} />
          </Row>
          <Row label="Type de structure">
            <Select
              value={value.typeStructure}
              onValueChange={(v) => set("typeStructure", v as Ong["typeStructure"])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_STRUCTURE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Row>
          <Row label="Année de création">
            <Input
              type="number"
              min={1800}
              max={2100}
              value={value.anneeCreation ?? ""}
              onChange={(e) => {
                const { anneeCreation: _drop, ...rest } = value;
                onChange(
                  e.target.value ? { ...rest, anneeCreation: Number(e.target.value) } : rest,
                );
              }}
            />
          </Row>
          <Row label="Reconnue d'utilité publique">
            <Select
              value={
                value.utilitePublique === null ? "inconnu" : value.utilitePublique ? "oui" : "non"
              }
              onValueChange={(v) => set("utilitePublique", v === "inconnu" ? null : v === "oui")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inconnu">Inconnu</SelectItem>
                <SelectItem value="oui">Oui</SelectItem>
                <SelectItem value="non">Non</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row label="Logo (URL)">
            <Input value={value.logoUrl ?? ""} onChange={(e) => set("logoUrl", e.target.value)} />
          </Row>
        </div>
      </Section>

      <Section title="Ce qu'elle fait">
        <Row label="Thématiques (séparées par des virgules)">
          <Input
            value={themes}
            onChange={(e) => {
              setThemes(e.target.value);
              set("thematiques", split(e.target.value));
            }}
          />
        </Row>
        <Row label="Objectifs de développement durable">
          <Chips
            options={Object.entries(ODD_LABELS).map(([n, l]) => ({
              value: Number(n),
              label: `${n} · ${l}`,
              title: `ODD ${n} — ${l}`,
            }))}
            value={value.odd}
            onChange={(v) =>
              set(
                "odd",
                [...v].sort((a, b) => a - b),
              )
            }
          />
        </Row>
        <Row label="Activités principales">
          <Textarea
            rows={3}
            value={value.activitesPrincipales ?? ""}
            onChange={(e) => set("activitesPrincipales", e.target.value)}
          />
        </Row>
        <Row label="Publics cibles">
          <Textarea
            rows={2}
            value={value.publicsCibles ?? ""}
            onChange={(e) => set("publicsCibles", e.target.value)}
          />
        </Row>
      </Section>

      <Section title="Où elle agit">
        <div className="grid gap-4 sm:grid-cols-2">
          <Row label="Siège (ville)">
            <Input value={value.siege ?? ""} onChange={(e) => set("siege", e.target.value)} />
          </Row>
        </div>
        <Row label="Échelle">
          <Chips options={ECHELLES} value={value.echelle} onChange={(v) => set("echelle", v)} />
        </Row>
        <Row label="Milieu">
          <Chips options={MILIEUX} value={value.milieu} onChange={(v) => set("milieu", v)} />
        </Row>
        <Row label="Régions d'intervention">
          <Chips
            options={REGIONS.map((r) => ({ value: r.code, label: r.nom }))}
            value={value.regions}
            onChange={(v) => set("regions", v)}
          />
          <label className="mt-2 flex items-center gap-2 text-sm">
            <Checkbox
              checked={value.regionsVerifiees}
              onCheckedChange={(c) => set("regionsVerifiees", c === true)}
            />
            Régions vérifiées à la main
          </label>
        </Row>
        <Row label="Territoires précis (texte libre)">
          <Textarea
            rows={2}
            value={value.territoiresPrecis ?? ""}
            onChange={(e) => set("territoiresPrecis", e.target.value)}
          />
        </Row>
      </Section>

      <Section title="Son financement">
        <Row label="Comment elle accède à son propre financement">
          <Textarea
            rows={3}
            value={value.accesFinancement ?? ""}
            onChange={(e) => set("accesFinancement", e.target.value)}
          />
        </Row>
        <Row label="Budget annuel">
          <Input
            value={value.budgetAnnuel ?? ""}
            onChange={(e) => set("budgetAnnuel", e.target.value)}
          />
        </Row>
        <Row label="Sources de financement">
          <Chips
            options={[
              { value: "international" as const, label: "International" },
              { value: "diaspora" as const, label: "Diaspora" },
            ]}
            value={value.financementSources}
            onChange={(v) => set("financementSources", v)}
          />
        </Row>
      </Section>

      <Section title="Son réseau">
        {PARTENAIRE_TYPES.map((t) => {
          const list = value.partenaires.filter((p) => p.type === t.value);
          return (
            <PartenairesEditor
              key={t.value}
              label={t.label}
              type={t.value}
              noms={list.map((p) => p.nom)}
              onChange={(noms) =>
                set("partenaires", [
                  // Les passerelles déjà validées sont conservées pour les noms inchangés.
                  ...value.partenaires.filter((p) => p.type !== t.value),
                  ...noms.map((nom) => {
                    const prev = list.find((p) => p.nom === nom);
                    return {
                      id: prev?.id ?? crypto.randomUUID(),
                      nom,
                      type: t.value,
                      ...(prev?.entrepriseId ? { entrepriseId: prev.entrepriseId } : {}),
                    };
                  }),
                ])
              }
            />
          );
        })}
        <Row label="Comment elle noue ses partenariats">
          <Textarea
            rows={3}
            value={value.commentPartenariats ?? ""}
            onChange={(e) => set("commentPartenariats", e.target.value)}
          />
        </Row>
      </Section>

      <Section title="Pourquoi ce partenaire">
        <Row label="Apports possibles">
          <Chips
            options={APPORTS.map((a) => ({ value: a, label: a }))}
            value={value.apports}
            onChange={(v) => set("apports", v)}
          />
        </Row>
        <Row label="Atouts">
          <Textarea
            rows={3}
            value={value.atouts ?? ""}
            onChange={(e) => set("atouts", e.target.value)}
          />
        </Row>
        <Row label="Pourquoi ce partenaire">
          <Textarea
            rows={3}
            value={value.pourquoiPartenaire ?? ""}
            onChange={(e) => set("pourquoiPartenaire", e.target.value)}
          />
        </Row>
        <Row label="Relation existante avec Amal Biladi">
          <Textarea
            rows={2}
            value={value.relationAmalBiladi ?? ""}
            onChange={(e) => set("relationAmalBiladi", e.target.value)}
          />
        </Row>
      </Section>

      <Section title="Projets Amal Biladi">
        <Row label="Projet principal">
          <Select
            value={principal || "aucun"}
            onValueChange={(v) => setPrincipal(v === "aucun" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aucun">Aucun</SelectItem>
              {projets.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
        <Row label="Autres projets concernés">
          <div className="grid gap-2 sm:grid-cols-2">
            {projets
              .filter((p) => p.id !== principal)
              .map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={value.projets.some((l) => l.projetId === p.id)}
                    onCheckedChange={(c) => toggleLie(p.id, c === true)}
                  />
                  {p.nom}
                </label>
              ))}
          </div>
        </Row>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={value.transversale}
            onCheckedChange={(c) => set("transversale", c === true)}
          />
          Transversale (utile à tous les projets)
        </label>
      </Section>

      <Section title="Contacts">
        <div className="space-y-3">
          {value.contacts.map((c, i) => {
            const patch = (p: Partial<typeof c>) =>
              set(
                "contacts",
                value.contacts.map((x, j) => (j === i ? { ...x, ...p } : x)),
              );
            return (
              <div
                key={c.id}
                className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_1fr_11rem_auto]"
              >
                <Input
                  placeholder="Nom"
                  value={c.nom}
                  onChange={(e) => patch({ nom: e.target.value })}
                />
                <Input
                  placeholder="Fonction exacte"
                  value={c.fonctionDetail ?? ""}
                  onChange={(e) => patch({ fonctionDetail: e.target.value })}
                />
                <Select
                  value={c.fonctionCategorie}
                  onValueChange={(v) => patch({ fonctionCategorie: v as ContactFonction })}
                >
                  <SelectTrigger aria-label="Catégorie">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_FONCTIONS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Supprimer le contact"
                  onClick={() =>
                    set(
                      "contacts",
                      value.contacts.filter((_, j) => j !== i),
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Input
                  placeholder="Email"
                  value={c.email ?? ""}
                  onChange={(e) => patch({ email: e.target.value })}
                />
                <Input
                  placeholder="Téléphone"
                  value={c.telephone ?? ""}
                  onChange={(e) => patch({ telephone: e.target.value })}
                />
                <Input
                  placeholder="LinkedIn"
                  value={c.linkedin ?? ""}
                  onChange={(e) => patch({ linkedin: e.target.value })}
                  className="sm:col-span-2"
                />
              </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              set("contacts", [
                ...value.contacts,
                { id: crypto.randomUUID(), fonctionCategorie: "dirigeant", nom: "" },
              ])
            }
          >
            <Plus className="h-4 w-4" />
            Ajouter un contact
          </Button>
        </div>
        <Row label="Note (ex. patronage royal, pas de contact opérationnel)">
          <Textarea
            rows={2}
            value={value.notes ?? ""}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Row>
      </Section>

      <Section title="Coordonnées de la structure">
        <div className="grid gap-4 sm:grid-cols-2">
          <Row label="Email">
            <Input
              type="email"
              value={value.email ?? ""}
              onChange={(e) => set("email", e.target.value)}
            />
          </Row>
          <Row label="Téléphone">
            <Input
              value={value.telephone ?? ""}
              onChange={(e) => set("telephone", e.target.value)}
            />
          </Row>
          <Row label="Site web">
            <Input value={value.siteWeb ?? ""} onChange={(e) => set("siteWeb", e.target.value)} />
          </Row>
          <Row label="LinkedIn">
            <Input
              value={reseau("linkedin")}
              onChange={(e) => setReseau("linkedin", e.target.value)}
            />
          </Row>
          <Row label="Facebook">
            <Input
              value={reseau("facebook")}
              onChange={(e) => setReseau("facebook", e.target.value)}
            />
          </Row>
          <Row label="Instagram">
            <Input
              value={reseau("instagram")}
              onChange={(e) => setReseau("instagram", e.target.value)}
            />
          </Row>
        </div>
      </Section>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={!value.nom.trim() || saving}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function PartenairesEditor({
  label,
  type,
  noms,
  onChange,
}: {
  label: string;
  type: OngPartenaireType;
  noms: string[];
  onChange: (noms: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const n = draft.trim();
    if (n && !noms.includes(n)) onChange([...noms, n]);
    setDraft("");
  };
  return (
    <Row label={label}>
      <div className="flex flex-wrap gap-1.5">
        {noms.map((n) => (
          <span
            key={n}
            className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground"
          >
            {n}
            <button
              type="button"
              aria-label={`Retirer ${n}`}
              className="text-muted-foreground hover:text-destructive"
              onClick={() => onChange(noms.filter((x) => x !== n))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          data-type={type}
          placeholder="Ajouter un nom puis Entrée"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={add} disabled={!draft.trim()}>
          Ajouter
        </Button>
      </div>
    </Row>
  );
}
