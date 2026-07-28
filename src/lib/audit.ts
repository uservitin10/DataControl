import pool from "@/lib/db";

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
    maybeCode === "42P01" ||
    (typeof message === "string" && message.includes("audit_logs"))
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

  try {
    const result = await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [user_id, action, resource_type ?? null, resource_id ?? null, details ?? null, ip_address ?? null]
    );

    return { success: true, data: result.rows[0] };
  } catch (error) {
    if (isAuditTableMissing(error)) {
      console.warn("Audit logging não configurado: tabela audit_logs não encontrada.", { payload });
      return { success: false, skipped: true };
    }

    console.error("Erro ao criar log de auditoria:", error);
    return { success: false, error };
  }
};
