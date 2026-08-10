import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useAuditLog } from "@/lib/queries/audit";
import { useCompanies } from "@/lib/queries/companies";
import type { AuditLogEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/journal")({
  head: () => ({
    meta: [
      { title: "Journal d'activité — Amal Biladi" },
      {
        name: "description",
        content: "Historique des modifications effectuées côté admin sur la base de prospection.",
      },
    ],
  }),
  component: JournalPage,
});

const ACTION_LABEL: Record<AuditLogEntry["action"], string> = {
  INSERT: "Création",
  UPDATE: "Modification",
  DELETE: "Suppression",
};

const ACTION_CLASS: Record<AuditLogEntry["action"], string> = {
  INSERT: "bg-primary/15 text-primary-deep",
  UPDATE: "bg-accent text-accent-foreground",
  DELETE: "bg-destructive/10 text-destructive",
};

const TABLE_LABEL: Record<AuditLogEntry["tableName"], string> = {
  entreprises: "Entreprise",
  pipeline: "Pipeline",
  pipeline_historique: "Historique pipeline",
  projets: "Projet",
};

function describeEntry(entry: AuditLogEntry, companyName: (id: string) => string) {
  const data = (entry.newData ?? entry.oldData ?? {}) as Record<string, unknown>;
  const str = (key: string) => (typeof data[key] === "string" ? (data[key] as string) : "");

  switch (entry.tableName) {
    case "entreprises":
      return str("nom") || "—";
    case "pipeline":
    case "pipeline_historique":
      return companyName(str("entreprise_id") || entry.recordId);
    case "projets":
      return str("nom") || "—";
    default:
      return entry.recordId;
  }
}

function JournalPage() {
  const { isAdmin } = useAuth();
  const { data: entries = [], isLoading } = useAuditLog();
  const { data: companies = [] } = useCompanies();

  const companyName = (id: string) =>
    companies.find((c) => c.id === id)?.nom ?? "Entreprise supprimée";

  if (!isAdmin) {
    return (
      <AppShell>
        <p className="card-soft p-8 text-center text-sm text-muted-foreground">
          Cette page est réservée à la vue Admin.
        </p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Journal d'activité</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Qui a créé, modifié ou supprimé quoi côté admin — visible uniquement par les
            administrateurs.
          </p>
        </div>

        <div className="card-soft overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Date</th>
                <th className="px-4 py-3 text-left font-semibold">Auteur</th>
                <th className="px-4 py-3 text-left font-semibold">Action</th>
                <th className="px-4 py-3 text-left font-semibold">Élément</th>
                <th className="px-4 py-3 text-left font-semibold">Détail</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const company = companies.find(
                  (c) =>
                    c.id ===
                    (entry.tableName === "entreprises"
                      ? entry.recordId
                      : ((entry.newData ?? entry.oldData)?.["entreprise_id"] as
                          string | undefined)),
                );
                return (
                  <tr key={entry.id} className="border-t border-border hover:bg-muted/40">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString("fr-FR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium">{entry.actorName || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                          ACTION_CLASS[entry.action],
                        )}
                      >
                        {ACTION_LABEL[entry.action]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {TABLE_LABEL[entry.tableName]}
                    </td>
                    <td className="px-4 py-3">
                      {company ? (
                        <Link
                          to="/entreprises/$id"
                          params={{ id: company.id }}
                          className="text-primary hover:underline"
                        >
                          {describeEntry(entry, companyName)}
                        </Link>
                      ) : (
                        describeEntry(entry, companyName)
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!isLoading && entries.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              Aucune activité enregistrée pour le moment.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
