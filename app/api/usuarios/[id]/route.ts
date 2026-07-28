import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { withAuth } from "@/lib/api-guard";
import { addAuditLog } from "@/lib/audit";
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

      const profileResult = await pool.query(
        `SELECT id, email, display_name, role, created_at
         FROM profiles
         WHERE id = $1`,
        [id]
      );

      const profile = profileResult.rows[0] ?? null;
      if (!profile) {
        return apiNotFound("Usuário não encontrado.");
      }

      const role = profile.role as Role;
      const permissions: Permissions = {
        ...(DEFAULT_PERMISSIONS[role] ?? DEFAULT_PERMISSIONS.viewer),
      };

      // Permissões do role (tabela role_permissions)
      const rolePermsResult = await pool.query(
        `SELECT rp.can_view, rp.can_edit, rp.can_delete, m.name AS module_name
         FROM role_permissions rp
         JOIN modules m ON m.id = rp.module_id
         WHERE rp.role = $1`,
        [role]
      );

      rolePermsResult.rows.forEach((row: Record<string, unknown>) => {
        const mod = normalizePermissionModule(typeof row.module_name === "string" ? row.module_name : undefined);
        if (!mod) return;
        permissions[mod] = {
          view: Boolean(row.can_view),
          edit: Boolean(row.can_edit),
          create: Boolean(row.can_create ?? row.can_edit),
          delete: Boolean(row.can_delete),
        };
      });

      // Permissões individuais sobrescrevem as do role (tabela user_permissions)
      const userPermsResult = await pool.query(
        `SELECT module, can_view, can_edit, can_create, can_delete
         FROM user_permissions
         WHERE user_id = $1`,
        [id]
      );

      userPermsResult.rows.forEach((row: Record<string, unknown>) => {
        const mod = normalizePermissionModule(typeof row.module === "string" ? row.module : undefined);
        if (!mod) return;
        permissions[mod] = {
          view: Boolean(row.can_view),
          edit: Boolean(row.can_edit),
          create: Boolean(row.can_create),
          delete: Boolean(row.can_delete),
        };
      });

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
        try {
          await pool.query("UPDATE profiles SET role = $1 WHERE id = $2", [role, id]);
        } catch (error) {
          return apiInternalError((error as Error).message);
        }
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
          try {
            await pool.query(
              `INSERT INTO user_permissions (user_id, module, can_view, can_edit, can_create, can_delete)
               VALUES ${rows.map((_, index) => `($${index * 6 + 1}, $${index * 6 + 2}, $${index * 6 + 3}, $${index * 6 + 4}, $${index * 6 + 5}, $${index * 6 + 6})`).join(", ")}
               ON CONFLICT (user_id, module) DO UPDATE SET
                 can_view = EXCLUDED.can_view,
                 can_edit = EXCLUDED.can_edit,
                 can_create = EXCLUDED.can_create,
                 can_delete = EXCLUDED.can_delete`,
              (rows as Array<Record<string, unknown>>).flatMap((row) => [row.user_id, row.module, row.can_view, row.can_edit, row.can_create, row.can_delete])
            );
          } catch (error) {
            return apiInternalError((error as Error).message);
          }
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
      const inventoryCountResult = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM inventory_items
         WHERE allocated_user_id = $1 OR created_by = $1`,
        [id]
      );

      if (inventoryCountResult.rows[0]?.count > 0) {
        return apiValidationError(
          "Não é possível remover este usuário enquanto ele tiver itens de inventário relacionados. Reatribua ou exclua os itens primeiro."
        );
      }

      // Remove o usuário localmente; a regra de FK cuida do restante
      await pool.query("DELETE FROM profiles WHERE id = $1", [id]);

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
      } catch (auditErr) {
        console.error("Falha ao gravar auditoria:", auditErr);
      }

      return apiSuccess({ success: true });
    } catch (err) {
      return apiInternalError((err as Error).message);
    }
  }, { module: "usuarios", action: "delete" });
}