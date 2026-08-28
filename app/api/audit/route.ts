import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";
import { auth } from "@/auth";

const getRequestIp = (request: NextRequest) => {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.trim();
  }

  const headerCandidates = [
    "x-real-ip",
    "cf-connecting-ip",
    "fastly-client-ip",
    "true-client-ip",
    "x-client-ip",
    "x-forwarded",
    "forwarded-for",
    "forwarded",
  ];

  for (const h of headerCandidates) {
    const value = request.headers.get(h);
    if (value) {
      return value.split(",")[0].trim();
    }
  }

  return null;
};





export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const userId = searchParams.get("user_id");
    const action = searchParams.get("action");
    const resourceType = searchParams.get("resource_type");
    const resourceId = searchParams.get("resource_id");

    const whereConditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (userId) {
      whereConditions.push(`al.user_id = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
    }

    if (action) {
      whereConditions.push(`al.action = $${paramIndex}`);
      params.push(action);
      paramIndex++;
    }

    if (resourceType) {
      whereConditions.push(`al.resource_type = $${paramIndex}`);
      params.push(resourceType);
      paramIndex++;
    }

    if (resourceId) {
      whereConditions.push(`al.resource_id = $${paramIndex}`);
      params.push(resourceId);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : "";

    const countQuery = `SELECT COUNT(*) as count FROM audit_logs al ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    const count = parseInt(countResult.rows[0].count as string);

    const dataQuery = `
      SELECT 
        al.id, al.user_id, al.action, al.resource_type, al.resource_id, al.details, al.ip_address, al.created_at,
        p.display_name, p.role
      FROM audit_logs al
      LEFT JOIN profiles p ON al.user_id = p.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);
    const dataResult = await pool.query(dataQuery, params);
    const data = dataResult.rows;

    return NextResponse.json({ data: data || [], missingTable: false, count });
  } catch (error) {
    if (error instanceof Error && error.message.includes("audit_logs")) {
      console.warn("Audit logging não configurado: tabela audit_logs não encontrada.");
      return NextResponse.json({ data: [], missingTable: true, count: 0 }, { status: 200 });
    }
    console.error("Erro na API de auditoria:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let user_id = body.user_id;
    const action = body.action;
    const resource_type = body.resource_type;
    const resource_id = body.resource_id;
    const details = body.details;
    const ip_address = getRequestIp(request);

    if (!user_id) {
      const session = await auth();
      if (session?.user?.id) {
        user_id = session.user.id;
      }
    }

    if (!action) {
      return NextResponse.json({ error: "action é obrigatório" }, { status: 400 });
    }

    try {
      const result = await pool.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, user_id, action, resource_type, resource_id, details, ip_address, created_at`,
        [user_id || null, action, resource_type || null, resource_id || null, details || null, ip_address]
      );

      const data = result.rows[0];
      return NextResponse.json(data, { status: 201 });
    } catch (error) {
      if (error instanceof Error && error.message.includes("audit_logs")) {
        console.warn("Audit logging não configurado: tabela audit_logs não encontrada.", {
          payload: { user_id, action, resource_type, resource_id, details, ip_address },
        });
        return NextResponse.json(
          {
            message: "Audit logging não está configurado. Crie a tabela audit_logs no banco de dados.",
            missingTable: true,
          },
          { status: 200 }
        );
      }

      console.error("Erro ao criar log de auditoria:", error);
      return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
    }
  } catch (error) {
    console.error("Erro na API de auditoria:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
