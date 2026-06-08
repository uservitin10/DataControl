import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { withAuth } from "@/lib/api-guard";
import { apiSuccess, apiValidationError, apiNotFound, apiInternalError, apiForbidden } from "@/lib/api-response";
import { addAuditLog } from "../../../src/lib/audit";
import { DEFAULT_PERMISSIONS, normalizePermissionModule, type PermissionModule, type Permissions } from "@/lib/permissions";
import { getProfileById } from "@/lib/profile";
import { sanitizeText } from "@/lib/text";
import type { Role } from "@/types/dashboard";

export async function GET(req: NextRequest) {
  return withAuth(req, async (user) => {
    try {
      const url = new URL(req.url);
      let id = url.searchParams.get("id");

      // Se não foi fornecido id, consulta o próprio usuário
      if (!id) {
        id = user.id as string | null;
      }

      if (!id) {
        return apiValidationError("Id de usuário é obrigatório.");
      }

      // Permitir apenas que o próprio usuário consulte seu perfil, a menos que seja admin
      if (user.role !== "admin" && id !== user.id) {
        return apiForbidden("Acesso negado");
      }

      const profile = await getProfileById(id);

      // Se o perfil não existe e o usuário está consultando seu próprio perfil, criar automaticamente
      if (!profile && id === user.id) {
        const authUser = await supabaseServer.auth.admin.getUserById(id);
        const displayName = sanitizeText(
          authUser.data?.user?.user_metadata?.display_name ||
          authUser.data?.user?.email ||
          "Usuário"
        );
        
        const { data: newProfile, error: createError } = await supabaseServer
          .from("profiles")
          .insert({
            id,
            display_name: displayName,
            role: "viewer",
          })
          .select("role, display_name")
          .single();

        if (createError) {
          return apiInternalError(`Erro ao criar perfil: ${createError.message}`);
        }

        if (!newProfile) {
          return apiInternalError("Perfil criado mas não foi possível recuperar os dados");
        }

        // Retornar o perfil recém-criado com permissões padrão
        const defaultPermissions = DEFAULT_PERMISSIONS.viewer;
        return apiSuccess({
          role: newProfile.role,
          display_name: newProfile.display_name,
          permissions: defaultPermissions,
        });
      }

      if (!profile) {
        return apiNotFound("Perfil não encontrado");
      }

      const sanitizedDisplayName = sanitizeText(profile.display_name);
      if (sanitizedDisplayName !== profile.display_name) {
        await supabaseServer
          .from("profiles")
          .update({ display_name: sanitizedDisplayName })
          .eq("id", id);
        profile.display_name = sanitizedDisplayName;
      }

      const role = profile.role as Role | undefined;
      const defaultPermissions = role && DEFAULT_PERMISSIONS[role] ? DEFAULT_PERMISSIONS[role] : DEFAULT_PERMISSIONS.viewer;
      const permissions: Permissions = { ...defaultPermissions };

      if (role) {
        type RolePermissionRow = {
          module?: Array<{ name?: string }>;
          can_view?: boolean;
          can_edit?: boolean;
          can_create?: boolean;
          can_delete?: boolean;
        };

        const { data: permissionsData, error: permissionsError } = await supabaseServer
          .from("role_permissions")
          .select("can_view,can_edit,can_create,can_delete,module:module_id(name)")
          .eq("role", role);

        if (!permissionsError && Array.isArray(permissionsData)) {
          permissionsData.forEach((row: RolePermissionRow) => {
            const moduleName = normalizePermissionModule(Array.isArray(row.module) ? row.module[0]?.name : undefined);
            if (!moduleName) return;

            const permission = {
              view: Boolean(row.can_view),
              edit: Boolean(row.can_edit),
              create: Boolean(row.can_create ?? row.can_edit),
              delete: Boolean(row.can_delete),
            };

            permissions[moduleName] = permission;
          });
        }
      }

      const { data: userPermissionsData, error: userPermissionsError } = await supabaseServer
        .from("user_permissions")
        .select("module,can_view,can_edit,can_create,can_delete")
        .eq("user_id", id);

      if (!userPermissionsError && Array.isArray(userPermissionsData)) {
        userPermissionsData.forEach((row: { module?: string; can_view?: boolean; can_edit?: boolean; can_create?: boolean; can_delete?: boolean }) => {
          const moduleName = normalizePermissionModule(row.module);
          if (!moduleName) return;

          permissions[moduleName] = {
            view: Boolean(row.can_view),
            edit: Boolean(row.can_edit),
            create: Boolean(row.can_create),
            delete: Boolean(row.can_delete),
          };
        });
      }

      return apiSuccess({
        role: profile.role,
        display_name: profile.display_name,
        permissions,
      });
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  });
}

type PermissionPayload = Partial<Record<PermissionModule, { view?: boolean; edit?: boolean; create?: boolean; delete?: boolean }>>;

export async function PATCH(req: NextRequest) {
  return withAuth(req, async (user) => {
    try {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");

      if (!id) {
        return apiValidationError("Id de usuário é obrigatório.");
      }

      if (user.role !== "admin") {
        return apiForbidden("Apenas administradores podem alterar roles e permissões.");
      }

      const body = await req.json();
      const { role, permissions } = body as { role?: string; permissions?: PermissionPayload };
      const allowedRoles = ["admin", "editor", "viewer", "painel_editor", "sistema_editor", "inventario_editor"];

      if (role && !allowedRoles.includes(role)) {
        return apiValidationError("Role inválida.");
      }

      if (role) {
        const { error: updateError } = await supabaseServer
          .from("profiles")
          .update({ role })
          .eq("id", id);

        if (updateError) {
          return apiInternalError(updateError.message);
        }
      }

      if (permissions && Object.keys(permissions).length > 0) {
        type UserPermissionInsert = {
          user_id: string;
          module: PermissionModule;
          can_view: boolean;
          can_edit: boolean;
          can_create: boolean;
          can_delete: boolean;
        };

        const rows = Object.entries(permissions)
          .map(([module, perm]) => {
            const normalizedModule = normalizePermissionModule(module);
            if (!normalizedModule) return null;
            return {
              user_id: id,
              module: normalizedModule,
              can_view: Boolean(perm?.view),
              can_edit: Boolean(perm?.edit),
              can_create: Boolean(perm?.create),
              can_delete: Boolean(perm?.delete),
            };
          })
          .filter((row): row is UserPermissionInsert => row !== null);

        if (rows.length > 0) {
          const { error: permissionsError } = await supabaseServer
            .from("user_permissions")
            .upsert(rows, { onConflict: "user_id, module" });

          if (permissionsError) {
            return apiInternalError(permissionsError.message);
          }
        }
      }

      // Registrar auditoria de forma centralizada (não falha se tabela ausente)
      try {
        const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip");
        await addAuditLog({
          user_id: user.id,
          action: "update_profile_permissions",
          resource_type: "profile",
          resource_id: id,
          details: JSON.stringify({ role, permissions }),
          ip_address: ip,
        });
      } catch (auditErr) {
        console.error("Falha ao gravar auditoria (não bloqueante):", auditErr);
      }

      return apiSuccess({ success: true });
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  }, { module: "usuarios", action: "edit" });
}
