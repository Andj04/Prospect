import { useState } from "react";
import { toast } from "sonner";
import { OngStatutBadge } from "@/components/ong/ong-badges";
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
import { todayIso } from "@/lib/pipeline-utils";
import {
  useAddOngHistorique,
  useMoveOngStatut,
  useUpdateOngPipelineEntry,
  type OngPipelinePatch,
} from "@/lib/queries/pipeline-ong";
import {
  STATUTS_ONG,
  TYPES_ECHANGE,
  type OngPipelineItem,
  type OngPipelineStatut,
} from "@/lib/types";

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : "—");

// Suivi d'une ONG : statut, responsable, relance, contact interne et historique.
// Pas de montants ni de probabilité : une ONG n'est pas un financeur.
export function OngSuiviPanel({ ongId, dossier }: { ongId: string; dossier: OngPipelineItem }) {
  const { isAdmin, profile } = useAuth();
  const auteur = profile?.fullName ?? "";
  const move = useMoveOngStatut();
  const update = useUpdateOngPipelineEntry();
  const addHistorique = useAddOngHistorique();

  const [type, setType] = useState<string>(TYPES_ECHANGE[0]);
  const [resume, setResume] = useState("");
  const [date, setDate] = useState(todayIso());
  const [nextAction, setNextAction] = useState("");
  const [nextDate, setNextDate] = useState("");

  const patch = (p: OngPipelinePatch) => update.mutate({ ongId, patch: p });
  const fail = (e: unknown) =>
    toast.error(e instanceof Error ? e.message : "Échec de l'enregistrement");

  const changeStatut = (to: OngPipelineStatut) => {
    let motif: string | undefined;
    if (to === "sans-suite") {
      const answer = window.prompt("Motif du classement sans suite ?");
      if (answer === null) return;
      motif = answer.trim();
    }
    move.mutate(
      { ongId, from: dossier.statut, to, auteur, ...(motif !== undefined ? { motif } : {}) },
      { onError: fail },
    );
  };

  const field = "grid gap-1.5";
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className={field}>
          <Label>Statut</Label>
          {isAdmin ? (
            <Select
              value={dossier.statut}
              onValueChange={(v) => changeStatut(v as OngPipelineStatut)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUTS_ONG.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div>
              <OngStatutBadge statut={dossier.statut} />
            </div>
          )}
          {dossier.statut === "sans-suite" && dossier.motifSansSuite && (
            <p className="text-xs text-muted-foreground">Motif : {dossier.motifSansSuite}</p>
          )}
          <p className="text-xs text-muted-foreground">Depuis le {fmt(dossier.statutDepuis)}</p>
        </div>
        <div className={field}>
          <Label htmlFor={`resp-${ongId}`}>Responsable</Label>
          <Input
            id={`resp-${ongId}`}
            key={dossier.responsable}
            defaultValue={dossier.responsable}
            disabled={!isAdmin}
            placeholder="Non assigné"
            onBlur={(e) =>
              e.target.value !== dossier.responsable && patch({ responsable: e.target.value })
            }
          />
        </div>
        <div className={field}>
          <Label htmlFor={`ci-${ongId}`}>Contact interne côté ONG</Label>
          <Input
            id={`ci-${ongId}`}
            key={dossier.contactInterne}
            defaultValue={dossier.contactInterne}
            disabled={!isAdmin}
            onBlur={(e) =>
              e.target.value !== dossier.contactInterne && patch({ contactInterne: e.target.value })
            }
          />
        </div>
        <div className={field}>
          <Label>Dernier contact</Label>
          <p className="flex h-9 items-center text-sm">{fmt(dossier.dernierContact)}</p>
        </div>
        <div className={field}>
          <Label htmlFor={`pa-${ongId}`}>Prochaine action</Label>
          <Input
            id={`pa-${ongId}`}
            key={dossier.prochaineAction}
            defaultValue={dossier.prochaineAction}
            disabled={!isAdmin}
            onBlur={(e) =>
              e.target.value !== dossier.prochaineAction &&
              patch({ prochaineAction: e.target.value })
            }
          />
        </div>
        <div className={field}>
          <Label htmlFor={`pad-${ongId}`}>Échéance</Label>
          <Input
            id={`pad-${ongId}`}
            type="date"
            key={dossier.prochaineActionDate ?? ""}
            defaultValue={dossier.prochaineActionDate ?? ""}
            disabled={!isAdmin}
            onBlur={(e) =>
              (e.target.value || null) !== (dossier.prochaineActionDate ?? null) &&
              patch({ prochaineActionDate: e.target.value || null })
            }
          />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Historique</h3>
        {isAdmin && (
          <form
            className="mb-4 grid gap-3 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-[9rem_9rem_1fr]"
            onSubmit={(e) => {
              e.preventDefault();
              if (!resume.trim()) return;
              addHistorique.mutate(
                {
                  ongId,
                  entry: { date, type, resume: resume.trim(), auteur },
                  ...(nextAction || nextDate
                    ? {
                        next: {
                          action: nextAction || dossier.prochaineAction,
                          date: nextDate || null,
                        },
                      }
                    : {}),
                },
                {
                  onSuccess: () => {
                    setResume("");
                    setNextAction("");
                    setNextDate("");
                    toast.success("Échange enregistré");
                  },
                  onError: fail,
                },
              );
            }}
          >
            <Select value={type} onValueChange={setType}>
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
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Date"
            />
            <Textarea
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              placeholder="Résumé de l'échange…"
              rows={2}
              className="sm:row-span-2"
            />
            <Input
              value={nextAction}
              onChange={(e) => setNextAction(e.target.value)}
              placeholder="Prochaine action (facultatif)"
              className="sm:col-span-1"
            />
            <Input
              type="date"
              value={nextDate}
              onChange={(e) => setNextDate(e.target.value)}
              aria-label="Échéance de la prochaine action"
            />
            <div className="sm:col-span-3">
              <Button type="submit" size="sm" disabled={!resume.trim() || addHistorique.isPending}>
                Ajouter à l'historique
              </Button>
            </div>
          </form>
        )}
        {dossier.historique.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun échange enregistré.</p>
        ) : (
          <ol className="space-y-2">
            {dossier.historique.map((h) => (
              <li key={h.id} className="rounded-lg border border-border p-3 text-sm">
                <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{h.type}</span>
                  <span>{fmt(h.date)}</span>
                  {h.auteur && <span>· {h.auteur}</span>}
                </p>
                <p className="mt-1 whitespace-pre-wrap">{h.resume}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
