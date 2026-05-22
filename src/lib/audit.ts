import { supabaseServer } from "@/lib/supabase-server";

const isAuditTableMissing = (error: unknown) => {
  if (!error) return false;

  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
      ? error.message
      : JSON.stringify(error);

  const maybeCode =
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: string }).code
      : undefined;

  return (
    maybeCode === "PGRST205" ||
    (typeof message === "string" && message.includes("Could not find the table 'public.audit_logs'"))
  );
};

export const addAuditLog = async (payload: {
  user_id: string | null;
  action: string;
  resource_type?: string | null;
  resource_id?: string | null;
  details?: string | null;
  ip_address?: string | null;
}) => {
  const { user_id, action, resource_type, resource_id, details, ip_address } = payload;

  const { data, error } = await supabaseServer
    .from("audit_logs")
    .insert({ user_id, action, resource_type, resource_id, details, ip_address });

  if (error) {
    if (isAuditTableMissing(error)) {
      console.warn("Audit logging não configurado: tabela audit_logs não encontrada.", { payload });
      return { success: false, skipped: true };
    }

    console.error("Erro ao criar log de auditoria:", error);
    return { success: false, error };
  }

  return { success: true, data };
};
