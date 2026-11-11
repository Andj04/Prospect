import { createFileRoute, Link } from "@tanstack/react-router";
import { memo, useCallback, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  Info,
  Linkedin,
  MessageSquareText,
  Pause,
  Play,
  RotateCcw,
  Search,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PrioriteBadge, StatutBadge } from "@/components/badges";
import { PageHeader } from "@/components/page-header";
import { DetailsSheet } from "@/components/prospection/DetailsSheet";
import { ModelesDialog } from "@/components/prospection/ModelesDialog";
import { ReponseDialog } from "@/components/prospection/ReponseDialog";
import { ContactsEntreprise } from "@/components/prospection/ContactsEntreprise";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth/AuthProvider";
import { normaliser } from "@/lib/ong-utils";
import { todayIso } from "@/lib/pipeline-utils";
import {
  CANAUX,
  CATEGORIES_POSTE,
  clePersonne,
  resumeContacts,
  typeContact,
  type ContactCampagne,
  ETAPES_LINKEDIN,
  ETAPE_SUIVANTE,
  REPONSES_PARTAGEES,
  categorieLabel,
  derniereDate,
  estAssigneA,
  reponseLabel,
  type Canal,
  type EtapeLinkedin,
  type ProspectionItem,
  type Reponse,
} from "@/lib/prospection";
import { usePipeline } from "@/lib/queries/pipeline";
import {
  useAssignerContacts,
  useContactsCampagne,
  useProspection,
  useUpdateProspection,
} from "@/lib/queries/prospection";
import { useUsers } from "@/lib/queries/users";
import type { PipelineItem, Priorite } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/prospection")({
  head: () => ({ meta: [{ title: "Prospection — Amal Biladi" }] }),
  component: ProspectionPage,
});

const ALL = "__all__";
const MOI = "__moi__";
const SANS = "__sans__";
const GROUPES_PAR_PAGE = 25;
const PRIO_ORDRE: Record<Priorite, number> = { haute: 0, moyenne: 1, basse: 2 };
const TERMINEES: EtapeLinkedin[] = ["repondu", "sans-suite"];

const ETAPE_CLASS: Record<EtapeLinkedin, string> = {
  "a-inviter": "bg-muted text-muted-foreground",
  "invitation-envoyee": "bg-primary/10 text-primary-deep",
  acceptee: "bg-primary/20 text-primary-deep",
  "message-envoye": "bg-primary/30 text-primary-deep",
  "relance-1": "bg-brand-orange/20 text-warning-foreground",
  "relance-2": "bg-brand-orange/30 text-warning-foreground",
  "relance-finale": "bg-brand-orange/40 text-warning-foreground",
  repondu: "bg-success/15 text-success",
  "sans-suite": "bg-destructive/10 text-destructive",
};

const REPONSE_CLASS: Record<Reponse, string> = {
  favorable: "bg-success text-primary-foreground",
  redirection: "bg-success/15 text-success",
  information: "bg-primary/15 text-primary-deep",
  "plus-tard": "bg-brand-orange/25 text-warning-foreground",
  refus: "bg-destructive/10 text-destructive",
};

const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "";

/** À traiter : rien en pause, conversation non terminée, et une action attendue. */
function aTraiter(p: ProspectionItem, today: string) {
  if (p.enPause || TERMINEES.includes(p.etape)) return false;
  if (p.prochaineActionDate) return p.prochaineActionDate <= today;
  return p.etape === "a-inviter" || p.etape === "acceptee";
}

type Dialogue =
  { type: "modeles"; item: ProspectionItem } | { type: "reponse"; item: ProspectionItem } | null;

const ContactRow = memo(function ContactRow({
  p,
  isAdmin,
  responsables,
  onChange,
  onAssign,
  onDialog,
  onDetails,
}: {
  p: ProspectionItem;
  isAdmin: boolean;
  responsables: string[];
  onChange: (
    p: ProspectionItem,
    patch: Parameters<ReturnType<typeof useUpdateProspection>["mutate"]>[0]["patch"],
  ) => void;
  onAssign: (p: ProspectionItem, responsable: string) => void;
  onDialog: (d: Dialogue) => void;
  onDetails: (p: ProspectionItem) => void;
}) {
  const suivante = ETAPE_SUIVANTE[p.etape];
  const date = derniereDate(p);
  return (
    <li
      className={cn(
        "grid gap-2 px-3 py-2.5 text-sm lg:grid-cols-[minmax(0,1.6fr)_8rem_10rem_minmax(0,1fr)_auto] lg:items-center",
        p.enPause && "opacity-60",
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onDetails(p)}
            className="truncate text-left font-semibold hover:underline"
          >
            {p.contact.nom}
          </button>
          {p.contact.linkedin && (
            <a
              href={p.contact.linkedin}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={`Profil LinkedIn de ${p.contact.nom}`}
              className="text-primary hover:text-primary-deep"
            >
              <Linkedin className="h-3.5 w-3.5" />
            </a>
          )}
          {p.contact.recommandePar && (
            <span className="rounded bg-success/15 px-1.5 py-0.5 text-[11px] font-medium text-success">
              recommandé
            </span>
          )}
          {p.contact.remarque && (
            <span title={p.contact.remarque} className="text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {p.contact.poste || "Poste non précisé"} · {categorieLabel(p.contact.categoriePoste)}
        </p>
      </div>

      <div>
        {isAdmin ? (
          <select
            value={p.contact.responsable}
            onChange={(e) => onAssign(p, e.target.value)}
            aria-label={`Responsable de ${p.contact.nom}`}
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="">Non assigné</option>
            {responsables.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        ) : (
          <span className="text-xs">{p.contact.responsable || "Non assigné"}</span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <select
          value={p.etape}
          onChange={(e) => onChange(p, { etape: e.target.value as EtapeLinkedin })}
          aria-label={`Étape de ${p.contact.nom}`}
          className={cn(
            "h-8 w-full rounded-md border-0 px-2 text-xs font-semibold",
            ETAPE_CLASS[p.etape],
          )}
        >
          {ETAPES_LINKEDIN.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
        <span className="text-[11px] text-muted-foreground">
          {date ? `le ${fmt(date)}` : ""}
          {p.enPause && " · en pause"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {p.reponse && (
          <span
            title={p.reponseNote || undefined}
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
              REPONSE_CLASS[p.reponse],
            )}
          >
            {reponseLabel(p.reponse)}
          </span>
        )}
        <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
          Prochaine action
          <input
            type="date"
            key={p.prochaineActionDate ?? ""}
            defaultValue={p.prochaineActionDate ?? ""}
            onBlur={(e) =>
              (e.target.value || null) !== (p.prochaineActionDate ?? null) &&
              onChange(p, { prochaineActionDate: e.target.value || null })
            }
            className="h-7 rounded border border-input bg-background px-1 text-[11px]"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-1">
        {suivante && !p.enPause && (
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => onChange(p, { etape: suivante.to })}
          >
            {suivante.action}
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          title="Modèles de message"
          aria-label="Modèles de message"
          onClick={() => onDialog({ type: "modeles", item: p })}
        >
          <MessageSquareText className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8"
          onClick={() => onDialog({ type: "reponse", item: p })}
        >
          Réponse
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          title={p.enPause ? "Reprendre" : "Mettre en pause"}
          aria-label={p.enPause ? "Reprendre" : "Mettre en pause"}
          onClick={() =>
            onChange(p, p.enPause ? { enPause: false, pauseMotif: "" } : { enPause: true })
          }
        >
          {p.enPause ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </Button>
      </div>
    </li>
  );
});

function ProspectionPage() {
  const { profile, isAdmin } = useAuth();
  const [canal, setCanal] = useState<Canal>("linkedin");
  const { data: items = [], isLoading } = useProspection(canal);
  const { data: pipeline = [] } = usePipeline();
  const { data: users = [] } = useUsers();
  const { data: contacts = [] } = useContactsCampagne();
  const update = useUpdateProspection();
  const assigner = useAssignerContacts();

  const [q, setQ] = useState("");
  const [responsable, setResponsable] = useState(MOI);
  const [etape, setEtape] = useState<string>(ALL);
  const [categorie, setCategorie] = useState(ALL);
  const [priorite, setPriorite] = useState(ALL);
  const [aFaire, setAFaire] = useState(false);
  const [limit, setLimit] = useState(GROUPES_PAR_PAGE);
  const [dialogue, setDialogue] = useState<Dialogue>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [pause, setPause] = useState<{ entreprise: string; ids: string[]; motif: string } | null>(
    null,
  );

  const today = todayIso();
  const pipelineById = useMemo(() => new Map(pipeline.map((p) => [p.companyId, p])), [pipeline]);

  // Responsables proposés : ceux du fichier + les comptes du site (prénom).
  const responsables = useMemo(() => {
    const s = new Set(items.map((p) => p.contact.responsable).filter(Boolean));
    for (const u of users) {
      const prenom = u.nomComplet.split(" ")[0];
      if (prenom) s.add(prenom);
    }
    return [...s].sort((a, b) => a.localeCompare(b, "fr"));
  }, [items, users]);

  const mesContacts = useMemo(
    () => items.filter((p) => estAssigneA(p, profile)).length,
    [items, profile],
  );
  // Sans contact assigné à l'utilisateur, on ouvre sur toute l'équipe.
  const responsableEffectif = responsable === MOI && mesContacts === 0 ? ALL : responsable;

  // Filtres hors étape : servent aussi aux compteurs de l'entonnoir.
  const base = useMemo(() => {
    const needle = normaliser(q);
    return items.filter((p) => {
      if (responsableEffectif === MOI && !estAssigneA(p, profile)) return false;
      if (responsableEffectif === SANS && p.contact.responsable) return false;
      if (
        ![ALL, MOI, SANS].includes(responsableEffectif) &&
        p.contact.responsable !== responsableEffectif
      )
        return false;
      if (categorie !== ALL && p.contact.categoriePoste !== categorie) return false;
      if (priorite !== ALL && pipelineById.get(p.entreprise.id)?.priorite !== priorite)
        return false;
      if (aFaire && !aTraiter(p, today)) return false;
      if (
        needle &&
        !normaliser(`${p.contact.nom} ${p.entreprise.nom} ${p.contact.poste}`).includes(needle)
      )
        return false;
      return true;
    });
  }, [items, responsableEffectif, profile, categorie, priorite, pipelineById, aFaire, today, q]);

  const compteurs = useMemo(() => {
    const c = new Map<string, number>();
    for (const p of base) c.set(p.etape, (c.get(p.etape) ?? 0) + 1);
    return c;
  }, [base]);

  const visibles = useMemo(
    () => (etape === ALL ? base : base.filter((p) => p.etape === etape)),
    [base, etape],
  );

  // Contacts de toute l'entreprise (sans filtre) : l'alerte « réponse favorable »
  // doit tenir compte des contacts gérés par les autres membres de l'équipe.
  const parEntreprise = useMemo(() => {
    const m = new Map<string, ProspectionItem[]>();
    for (const p of items) m.set(p.entreprise.id, [...(m.get(p.entreprise.id) ?? []), p]);
    return m;
  }, [items]);

  // Base de contacts : une personne compte une fois même si elle figure dans
  // plusieurs entreprises ; les canaux génériques (contact@, standard,
  // contact de la fondation) sont comptés à part.
  const bilan = useMemo(() => {
    const personnes = new Set<string>();
    let fichesPersonnes = 0;
    let generiques = 0;
    let linkedin = 0;
    let email = 0;
    let telephone = 0;
    const entreprises = new Set<string>();
    for (const c of contacts) {
      entreprises.add(c.entrepriseId);
      if (typeContact(c) === "personne") {
        fichesPersonnes++;
        personnes.add(clePersonne(c));
      } else generiques++;
      if (c.linkedin) linkedin++;
      if (c.email) email++;
      if (c.telephone) telephone++;
    }
    return {
      personnes: personnes.size,
      fichesPersonnes,
      generiques,
      linkedin,
      email,
      telephone,
      entreprises: entreprises.size,
    };
  }, [contacts]);

  const contactsParEntreprise = useMemo(() => {
    const m = new Map<string, ContactCampagne[]>();
    for (const c of contacts) m.set(c.entrepriseId, [...(m.get(c.entrepriseId) ?? []), c]);
    return m;
  }, [contacts]);

  // Entreprises où figure chaque personne (même LinkedIn ou même nom).
  const entreprisesParPersonne = useMemo(() => {
    const m = new Map<string, Map<string, string>>();
    for (const c of contacts) {
      if (typeContact(c) !== "personne") continue;
      const k = clePersonne(c);
      const ents = m.get(k) ?? new Map<string, string>();
      ents.set(c.entrepriseId, c.entrepriseNom);
      m.set(k, ents);
    }
    return m;
  }, [contacts]);
  const aussiChez = useCallback(
    (c: ContactCampagne) =>
      [...(entreprisesParPersonne.get(clePersonne(c)) ?? new Map<string, string>())]
        .filter(([id]) => id !== c.entrepriseId)
        .map(([, nom]) => nom),
    [entreprisesParPersonne],
  );
  const enCampagne = useMemo(() => new Set(items.map((p) => p.contact.id)), [items]);

  const groupes = useMemo(() => {
    const m = new Map<string, ProspectionItem[]>();
    for (const p of visibles) m.set(p.entreprise.id, [...(m.get(p.entreprise.id) ?? []), p]);
    return [...m.entries()]
      .map(([id, list]) => ({
        id,
        nom: list[0]!.entreprise.nom,
        pl: pipelineById.get(id),
        list: list.sort((a, b) => a.contact.nom.localeCompare(b.contact.nom, "fr")),
      }))
      .sort(
        (a, b) =>
          (a.pl ? PRIO_ORDRE[a.pl.priorite] : 3) - (b.pl ? PRIO_ORDRE[b.pl.priorite] : 3) ||
          a.nom.localeCompare(b.nom, "fr"),
      );
  }, [visibles, pipelineById]);

  const change = (p: ProspectionItem, patch: Parameters<typeof update.mutate>[0]["patch"]) =>
    update.mutate(
      { ids: [p.id], patch },
      { onError: (e) => toast.error(e instanceof Error ? e.message : "Échec de l'enregistrement") },
    );

  const assign = (p: ProspectionItem, nom: string) => {
    const matches = users.filter(
      (u) => normaliser(u.nomComplet.split(" ")[0] ?? "") === normaliser(nom),
    );
    assigner.mutate(
      {
        contactIds: [p.contact.id],
        responsable: nom,
        responsableId: matches.length === 1 ? matches[0]!.id : null,
      },
      { onError: (e) => toast.error(e instanceof Error ? e.message : "Échec de l'assignation") },
    );
  };

  // Après une réponse favorable, une redirection ou une demande d'information :
  // proposer de mettre en pause les autres contacts actifs de l'entreprise.
  const proposerPause = (item: ProspectionItem, reponse: Reponse) => {
    if (!REPONSES_PARTAGEES.includes(reponse)) return;
    const autres = (parEntreprise.get(item.entreprise.id) ?? []).filter(
      (p) => p.id !== item.id && !p.enPause && !TERMINEES.includes(p.etape),
    );
    if (autres.length === 0) return;
    setPause({
      entreprise: item.entreprise.nom,
      ids: autres.map((p) => p.id),
      motif: `${reponseLabel(reponse)} de ${item.contact.nom}`,
    });
  };

  const details = detailsId ? (items.find((p) => p.id === detailsId) ?? null) : null;
  const filtresActifs =
    q !== "" ||
    etape !== ALL ||
    categorie !== ALL ||
    priorite !== ALL ||
    aFaire ||
    responsable !== MOI;

  return (
    <AppShell>
      <div className="space-y-5">
        <PageHeader
          title="Prospection"
          description="Suivi contact par contact : invitation, message, relances et réponse. Une réponse favorable est visible par toute l'équipe sur les autres contacts de l'entreprise."
        />

        {contacts.length > 0 && (
          <div className="card-soft grid grid-cols-2 gap-x-4 gap-y-2 p-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
            {[
              {
                n: bilan.personnes,
                label: "personnes",
                hint:
                  bilan.fichesPersonnes > bilan.personnes
                    ? `${bilan.fichesPersonnes - bilan.personnes} présentes dans plusieurs entreprises`
                    : undefined,
              },
              {
                n: bilan.generiques,
                label: "contacts génériques",
                hint: "contact de l'entreprise, de la fondation, standard",
              },
              { n: bilan.linkedin, label: "avec LinkedIn" },
              { n: bilan.email, label: "avec e-mail" },
              { n: bilan.telephone, label: "avec téléphone" },
              { n: bilan.entreprises, label: "entreprises" },
            ].map((s) => (
              <div key={s.label} title={s.hint}>
                <span className="block text-lg font-bold tabular-nums">{s.n}</span>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          {CANAUX.map((c) => (
            <button
              key={c.value}
              type="button"
              disabled={!c.disponible}
              onClick={() => setCanal(c.value)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-all",
                canal === c.value
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40",
                !c.disponible && "cursor-not-allowed opacity-50 hover:border-border",
              )}
            >
              {c.label}
              {!c.disponible && " (bientôt)"}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setEtape(ALL)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-left text-xs transition-colors",
              etape === ALL
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:border-primary/40",
            )}
          >
            <span className="block text-base font-bold tabular-nums">{base.length}</span>
            Tous
          </button>
          {ETAPES_LINKEDIN.map((e) => (
            <button
              key={e.value}
              type="button"
              onClick={() => setEtape(etape === e.value ? ALL : e.value)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-left text-xs transition-colors",
                etape === e.value
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              <span className="block text-base font-bold tabular-nums">
                {compteurs.get(e.value) ?? 0}
              </span>
              {e.court}
            </button>
          ))}
        </div>

        <div className="card-soft flex flex-wrap items-center gap-2 p-3">
          <div className="relative min-w-52 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Contact, entreprise, poste…"
              className="pl-9"
            />
          </div>
          <Select value={responsableEffectif} onValueChange={setResponsable}>
            <SelectTrigger className="h-9 w-48" aria-label="Responsable">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={MOI}>Mes contacts ({mesContacts})</SelectItem>
              <SelectItem value={ALL}>Toute l'équipe</SelectItem>
              <SelectItem value={SANS}>Non assignés</SelectItem>
              {responsables.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categorie} onValueChange={setCategorie}>
            <SelectTrigger className="h-9 w-52" aria-label="Catégorie de poste">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous les postes</SelectItem>
              {CATEGORIES_POSTE.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorite} onValueChange={setPriorite}>
            <SelectTrigger className="h-9 w-44" aria-label="Priorité de l'entreprise">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Toutes priorités</SelectItem>
              <SelectItem value="haute">Priorité haute</SelectItem>
              <SelectItem value="moyenne">Priorité moyenne</SelectItem>
              <SelectItem value="basse">Priorité basse</SelectItem>
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={aFaire} onCheckedChange={(c) => setAFaire(c === true)} />À traiter
          </label>
          {filtresActifs && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ("");
                setEtape(ALL);
                setCategorie(ALL);
                setPriorite(ALL);
                setAFaire(false);
                setResponsable(MOI);
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Réinitialiser
            </Button>
          )}
        </div>

        {isLoading ? (
          <Skeleton className="h-96" />
        ) : items.length === 0 ? (
          <p className="card-soft p-8 text-center text-sm text-muted-foreground">
            Aucun contact dans le suivi LinkedIn. Exécutez la migration 0014 puis l'import des
            contacts (scripts/import-contacts-prospection.mjs).
          </p>
        ) : groupes.length === 0 ? (
          <p className="card-soft p-8 text-center text-sm text-muted-foreground">
            Aucun contact ne correspond à ces critères.
          </p>
        ) : (
          <div className="space-y-3">
            {groupes.slice(0, limit).map((g) => (
              <EntrepriseGroupe
                key={g.id}
                id={g.id}
                nom={g.nom}
                pl={g.pl}
                list={g.list}
                tous={parEntreprise.get(g.id) ?? []}
                contacts={contactsParEntreprise.get(g.id) ?? []}
                enCampagne={enCampagne}
                aussiChez={aussiChez}
                isAdmin={isAdmin}
                responsables={responsables}
                onChange={change}
                onAssign={assign}
                onDialog={setDialogue}
                onDetails={(p) => setDetailsId(p.id)}
                onPauseAutres={(ids, motif) => setPause({ entreprise: g.nom, ids, motif })}
              />
            ))}
            {groupes.length > limit && (
              <div className="flex justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLimit((l) => l + GROUPES_PAR_PAGE)}
                >
                  <ChevronDown className="h-4 w-4" />
                  Afficher {Math.min(GROUPES_PAR_PAGE, groupes.length - limit)} entreprises de plus
                </Button>
                <span className="self-center text-xs text-muted-foreground">
                  {limit} sur {groupes.length}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {dialogue?.type === "modeles" && (
        <ModelesDialog
          key={dialogue.item.id}
          item={dialogue.item}
          open
          onOpenChange={(o) => !o && setDialogue(null)}
          onEnvoye={(to, modeleId) => {
            change(dialogue.item, { etape: to, modele: modeleId });
            toast.success("Message copié, étape mise à jour");
          }}
        />
      )}
      {dialogue?.type === "reponse" && (
        <ReponseDialog
          key={dialogue.item.id}
          item={dialogue.item}
          open
          onOpenChange={(o) => !o && setDialogue(null)}
          onEnregistre={(r) => proposerPause(dialogue.item, r)}
        />
      )}
      <DetailsSheet item={details} onOpenChange={(o) => !o && setDetailsId(null)} />

      <AlertDialog open={Boolean(pause)} onOpenChange={(o) => !o && setPause(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mettre en pause les autres contacts ?</AlertDialogTitle>
            <AlertDialogDescription>
              {pause?.motif} chez {pause?.entreprise}. {pause?.ids.length} autre
              {(pause?.ids.length ?? 0) > 1 ? "s contacts sont" : " contact est"} encore en cours :
              les mettre en pause évite de multiplier les sollicitations. Ils restent visibles et
              peuvent être repris à tout moment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Non, continuer</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pause) return;
                update.mutate(
                  { ids: pause.ids, patch: { enPause: true, pauseMotif: pause.motif } },
                  {
                    onSuccess: () => toast.success("Contacts mis en pause"),
                    onError: (e) => toast.error(e instanceof Error ? e.message : "Échec"),
                  },
                );
                setPause(null);
              }}
            >
              Mettre en pause
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function EntrepriseGroupe({
  id,
  nom,
  pl,
  list,
  tous,
  contacts,
  enCampagne,
  aussiChez,
  isAdmin,
  responsables,
  onChange,
  onAssign,
  onDialog,
  onDetails,
  onPauseAutres,
}: {
  id: string;
  nom: string;
  pl: PipelineItem | undefined;
  list: ProspectionItem[];
  tous: ProspectionItem[];
  contacts: ContactCampagne[];
  enCampagne: Set<string>;
  aussiChez: (c: ContactCampagne) => string[];
  isAdmin: boolean;
  responsables: string[];
  onChange: (
    p: ProspectionItem,
    patch: Parameters<ReturnType<typeof useUpdateProspection>["mutate"]>[0]["patch"],
  ) => void;
  onAssign: (p: ProspectionItem, responsable: string) => void;
  onDialog: (d: Dialogue) => void;
  onDetails: (p: ProspectionItem) => void;
  onPauseAutres: (ids: string[], motif: string) => void;
}) {
  // Réponses utiles obtenues dans l'entreprise, tous responsables confondus.
  const partagees = tous.filter((p) => p.reponse && REPONSES_PARTAGEES.includes(p.reponse));
  const actifsNonPause = tous.filter(
    (p) => !p.enPause && !TERMINEES.includes(p.etape) && !partagees.includes(p),
  );
  const generique = list[0]?.entreprise.contactGenerique ?? "";
  const [infos, setInfos] = useState(false);

  return (
    <section className="card-soft overflow-hidden">
      <header className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
        <Link to="/entreprises/$id" params={{ id }} className="font-semibold hover:underline">
          {nom}
        </Link>
        {pl && <PrioriteBadge priorite={pl.priorite} />}
        {pl && <StatutBadge statut={pl.statut} />}
        <span className="text-xs text-muted-foreground">
          {resumeContacts(contacts, generique)} · {list.length} en campagne
          {tous.length > list.length && ` affiché${list.length > 1 ? "s" : ""} sur ${tous.length}`}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto h-7 text-xs"
          aria-expanded={infos}
          onClick={() => setInfos((v) => !v)}
        >
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", infos && "rotate-180")} />
          Contacts et coordonnées
        </Button>
      </header>

      {infos && (
        <ContactsEntreprise
          contacts={contacts}
          canalGenerique={generique}
          enCampagne={enCampagne}
          aussiChez={aussiChez}
        />
      )}

      {partagees.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-success/30 bg-success/10 px-3 py-2 text-sm">
          <BadgeCheck className="h-4 w-4 shrink-0 text-success" />
          <span className="min-w-0 flex-1">
            {partagees
              .map(
                (p) =>
                  `${reponseLabel(p.reponse!)} de ${p.contact.nom}${p.dates.reponse ? ` le ${fmt(p.dates.reponse)}` : ""}${p.contact.responsable ? ` (suivi par ${p.contact.responsable})` : ""}`,
              )
              .join(" · ")}
          </span>
          {actifsNonPause.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-7"
              onClick={() =>
                onPauseAutres(
                  actifsNonPause.map((p) => p.id),
                  `${reponseLabel(partagees[0]!.reponse!)} de ${partagees[0]!.contact.nom}`,
                )
              }
            >
              <Pause className="h-3.5 w-3.5" />
              Mettre en pause les {actifsNonPause.length} autres
            </Button>
          )}
          {tous.some((p) => p.contact.recommandePar) && (
            <span className="inline-flex items-center gap-1 text-xs text-success">
              <UserPlus className="h-3.5 w-3.5" /> contact recommandé ajouté
            </span>
          )}
        </div>
      )}

      <ul className="divide-y divide-border">
        {list.map((p) => (
          <ContactRow
            key={p.id}
            p={p}
            isAdmin={isAdmin}
            responsables={responsables}
            onChange={onChange}
            onAssign={onAssign}
            onDialog={onDialog}
            onDetails={onDetails}
          />
        ))}
      </ul>
    </section>
  );
}
