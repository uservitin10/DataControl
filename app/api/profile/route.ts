import { NextRequest } from "next/server";
import pool from "@/lib/db";
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
        const displayName = sanitizeText(
          user.nome || user.email || "Usuário"
        );

        const creationResult = await pool.query(
          `INSERT INTO profiles (id, email, display_name, role)
           VALUES ($1, $2, $3, 'viewer')
           RETURNING role, display_name`,
          [id, user.email ?? null, displayName]
        );

        const newProfile = creationResult.rows[0] ?? null;
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
        await pool.query("UPDATE profiles SET display_name = $1 WHERE id = $2", [sanitizedDisplayName, id]);
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

        const permissionsResult = await pool.query(
`SELECT rp.can_view, rp.can_edit, rp.can_delete, m.name AS module_name
           FROM role_permissions rp
           JOIN modules m ON m.id = rp.module_id
           WHERE rp.role = $1`,
          [role]
        );

        permissionsResult.rows.forEach((row: Record<string, unknown>) => {
          const moduleName = normalizePermissionModule(typeof row.module_name === "string" ? row.module_name : undefined);
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

      const userPermissionsResult = await pool.query(
        `SELECT module, can_view, can_edit, can_create, can_delete
         FROM user_permissions
         WHERE user_id = $1`,
        [id]
      );

      userPermissionsResult.rows.forEach((row: Record<string, unknown>) => {
        const moduleName = normalizePermissionModule(typeof row.module === "string" ? row.module : undefined);
        if (!moduleName) return;

        permissions[moduleName] = {
          view: Boolean(row.can_view),
          edit: Boolean(row.can_edit),
          create: Boolean(row.can_create),
          delete: Boolean(row.can_delete),
        };
      });

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

    // Pega um client dedicado do pool para poder controlar a transação manualmente
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      if (role) {
        await client.query("UPDATE profiles SET role = $1 WHERE id = $2", [role, id]);
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
          await client.query(
            `INSERT INTO user_permissions (user_id, module, can_view, can_edit, can_create, can_delete)
             VALUES ${rows.map((_, index) => `($${index * 6 + 1}, $${index * 6 + 2}, $${index * 6 + 3}, $${index * 6 + 4}, $${index * 6 + 5}, $${index * 6 + 6})`).join(", ")}
             ON CONFLICT (user_id, module) DO UPDATE SET
               can_view = EXCLUDED.can_view,
               can_edit = EXCLUDED.can_edit,
               can_create = EXCLUDED.can_create,
               can_delete = EXCLUDED.can_delete`,
            rows.flatMap((row) => [row.user_id, row.module, row.can_view, row.can_edit, row.can_create, row.can_delete])
          );
        }
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      return apiInternalError((err as Error).message);
    } finally {
      client.release();
    }

    // Auditoria continua fora da transação de dados — não é crítico
    // que ela falhe junto (por isso mantém o try/catch próprio, não bloqueante)
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
  }, { module: "usuarios", action: "edit" });
}