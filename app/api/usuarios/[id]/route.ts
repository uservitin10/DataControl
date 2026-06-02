import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { withAuth } from "@/lib/api-guard";
import { addAuditLog } from "@/lib/audit";
import { notifyAdmins, buildEntityNotification } from "@/lib/notification-service";
import { apiSuccess, apiValidationError, apiNotFound, apiInternalError, apiForbidden } from "@/lib/api-response";
import { DEFAULT_PERMISSIONS, normalizePermissionModule, type PermissionModule, type Permissions } from "@/lib/permissions";
import type { Role } from "@/types/dashboard";

type Params = { params: Promise<{ id: string }> };

// GET /api/usuarios/[id] — busca perfil completo com permissões (admin ou próprio usuário)
export async function GET(req: NextRequest, { params }: Params) {
  return withAuth(req, async (user) => {
    try {
      const { id } = await params;

      if (user.role !== "admin" && id !== user.id) {
        return apiForbidden("Acesso negado.");
      }

      const { data: profile, error } = await supabaseServer
        .from("profiles")
        .select("id, email, display_name, role, created_at")
        .eq("id", id)
        .single();

      if (error || !profile) {
        return apiNotFound("Usuário não encontrado.");
      }

      const role = profile.role as Role;
      const permissions: Permissions = {
        ...(DEFAULT_PERMISSIONS[role] ?? DEFAULT_PERMISSIONS.viewer),
      };

      // Permissões do role (tabela role_permissions)
      const { data: rolePerms } = await supabaseServer
        .from("role_permissions")
        .select("can_view, can_edit, can_create, can_delete, module:module_id(name)")
        .eq("role", role);

      if (Array.isArray(rolePerms)) {
        rolePerms.forEach((row) => {
          const r = row as Record<string, unknown>;
          const mod = normalizePermissionModule(
            Array.isArray(r.module) ? (r.module[0] as Record<string, unknown>)?.name as string | undefined : undefined
          );
          if (!mod) return;
          permissions[mod] = {
            view: Boolean(r.can_view),
            edit: Boolean(r.can_edit),
            create: Boolean(r.can_create ?? r.can_edit),
            delete: Boolean(r.can_delete),
          };
        });
      }

      // Permissões individuais sobrescrevem as do role (tabela user_permissions)
      const { data: userPerms } = await supabaseServer
        .from("user_permissions")
        .select("module, can_view, can_edit, can_create, can_delete")
        .eq("user_id", id);

      if (Array.isArray(userPerms)) {
        userPerms.forEach((row) => {
          const r = row as Record<string, unknown>;
          const mod = normalizePermissionModule(r.module as string | undefined);
          if (!mod) return;
          permissions[mod] = {
            view: Boolean(r.can_view),
            edit: Boolean(r.can_edit),
            create: Boolean(r.can_create),
            delete: Boolean(r.can_delete),
          };
        });
      }

      return apiSuccess({ ...profile, permissions });
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  });
}

// PATCH /api/usuarios/[id] — atualiza role e/ou permissões individuais (admin only)
export async function PATCH(req: NextRequest, { params }: Params) {
  return withAuth(req, async (user) => {
    try {
      const { id } = await params;

      if (user.role !== "admin") {
        return apiForbidden("Apenas administradores podem alterar usuários.");
      }

      const body = await req.json();
      const { role, permissions } = body as {
        role?: string;
        permissions?: Partial<Record<PermissionModule, {
          view?: boolean; edit?: boolean; create?: boolean; delete?: boolean;
        }>>;
      };

      const allowedRoles = ["admin", "editor", "viewer", "painel_editor", "sistema_editor", "inventario_editor"];
      if (role && !allowedRoles.includes(role)) {
        return apiValidationError("Role inválida.");
      }

      if (role) {
        const { error } = await supabaseServer
          .from("profiles")
          .update({ role })
          .eq("id", id);
        if (error) return apiInternalError(error.message);
      }

      if (permissions && Object.keys(permissions).length > 0) {
        const rows = Object.entries(permissions)
          .map(([module, perm]) => {
            const mod = normalizePermissionModule(module);
            if (!mod) return null;
            return {
              user_id: id,
              module: mod,
              can_view: Boolean(perm?.view),
              can_edit: Boolean(perm?.edit),
              can_create: Boolean(perm?.create),
              can_delete: Boolean(perm?.delete),
            };
          })
          .filter(Boolean);

        if (rows.length > 0) {
          const { error } = await supabaseServer
            .from("user_permissions")
            .upsert(rows as Record<string, unknown>[], { onConflict: "user_id, module" });
          if (error) return apiInternalError(error.message);
        }
      }

      try {
        const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
        await addAuditLog({
          user_id: user.id,
          action: "update_user",
          resource_type: "profile",
          resource_id: id,
          details: JSON.stringify({ role, permissions }),
          ip_address: ip,
        });

        await notifyAdmins(
          buildEntityNotification(
            "atualizado",
            "perfil de usuário",
            `ID ${id}`,
            user.nome
          ),
          "usuarios"
        );
      } catch (auditErr) {
        console.error("Falha ao gravar auditoria:", auditErr);
      }

      return apiSuccess({ success: true });
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  }, { module: "usuarios", action: "edit" });
}

// DELETE /api/usuarios/[id] — remove usuário (admin only, não pode se autodeletar)
export async function DELETE(req: NextRequest, { params }: Params) {
  return withAuth(req, async (user) => {
    try {
      const { id } = await params;

      if (user.role !== "admin") {
        return apiForbidden("Apenas administradores podem remover usuários.");
      }

      if (id === user.id) {
        return apiForbidden("Você não pode remover sua própria conta.");
      }

      // Verifica se o usuário possui itens de inventário relacionados antes de excluir
      const { count, error: countError } = await supabaseServer
        .from("inventory_items")
        .select("id", { count: "exact", head: true })
        .or(`allocated_user_id.eq.${id},created_by.eq.${id}`);

      if (countError) {
        return apiInternalError(countError.message);
      }

      if (count && count > 0) {
        return apiValidationError(
          "Não é possível remover este usuário enquanto ele tiver itens de inventário relacionados. Reatribua ou exclua os itens primeiro."
        );
      }

      // Remove o usuário do auth (o cascade cuida do profiles via FK)
      const { error } = await supabaseServer.auth.admin.deleteUser(id);
      if (error) return apiInternalError(error.message);

      try {
        const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
        await addAuditLog({
          user_id: user.id,
          action: "delete_user",
          resource_type: "profile",
          resource_id: id,
          details: null,
          ip_address: ip,
        });

        await notifyAdmins(
          buildEntityNotification(
            "excluído",
            "perfil de usuário",
            `ID ${id}`,
            user.nome
          ),
          "usuarios"
        );
      } catch (auditErr) {
        console.error("Falha ao gravar auditoria:", auditErr);
      }

      return apiSuccess({ success: true });
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  }, { module: "usuarios", action: "delete" });
}