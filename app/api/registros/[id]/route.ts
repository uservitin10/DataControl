import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { withAuth } from "@/lib/api-guard";
import { addAuditLog } from "@/lib/audit";
import { notifyAdmins, buildEntityNotification } from "@/lib/notification-service";
import { validateObject, sanitizeObject, VALIDATION_SCHEMAS, ALLOWED_REGISTRO_FIELDS } from "@/lib/validation";
import { apiSuccess, apiValidationError, apiNotFound, apiInternalError } from "@/lib/api-response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(request, async () => {
    try {
      const { id } = await params;

      const { data, error } = await supabaseServer
        .from("registros")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        return apiNotFound("Registro não encontrado");
      }

      return apiSuccess(data);
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  }, { module: "dashboard", action: "view" });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (user) => {
    try {
      const { id } = await params;
      const body = await req.json();

      // Validar usando schema reutilizável
      const validationError = validateObject(body, VALIDATION_SCHEMAS.atualizarRegistro);
      if (validationError) {
        return apiValidationError(validationError);
      }

      // Limpar e manter apenas campos permitidos
      const patchBody = sanitizeObject(body, ALLOWED_REGISTRO_FIELDS);

      const { data, error } = await supabaseServer
        .from("registros")
        .update(patchBody)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return apiNotFound("Registro não encontrado");
      }

      // Registrar auditoria (não bloqueante)
      try {
        const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
        await addAuditLog({
          user_id: user.id,
          action: "Editou painel",
          resource_type: "dashboard",
          resource_id: String(id),
          details: JSON.stringify(patchBody),
          ip_address: ip,
        });

        await notifyAdmins(
          buildEntityNotification(
            "atualizado",
            "registro",
            `ID ${id}`,
            user.nome
          ),
          "dashboard"
        );
      } catch (auditErr) {
        console.error("Falha ao gravar auditoria (não bloqueante):", auditErr);
      }

      return apiSuccess(data);
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  }, { module: "dashboard", action: "edit" });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withAuth(req, async (user) => {
    try {
      const { id } = await params;
      
      const { error } = await supabaseServer.from("registros").delete().eq("id", id);

      if (error) {
        return apiNotFound("Registro não encontrado");
      }

      // Registrar auditoria (não bloqueante)
      try {
        const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
        await addAuditLog({
          user_id: user.id,
          action: "Excluiu painel",
          resource_type: "dashboard",
          resource_id: String(id),
          details: null,
          ip_address: ip,
        });

        await notifyAdmins(
          buildEntityNotification(
            "excluído",
            "registro",
            `ID ${id}`,
            user.nome
          ),
          "dashboard"
        );
      } catch (auditErr) {
        console.error("Falha ao gravar auditoria (não bloqueante):", auditErr);
      }

      return apiSuccess({ success: true });
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  }, { module: "dashboard", action: "delete" });
}