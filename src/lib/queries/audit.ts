import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { mapAuditLogEntry, type AuditLogRow } from "@/lib/mappers";
import type { AuditLogEntry } from "@/lib/types";

const AUDIT_LOG_KEY = ["audit-log"] as const;

export function useAuditLog() {
  return useQuery({
    queryKey: AUDIT_LOG_KEY,
    queryFn: async (): Promise<AuditLogEntry[]> => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data as AuditLogRow[]).map(mapAuditLogEntry);
    },
  });
}
