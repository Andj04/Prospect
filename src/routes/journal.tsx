import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useAuditLog } from "@/lib/queries/audit";
import { useCompanies } from "@/lib/queries/companies";
import { ACTION_CLASS, ACTION_LABEL, TABLE_LABEL, describeEntry } from "@/lib/audit-format";
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
        <PageHeader
          title="Journal d'activité"
          description="Qui a créé, modifié ou supprimé quoi côté admin — visible uniquement par les administrateurs."
        />

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
