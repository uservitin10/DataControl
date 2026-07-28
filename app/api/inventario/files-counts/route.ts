import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { withAuth } from '@/lib/api-guard';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  return withAuth(req, async () => {
    try {
      const body = await req.json();
      const items: Array<{ id: number | string; type?: string }> = body.items || [];

      const countsRecord: Record<string, number> = {};

      for (const item of items) {
        const itemId = String(item.id);
        const isLicense = (item.type ?? '').toLowerCase().includes('licen');

        try {
          if (isLicense) {
            const result = await pool.query(
              `SELECT COUNT(*) AS count FROM license_files WHERE license_id = $1`,
              [itemId]
            );
            countsRecord[itemId] = parseInt(result.rows[0].count || '0', 10);
          } else {
            const result = await pool.query(
              `SELECT COUNT(*) AS count FROM equipment_files WHERE equipment_id = $1`,
              [itemId]
            );
            countsRecord[itemId] = parseInt(result.rows[0].count || '0', 10);
          }
        } catch {
          countsRecord[itemId] = 0;
        }
      }

      return NextResponse.json({ counts: countsRecord });
    } catch {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
  });
}
