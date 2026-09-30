import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  Copy,
  FileText,
  Loader2,
  Mail,
  Paperclip,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { StatutBadge } from "@/components/badges";
import { Button } from "@/components/ui/button";
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
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  buildProspectionEmail,
  formatMAD,
  isInactive,
  isOverdue,
  JOURS_INACTIVITE,
  todayIso,
  weightedAmount,
} from "@/lib/pipeline-utils";
import {
  openDocument,
  useAddHistorique,
  useDeleteDocument,
  useMoveStatut,
  usePipelineDocuments,
  useUpdatePipelineEntry,
  useUploadDocument,
} from "@/lib/queries/pipeline";
import { useAllProjects } from "@/lib/queries/projects";
import { useSousComposantes } from "@/lib/queries/sous-composantes";
import { useUsers } from "@/lib/queries/users";
import {
  STATUTS,
  TYPES_ECHANGE,
  type Company,
  type PipelineItem,
  type PipelineStatut,
  type Priorite,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const NONE = "__none__";
const PRIORITES: Priorite[] = ["haute", "moyenne", "basse"];

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-border p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function MoneyInput({
  id,
  value,
  onCommit,
  disabled,
}: {
  id: string;
  value: number | undefined;
  onCommit: (v: number | null) => void;
  disabled: boolean;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type="number"
        min={0}
        step={1000}
        disabled={disabled}
        defaultValue={value ?? ""}
        key={value ?? "empty"}
        onBlur={(e) => {
          const raw = e.target.value.trim();
          const next = raw === "" ? null : Number(raw);
          if ((next ?? undefined) !== value) onCommit(next);
        }}
        className="pr-14 tabular-nums"
        placeholder="0"
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        MAD
      </span>
    </div>
  );
}

export function DossierPanel({ company, dossier }: { company: Company; dossier: PipelineItem }) {
  const { isAdmin, profile } = useAuth();
  const auteur = profile?.fullName || "Admin";
  const { data: users = [] } = useUsers();
  const { data: projets = [] } = useAllProjects();
  const { data: sousComposantes = [] } = useSousComposantes();
  const update = useUpdatePipelineEntry();
  const move = useMoveStatut();
  const addHistorique = useAddHistorique();
  const { data: documents = [] } = usePipelineDocuments(company.id);
  const upload = useUploadDocument();
  const deleteDoc = useDeleteDocument();
  const fileRef = useRef<HTMLInputElement>(null);

  const [log, setLog] = useState({ type: "Appel", resume: "", nextAction: "", nextDate: "" });
  const [motif, setMotif] = useState(dossier.motifSansSuite ?? "");
  const [emailProjet, setEmailProjet] = useState(
    dossier.projetCibleId ?? company.projets[0] ?? NONE,
  );
  const [emailContact, setEmailContact] = useState(company.contacts[0]?.id ?? NONE);
  const [copied, setCopied] = useState(false);

  const patch = (p: Parameters<typeof update.mutate>[0]["patch"]) =>
    update.mutate(
      { companyId: company.id, patch: p },
      { onError: (e) => toast.error(e instanceof Error ? e.message : "Échec de l'enregistrement") },
    );

  const draft = useMemo(
    () =>
      buildProspectionEmail({
        company,
        contact: company.contacts.find((c) => c.id === emailContact),
        projet: projets.find((p) => p.id === emailProjet),
        sousComposantes,
        signature: profile?.fullName ?? "",
      }),
    [company, emailContact, emailProjet, projets, sousComposantes, profile?.fullName],
  );

  const overdue = isOverdue(dossier);
  const inactive = isInactive(dossier);

  return (
    <div className="space-y-4">
      {(overdue || inactive) && (
        <div className="flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {overdue && "La relance prévue est en retard. "}
            {inactive && `Aucune activité depuis plus de ${JOURS_INACTIVITE} jours.`}
          </span>
        </div>
      )}

      <Section title="Suivi" icon={<CalendarClock className="h-4 w-4" />}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Étape</Label>
            {isAdmin ? (
              <Select
                value={dossier.statut}
                onValueChange={(v) =>
                  move.mutate(
                    {
                      companyId: company.id,
                      from: dossier.statut,
                      to: v as PipelineStatut,
                      auteur,
                    },
                    { onSuccess: () => toast.success("Étape mise à jour") },
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div>
                <StatutBadge statut={dossier.statut} />
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Priorité</Label>
            <Select
              value={dossier.priorite}
              disabled={!isAdmin}
              onValueChange={(v) => patch({ priorite: v as Priorite })}
            >
              <SelectTrigger className="capitalize">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITES.map((p) => (
                  <SelectItem key={p} value={p} className="capitalize">
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Responsable</Label>
            <Select
              value={dossier.responsableId ?? NONE}
              disabled={!isAdmin}
              onValueChange={(v) => {
                const u = users.find((x) => x.id === v);
                patch({ responsableId: u ? u.id : null, responsable: u?.nomComplet ?? "" });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Non assigné" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Non assigné</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nomComplet || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Projet ciblé</Label>
            <Select
              value={dossier.projetCibleId ?? NONE}
              disabled={!isAdmin}
              onValueChange={(v) => patch({ projetCibleId: v === NONE ? null : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Aucun" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Aucun</SelectItem>
                {projets.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mv">Montant visé</Label>
            <MoneyInput
              id="mv"
              value={dossier.montantVise}
              disabled={!isAdmin}
              onCommit={(v) => patch({ montantVise: v })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mo">Montant obtenu</Label>
            <MoneyInput
              id="mo"
              value={dossier.montantObtenu}
              disabled={!isAdmin}
              onCommit={(v) => patch({ montantObtenu: v })}
            />
          </div>
        </div>
        {dossier.montantVise ? (
          <p className="text-xs text-muted-foreground">
            Montant pondéré attendu à cette étape :{" "}
            <strong className="text-foreground">{formatMAD(weightedAmount(dossier))}</strong>
          </p>
        ) : null}
        {dossier.statut === "sans-suite" && isAdmin && (
          <div className="space-y-1.5">
            <Label htmlFor="motif">Motif « sans suite »</Label>
            <Input
              id="motif"
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              onBlur={() =>
                motif !== (dossier.motifSansSuite ?? "") && patch({ motifSansSuite: motif })
              }
              placeholder="Pourquoi le dossier est-il clos ?"
            />
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
          <div className="space-y-1.5">
            <Label htmlFor="pa">Prochaine action</Label>
            <Input
              id="pa"
              disabled={!isAdmin}
              defaultValue={dossier.prochaineAction}
              key={dossier.prochaineAction}
              onBlur={(e) =>
                e.target.value !== dossier.prochaineAction &&
                patch({ prochaineAction: e.target.value })
              }
              placeholder="Ex. Rappeler la directrice RSE"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pad">Échéance</Label>
            <Input
              id="pad"
              type="date"
              disabled={!isAdmin}
              value={dossier.prochaineActionDate ?? ""}
              onChange={(e) => patch({ prochaineActionDate: e.target.value || null })}
              className={cn(overdue && "border-destructive text-destructive")}
            />
          </div>
        </div>
      </Section>

      {isAdmin && (
        <Section title="Consigner un échange" icon={<Plus className="h-4 w-4" />}>
          <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
            <Select value={log.type} onValueChange={(v) => setLog((l) => ({ ...l, type: v }))}>
              <SelectTrigger aria-label="Type d'échange">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...TYPES_ECHANGE, "Note"].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              rows={2}
              value={log.resume}
              onChange={(e) => setLog((l) => ({ ...l, resume: e.target.value }))}
              placeholder="Ce qui a été dit ou décidé…"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_170px]">
            <Input
              value={log.nextAction}
              onChange={(e) => setLog((l) => ({ ...l, nextAction: e.target.value }))}
              placeholder="Relance suivante (facultatif)"
            />
            <Input
              type="date"
              value={log.nextDate}
              onChange={(e) => setLog((l) => ({ ...l, nextDate: e.target.value }))}
              aria-label="Date de la relance suivante"
            />
          </div>
          <Button
            size="sm"
            disabled={!log.resume.trim() || addHistorique.isPending}
            onClick={() =>
              addHistorique.mutate(
                {
                  companyId: company.id,
                  entry: { date: todayIso(), type: log.type, resume: log.resume.trim(), auteur },
                  next:
                    log.nextAction.trim() || log.nextDate
                      ? { action: log.nextAction.trim(), date: log.nextDate || null }
                      : undefined,
                },
                {
                  onSuccess: () => {
                    setLog({ type: "Appel", resume: "", nextAction: "", nextDate: "" });
                    toast.success("Échange enregistré");
                  },
                  onError: (e) => toast.error(e instanceof Error ? e.message : "Échec"),
                },
              )
            }
          >
            {addHistorique.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Enregistrer l'échange
          </Button>
        </Section>
      )}

      <Section title="Email de prospection" icon={<Mail className="h-4 w-4" />}>
        <div className="grid gap-2 sm:grid-cols-2">
          <Select value={emailProjet} onValueChange={setEmailProjet}>
            <SelectTrigger aria-label="Projet">
              <SelectValue placeholder="Projet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Sans projet précis</SelectItem>
              {projets.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={emailContact} onValueChange={setEmailContact}>
            <SelectTrigger aria-label="Contact">
              <SelectValue placeholder="Contact" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Sans destinataire nommé</SelectItem>
              {company.contacts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nom.length > 50 ? `${c.nom.slice(0, 50)}…` : c.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="rounded-lg bg-muted/60 p-3 text-sm">
          <p className="mb-2 font-medium">Objet : {draft.objet}</p>
          <p className="max-h-56 overflow-y-auto whitespace-pre-wrap text-muted-foreground">
            {draft.corps}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(`Objet : ${draft.objet}\n\n${draft.corps}`);
              setCopied(true);
              toast.success("Email copié");
              setTimeout(() => setCopied(false), 1500);
            } catch {
              toast.error("Copie impossible dans ce navigateur");
            }
          }}
        >
          {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
          Copier l'email
        </Button>
      </Section>

      <Section
        title={`Pièces jointes (${documents.length})`}
        icon={<Paperclip className="h-4 w-4" />}
      >
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun document (proposition, convention…).
          </p>
        ) : (
          <ul className="space-y-1">
            {documents.map((d) => (
              <li
                key={d.id}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-secondary"
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <button
                  type="button"
                  onClick={() =>
                    void openDocument(d).catch(() => toast.error("Ouverture impossible"))
                  }
                  className="min-w-0 flex-1 truncate text-left text-sm hover:text-primary hover:underline"
                >
                  {d.nom}
                </button>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(d.createdAt).toLocaleDateString("fr-FR")}
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    aria-label={`Supprimer ${d.nom}`}
                    onClick={() =>
                      deleteDoc.mutate(d, { onSuccess: () => toast.success("Document supprimé") })
                    }
                    className="rounded p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {isAdmin && (
          <>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                upload.mutate(
                  { companyId: company.id, file, auteur },
                  {
                    onSuccess: () => toast.success(`${file.name} ajouté`),
                    onError: (err) =>
                      toast.error(err instanceof Error ? err.message : "Échec de l'envoi"),
                  },
                );
              }}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={upload.isPending}
            >
              {upload.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
              Ajouter un document
            </Button>
          </>
        )}
      </Section>

      <Section title="Historique" icon={<FileText className="h-4 w-4" />}>
        {dossier.historique.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun échange enregistré pour l'instant.</p>
        ) : (
          <ol className="space-y-3 border-l-2 border-border pl-4">
            {dossier.historique.map((h) => (
              <li key={h.id} className="relative">
                <span
                  className={cn(
                    "absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full",
                    h.type === "Statut" ? "bg-brand-orange" : "bg-primary",
                  )}
                />
                <p className="text-xs font-medium text-muted-foreground">
                  {new Date(h.date).toLocaleDateString("fr-FR")} · {h.type} · {h.auteur}
                </p>
                <p className="mt-0.5 text-sm">{h.resume}</p>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}
