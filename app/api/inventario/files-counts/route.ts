import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
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
            const { count, error } = await supabaseServer
              .from('license_files')
              .select('id', { count: 'exact', head: true })
              .eq('license_id', itemId);

            countsRecord[itemId] = error ? 0 : (count ?? 0);
          } else {
            const { count, error } = await supabaseServer
              .from('equipment_files')
              .select('id', { count: 'exact', head: true })
              .eq('equipment_id', itemId);

            countsRecord[itemId] = error ? 0 : (count ?? 0);
          }
        } catch (e) {
          countsRecord[itemId] = 0;
        }
      }

      return NextResponse.json({ counts: countsRecord });
    } catch (err) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
  });
}
