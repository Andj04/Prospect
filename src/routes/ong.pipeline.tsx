import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarClock, Search, User } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/page-header";
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
import { isOngOverdue, normaliser, ONG_STATUT_DOT } from "@/lib/ong-utils";
import { useOngList } from "@/lib/queries/ong";
import { useMoveOngStatut, useOngPipeline } from "@/lib/queries/pipeline-ong";
import { STATUTS_ONG, type OngPipelineStatut } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ong/pipeline")({
  head: () => ({ meta: [{ title: "Pipeline ONG — Prospection RSE Amal Biladi" }] }),
  component: PipelineOngPage,
});

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : "");

function PipelineOngPage() {
  const { isAdmin, profile } = useAuth();
  const { data: list = [], isLoading } = useOngList();
  const { data: pipeline = [] } = useOngPipeline();
  const move = useMoveOngStatut();
  const [q, setQ] = useState("");

  const nameOf = useMemo(() => new Map(list.map((o) => [o.id, o])), [list]);
  const needle = normaliser(q);
  const items = pipeline.filter((p) => {
    const o = nameOf.get(p.ongId);
    return o && (!needle || normaliser(o.recherche).includes(needle));
  });

  return (
    <AppShell>
      <div className="space-y-5">
        <PageHeader
          title="Pipeline ONG"
          description="Suivi des prises de contact avec les ONG. Pas de montants : une ONG n'est pas un financeur, l'enjeu est le réseau, l'expertise ou le relais terrain qu'elle apporte."
        />
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filtrer par nom, ville, thématique…"
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <Skeleton className="h-96" />
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-3">
            {STATUTS_ONG.map((s) => {
              const col = items.filter((p) => p.statut === s.value);
              return (
                <section key={s.value} className="w-72 shrink-0">
                  <header className="mb-2 flex items-center gap-2">
                    <span className={cn("h-2.5 w-2.5 rounded-full", ONG_STATUT_DOT[s.value])} />
                    <h2 className="text-sm font-semibold">{s.label}</h2>
                    <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
                      {col.length}
                    </span>
                  </header>
                  <div className="max-h-[70vh] space-y-2 overflow-y-auto rounded-xl bg-muted/40 p-2">
                    {col.map((p) => {
                      const o = nameOf.get(p.ongId)!;
                      const late = isOngOverdue(p);
                      return (
                        <article key={p.ongId} className="card-soft space-y-2 p-3">
                          <Link
                            to="/ong/$id"
                            params={{ id: o.id }}
                            className="block text-sm font-semibold leading-snug hover:underline"
                          >
                            {o.nom}
                          </Link>
                          {p.responsable && (
                            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              {p.responsable}
                            </p>
                          )}
                          {(p.prochaineAction || p.prochaineActionDate) && (
                            <p
                              className={cn(
                                "flex items-start gap-1.5 text-xs",
                                late ? "font-semibold text-destructive" : "text-muted-foreground",
                              )}
                            >
                              <CalendarClock className="mt-0.5 h-3 w-3 shrink-0" />
                              <span>
                                {p.prochaineAction}
                                {p.prochaineActionDate && ` · ${fmt(p.prochaineActionDate)}`}
                              </span>
                            </p>
                          )}
                          {isAdmin && (
                            <Select
                              value={p.statut}
                              onValueChange={(to) => {
                                let motif: string | undefined;
                                if (to === "sans-suite") {
                                  const a = window.prompt("Motif du classement sans suite ?");
                                  if (a === null) return;
                                  motif = a.trim();
                                }
                                move.mutate(
                                  {
                                    ongId: p.ongId,
                                    from: p.statut,
                                    to: to as OngPipelineStatut,
                                    auteur: profile?.fullName ?? "",
                                    ...(motif !== undefined ? { motif } : {}),
                                  },
                                  {
                                    onError: (e) =>
                                      toast.error(e instanceof Error ? e.message : "Échec"),
                                  },
                                );
                              }}
                            >
                              <SelectTrigger
                                className="h-8 text-xs"
                                aria-label={`Statut de ${o.nom}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUTS_ONG.map((x) => (
                                  <SelectItem key={x.value} value={x.value}>
                                    {x.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </article>
                      );
                    })}
                    {col.length === 0 && (
                      <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                        Aucune ONG
                      </p>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
