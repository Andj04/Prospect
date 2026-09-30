import type { AuditLogEntry } from "@/lib/types";

export const ACTION_LABEL: Record<AuditLogEntry["action"], string> = {
  INSERT: "Création",
  UPDATE: "Modification",
  DELETE: "Suppression",
};

export const ACTION_CLASS: Record<AuditLogEntry["action"], string> = {
  INSERT: "bg-primary/15 text-primary-deep",
  UPDATE: "bg-accent text-accent-foreground",
  DELETE: "bg-destructive/10 text-destructive",
};

export const TABLE_LABEL: Record<AuditLogEntry["tableName"], string> = {
  entreprises: "Entreprise",
  pipeline: "Pipeline",
  pipeline_historique: "Historique pipeline",
  projets: "Projet",
  sous_composantes: "Sous-composante",
  import_batches: "Lot d'import",
};

export function describeEntry(entry: AuditLogEntry, companyName: (id: string) => string) {
  const data = (entry.newData ?? entry.oldData ?? {}) as Record<string, unknown>;
  const str = (key: string) => (typeof data[key] === "string" ? (data[key] as string) : "");

  switch (entry.tableName) {
    case "entreprises":
      return str("nom") || "—";
    case "pipeline":
    case "pipeline_historique":
      return companyName(str("entreprise_id") || entry.recordId);
    case "projets":
    case "sous_composantes":
    case "import_batches":
      return str("label") || str("nom") || "—";
    default:
      return entry.recordId;
  }
}
