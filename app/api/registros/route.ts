import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { withAuth, withOptionalAuth } from "@/lib/api-guard";
import { addAuditLog } from "@/lib/audit";
import { validateObject, sanitizeObject, VALIDATION_SCHEMAS, ALLOWED_REGISTRO_FIELDS } from "@/lib/validation";
import { apiSuccess, apiCreated, apiValidationError, apiInternalError } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  return withOptionalAuth(request, async () => {
    try {
      const { data, error } = await supabaseServer
        .from("registros")
        .select("*")
        .eq("tipo_acesso", "publico") // Apenas registros públicos para visitantes
        .order("created_at", { ascending: false });

      if (error) {
        return apiInternalError(error.message);
      }

      return apiSuccess(data ?? []);
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  });
}

export async function POST(req: NextRequest) {
  return withAuth(req, async (user) => {
    try {
      const body = await req.json();
      
      // Validar usando schema reutilizável
      const validationError = validateObject(body, VALIDATION_SCHEMAS.criarRegistro);
      if (validationError) {
        return apiValidationError(validationError);
      }

      // Limpar e manter apenas campos permitidos
      const cleanBody = sanitizeObject(body, ALLOWED_REGISTRO_FIELDS);
      
      const { data, error } = await supabaseServer.from("registros").insert(cleanBody);
      if (error) {
        return apiInternalError(error.message);
      }

      // Registrar auditoria (não bloqueante)
      try {
        const createdId = Array.isArray(data) ? data?.[0]?.id : (data as any)?.id;
        const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
        await addAuditLog({
          user_id: user.id,
          action: "Criou painel",
          resource_type: "dashboard",
          resource_id: createdId ? String(createdId) : null,
          details: JSON.stringify(cleanBody),
          ip_address: ip,
        });
      } catch (auditErr) {
        console.error("Falha ao gravar auditoria (não bloqueante):", auditErr);
      }

      return apiCreated(data);
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  }, { module: "dashboard", action: "edit" });
}
