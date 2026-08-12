import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CONTACT_FONCTIONS,
  type Company,
  type Contact,
  type ContactFonction,
  type Projet,
  type SousComposante,
} from "@/lib/types";
import { getSousComposanteIcon } from "@/lib/sous-composante-icons";

export const emptyCompany: Omit<Company, "id"> = {
  nom: "",
  groupe: "",
  secteur: "",
  structureDediee: null,
  logoUrl: "",
  modeAcces: "",
  budgetRSE: "",
  typeEngagement: "",
  descriptifActivites: "",
  programmes: "",
  projetsFinances: "",
  notesComplementaires: "",
  alignementThematique: "",
  precedentFort: "",
  propositionConcrete: "",
  contacts: [],
  projets: [],
  sousComposantes: [],
  exclue: false,
  raisonExclusion: "",
};

function Section({
  n,
  title,
  hint,
  children,
}: {
  n: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card-soft p-5 sm:p-6">
      <header className="mb-5 flex items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {n}
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-tight">{title}</h2>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        </div>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function CompanyForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  projets,
  sousComposantes,
}: {
  value: Omit<Company, "id">;
  onChange: (v: Omit<Company, "id">) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
  projets: Projet[];
  sousComposantes: SousComposante[];
}) {
  const [error, setError] = useState("");
  const set = <K extends keyof Company>(k: K, v: Company[K]) =>
    onChange({ ...value, [k]: v } as Omit<Company, "id">);

  const toggleProjet = (id: string) => {
    if (value.projets.includes(id)) {
      // Unchecking a project also drops any sous-composante selection that
      // belongs to it, so we never leave an orphaned relation behind.
      const scIdsForProjet = new Set(
        sousComposantes.filter((sc) => sc.projetId === id).map((sc) => sc.id),
      );
      onChange({
        ...value,
        projets: value.projets.filter((x) => x !== id),
        sousComposantes: value.sousComposantes.filter((scId) => !scIdsForProjet.has(scId)),
      });
    } else {
      set("projets", [...value.projets, id]);
    }
  };

  const toggleSousComposante = (id: string) => {
    set(
      "sousComposantes",
      value.sousComposantes.includes(id)
        ? value.sousComposantes.filter((x) => x !== id)
        : [...value.sousComposantes, id],
    );
  };

  const updateContact = (id: string, patch: Partial<Contact>) =>
    set(
      "contacts",
      value.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.nom.trim()) {
          setError("Le nom de l'entreprise est obligatoire.");
          return;
        }
        setError("");
        onSubmit();
      }}
    >
      <Section n={1} title="Identité">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="nom">Nom de l'entreprise / fondation *</Label>
            <Input
              id="nom"
              value={value.nom}
              onChange={(e) => set("nom", e.target.value)}
              placeholder="Ex. Fondation OCP"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="groupe">Groupe / maison mère</Label>
            <Input
              id="groupe"
              value={value.groupe ?? ""}
              onChange={(e) => set("groupe", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="secteur">Secteur d'activité</Label>
            <Input
              id="secteur"
              value={value.secteur ?? ""}
              onChange={(e) => set("secteur", e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <Label htmlFor="fondation" className="text-sm font-normal">
              Structure dédiée (fondation existante)
            </Label>
            <Switch
              id="fondation"
              checked={!!value.structureDediee}
              onCheckedChange={(v) => set("structureDediee", v)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="logo-url">URL du logo</Label>
            <Input
              id="logo-url"
              value={value.logoUrl ?? ""}
              onChange={(e) => set("logoUrl", e.target.value)}
              placeholder="https://…/logo.png"
            />
            <p className="text-xs text-muted-foreground">
              Utilisé dans la cartographie ; à défaut, les initiales de l'entreprise sont affichées.
            </p>
          </div>
        </div>
      </Section>

      <Section n={2} title="Comment" hint="Mécanisme de financement">
        <div className="space-y-1.5">
          <Label htmlFor="mode-acces">Mode d'accès au financement</Label>
          <Textarea
            id="mode-acces"
            rows={2}
            value={value.modeAcces ?? ""}
            onChange={(e) => set("modeAcces", e.target.value)}
            placeholder="Ex. Appel à projets annuel, partenariat direct avec la fondation…"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="budget">Budget / volume RSE</Label>
            <Input
              id="budget"
              value={value.budgetRSE ?? ""}
              onChange={(e) => set("budgetRSE", e.target.value)}
              placeholder="Ex. 10 MDH / an"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Type d'engagement</Label>
            <Select
              {...(value.typeEngagement ? { value: value.typeEngagement } : {})}
              onValueChange={(v) => set("typeEngagement", v as Company["typeEngagement"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recurrent">Récurrent / structuré</SelectItem>
                <SelectItem value="ponctuel">Ponctuel</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      <Section n={3} title="Quoi" hint="Ce qu'ils financent déjà">
        <div className="space-y-1.5">
          <Label htmlFor="descriptif">Descriptif des activités de la fondation</Label>
          <Textarea
            id="descriptif"
            rows={3}
            value={value.descriptifActivites ?? ""}
            onChange={(e) => set("descriptifActivites", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="programmes">Programmes</Label>
          <Textarea
            id="programmes"
            rows={3}
            value={value.programmes ?? ""}
            onChange={(e) => set("programmes", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="finances">Projets déjà financés</Label>
          <Textarea
            id="finances"
            rows={3}
            value={value.projetsFinances ?? ""}
            onChange={(e) => set("projetsFinances", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes complémentaires</Label>
          <Textarea
            id="notes"
            rows={3}
            value={value.notesComplementaires ?? ""}
            onChange={(e) => set("notesComplementaires", e.target.value)}
          />
        </div>
      </Section>

      <Section n={4} title="Pourquoi" hint="Pertinence pour Amal Biladi">
        <div className="space-y-1.5">
          <Label htmlFor="align">Alignement thématique</Label>
          <Textarea
            id="align"
            rows={3}
            value={value.alignementThematique ?? ""}
            onChange={(e) => set("alignementThematique", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="precedent">Précédent le plus fort / porte d'entrée prioritaire</Label>
          <Textarea
            id="precedent"
            rows={3}
            value={value.precedentFort ?? ""}
            onChange={(e) => set("precedentFort", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="proposition">Proposition concrète à formuler</Label>
          <Textarea
            id="proposition"
            rows={3}
            value={value.propositionConcrete ?? ""}
            onChange={(e) => set("propositionConcrete", e.target.value)}
          />
        </div>
      </Section>

      <Section n={5} title="Contacts" hint="Plusieurs contacts possibles">
        {value.contacts.length === 0 && (
          <p className="text-sm text-muted-foreground">Aucun contact enregistré.</p>
        )}
        <div className="space-y-4">
          {value.contacts.map((c, i) => (
            <div key={c.id} className="rounded-lg border border-border p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Contact {i + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    set(
                      "contacts",
                      value.contacts.filter((x) => x.id !== c.id),
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Fonction</Label>
                  <Select
                    value={c.fonction}
                    onValueChange={(v) => updateContact(c.id, { fonction: v as ContactFonction })}
                  >
                    <SelectTrigger>
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
                </div>
                <div className="space-y-1.5">
                  <Label>Nom</Label>
                  <Input
                    value={c.nom}
                    onChange={(e) => updateContact(c.id, { nom: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>LinkedIn</Label>
                  <Input
                    value={c.linkedin ?? ""}
                    onChange={(e) => updateContact(c.id, { linkedin: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={c.email ?? ""}
                    onChange={(e) => updateContact(c.id, { email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Téléphone</Label>
                  <Input
                    value={c.telephone ?? ""}
                    onChange={(e) => updateContact(c.id, { telephone: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            set("contacts", [
              ...value.contacts,
              {
                id: crypto.randomUUID(),
                fonction: "autre",
                nom: "",
              },
            ])
          }
        >
          <Plus className="h-4 w-4" />
          Ajouter un contact
        </Button>
      </Section>

      <Section n={6} title="Projets Amal Biladi concernés">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {projets.map((p) => (
            <label
              key={p.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:border-primary/40"
            >
              <Checkbox
                checked={value.projets.includes(p.id)}
                onCheckedChange={() => toggleProjet(p.id)}
              />
              <span className="min-w-0 truncate">{p.nom}</span>
            </label>
          ))}
          {projets.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun projet en base.</p>
          )}
        </div>

        {value.projets.length > 0 && (
          <div className="space-y-3 pt-1">
            {value.projets.map((projetId) => {
              const projet = projets.find((p) => p.id === projetId);
              const scForProjet = sousComposantes
                .filter((sc) => sc.projetId === projetId)
                .sort((a, b) => a.ordre - b.ordre);
              return (
                <div
                  key={projetId}
                  className="rounded-lg border border-primary/25 bg-accent/30 p-4"
                >
                  <h3 className="mb-3 text-sm font-semibold">
                    Sous-composantes — {projet?.nom ?? projetId}
                  </h3>
                  {scForProjet.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Aucune sous-composante définie pour ce projet.
                    </p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {scForProjet.map((sc) => {
                        const Icon = getSousComposanteIcon(sc.icone);
                        return (
                          <label
                            key={sc.id}
                            className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors hover:border-primary/40"
                          >
                            <Checkbox
                              checked={value.sousComposantes.includes(sc.id)}
                              onCheckedChange={() => toggleSousComposante(sc.id)}
                            />
                            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 truncate">{sc.nom}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      <Section n={7} title="Statut d'exclusion" hint="Optionnel">
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
          <Label htmlFor="exclue" className="text-sm font-normal">
            Entreprise exclue de la prospection
          </Label>
          <Switch id="exclue" checked={value.exclue} onCheckedChange={(v) => set("exclue", v)} />
        </div>
        {value.exclue && (
          <div className="space-y-1.5">
            <Label htmlFor="raison">Raison de l'exclusion</Label>
            <Textarea
              id="raison"
              rows={2}
              value={value.raisonExclusion ?? ""}
              onChange={(e) => set("raisonExclusion", e.target.value)}
            />
          </div>
        )}
      </Section>

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}

      <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-border bg-background/90 py-4 backdrop-blur">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
