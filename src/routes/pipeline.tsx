import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpDown, ChevronRight, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PrioriteBadge, ProjetTag, StatutBadge, projetLabel } from "@/components/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useCompanies } from "@/lib/queries/companies";
import { useAddHistorique, usePipeline, useUpdatePipelineEntry } from "@/lib/queries/pipeline";
import { useAllProjects, useProjects } from "@/lib/queries/projects";
import { STATUTS, type PipelineStatut, type Priorite } from "@/lib/types";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { title: "Pipeline de prospection — Amal Biladi" },
      {
        name: "description",
        content:
          "Suivi du pipeline de prospection RSE : statuts, priorités, responsables et historique des échanges.",
      },
      { property: "og:title", content: "Pipeline de prospection — Amal Biladi" },
      {
        property: "og:description",
        content: "Statuts, priorités, responsables et prochaines actions par entreprise.",
      },
    ],
  }),
  component: PipelinePage,
});

const ALL = "__all__";
const PRIORITES: Priorite[] = ["haute", "moyenne", "basse"];

function PipelinePage() {
  const { isAdmin } = useAuth();
  const { data: companies = [] } = useCompanies();
  const { data: pipeline = [] } = usePipeline();
  const { data: projets = [] } = useProjects();
  const { data: allProjets = [] } = useAllProjects();
  const updatePipeline = useUpdatePipelineEntry();
  const addHistorique = useAddHistorique();

  const [statut, setStatut] = useState(ALL);
  const [resp, setResp] = useState(ALL);
  const [prio, setPrio] = useState(ALL);
  const [projetFilter, setProjetFilter] = useState(ALL);
  const [dir, setDir] = useState<1 | -1>(-1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState({ type: "Appel", resume: "" });

  const responsables = useMemo(
    () => Array.from(new Set(pipeline.map((p) => p.responsable).filter(Boolean))),
    [pipeline],
  );

  const rows = useMemo(() => {
    return pipeline
      .filter(
        (p) =>
          (statut === ALL || p.statut === statut) &&
          (resp === ALL || p.responsable === resp) &&
          (prio === ALL || p.priorite === prio) &&
          (projetFilter === ALL ||
            (companies.find((c) => c.id === p.companyId)?.projets.includes(projetFilter) ?? false)),
      )
      .sort((a, b) => a.dernierContact.localeCompare(b.dernierContact) * dir);
  }, [pipeline, statut, resp, prio, projetFilter, companies, dir]);

  const nameOf = (id: string) => companies.find((c) => c.id === id)?.nom ?? "—";
  const current = openId ? pipeline.find((p) => p.companyId === openId) : undefined;

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pipeline de prospection</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin
              ? "Édition complète : statut, priorité, responsable et historique."
              : "Consultation en lecture seule."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Select value={statut} onValueChange={setStatut}>
            <SelectTrigger className="w-[230px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous les statuts</SelectItem>
              {STATUTS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={resp} onValueChange={setResp}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous les responsables</SelectItem>
              {responsables.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={prio} onValueChange={setPrio}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Toutes les priorités</SelectItem>
              {PRIORITES.map((p) => (
                <SelectItem key={p} value={p} className="capitalize">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={projetFilter} onValueChange={setProjetFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous les projets</SelectItem>
              {projets.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="card-soft overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Entreprise</th>
                <th className="px-4 py-3 text-left font-semibold">Statut</th>
                <th className="px-4 py-3 text-left font-semibold">Priorité</th>
                <th className="px-4 py-3 text-left font-semibold">Responsable</th>
                <th className="px-4 py-3 text-left font-semibold">
                  <button
                    className="inline-flex items-center gap-1 hover:text-primary"
                    onClick={() => setDir((d) => (d === 1 ? -1 : 1))}
                  >
                    Dernier contact <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-semibold">Prochaine action</th>
                <th className="px-4 py-3 text-left font-semibold">Projet(s)</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const company = companies.find((c) => c.id === p.companyId);
                return (
                  <tr
                    key={p.companyId}
                    className="cursor-pointer border-t border-border transition-colors hover:bg-muted/40"
                    onClick={() => setOpenId(p.companyId)}
                  >
                    <td className="px-4 py-3 font-medium">{nameOf(p.companyId)}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {isAdmin ? (
                        <Select
                          value={p.statut}
                          onValueChange={(v) => {
                            updatePipeline.mutate(
                              { companyId: p.companyId, patch: { statut: v as PipelineStatut } },
                              { onSuccess: () => toast.success("Statut mis à jour") },
                            );
                          }}
                        >
                          <SelectTrigger className="h-8 w-[210px]">
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
                        <StatutBadge statut={p.statut} />
                      )}
                      {p.statut === "sans-suite" && p.motifSansSuite && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Motif : {p.motifSansSuite}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {isAdmin ? (
                        <Select
                          value={p.priorite}
                          onValueChange={(v) =>
                            updatePipeline.mutate({
                              companyId: p.companyId,
                              patch: { priorite: v as Priorite },
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-[120px] capitalize">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PRIORITES.map((x) => (
                              <SelectItem key={x} value={x} className="capitalize">
                                {x}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <PrioriteBadge priorite={p.priorite} />
                      )}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {isAdmin ? (
                        <Input
                          defaultValue={p.responsable}
                          onBlur={(e) =>
                            updatePipeline.mutate({
                              companyId: p.companyId,
                              patch: { responsable: e.target.value },
                            })
                          }
                          className="h-8 w-[160px]"
                        />
                      ) : (
                        p.responsable
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.dernierContact}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.prochaineAction}</td>
                    <td className="px-4 py-3">
                      <div className="flex max-w-[220px] flex-wrap gap-1">
                        {company?.projets.map((id) => (
                          <ProjetTag key={id} nom={projetLabel(allProjets, id)} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              Aucune entrée pour ces filtres.
            </p>
          )}
        </div>
      </div>

      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {current && (
            <>
              <SheetHeader>
                <SheetTitle>{nameOf(current.companyId)}</SheetTitle>
                <SheetDescription>Historique des actions de prospection</SheetDescription>
              </SheetHeader>
              <div className="space-y-5 px-4 pb-8">
                <div className="flex flex-wrap items-center gap-2">
                  <StatutBadge statut={current.statut} />
                  <PrioriteBadge priorite={current.priorite} />
                  <Button variant="outline" size="sm" asChild className="ml-auto">
                    <Link to="/entreprises/$id" params={{ id: current.companyId }}>
                      Voir la fiche
                    </Link>
                  </Button>
                </div>

                {isAdmin && (
                  <div className="rounded-lg border border-border p-4">
                    <h3 className="mb-3 text-sm font-semibold">Ajouter une entrée</h3>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label>Type d'action</Label>
                        <Select
                          value={note.type}
                          onValueChange={(v) => setNote((n) => ({ ...n, type: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["Appel", "Email", "Réunion", "Proposition", "Visite", "Décision"].map(
                              (t) => (
                                <SelectItem key={t} value={t}>
                                  {t}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Résumé</Label>
                        <Textarea
                          rows={3}
                          value={note.resume}
                          onChange={(e) => setNote((n) => ({ ...n, resume: e.target.value }))}
                          placeholder="Ce qui a été dit ou décidé…"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!note.resume.trim()) return;
                          addHistorique.mutate(
                            {
                              companyId: current.companyId,
                              entry: {
                                date: new Date().toISOString().slice(0, 10),
                                type: note.type,
                                resume: note.resume,
                                auteur: "Vous (Admin)",
                              },
                            },
                            {
                              onSuccess: () => {
                                setNote({ type: "Appel", resume: "" });
                                toast.success("Entrée ajoutée à l'historique");
                              },
                            },
                          );
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        Ajouter
                      </Button>
                    </div>
                  </div>
                )}

                <ol className="space-y-3 border-l-2 border-border pl-4">
                  {current.historique.map((h) => (
                    <li key={h.id} className="relative">
                      <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                      <p className="text-xs font-medium text-muted-foreground">
                        {h.date} · {h.type} · {h.auteur}
                      </p>
                      <p className="mt-0.5 text-sm">{h.resume}</p>
                    </li>
                  ))}
                  {current.historique.length === 0 && (
                    <li className="text-sm text-muted-foreground">Aucun historique.</li>
                  )}
                </ol>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
