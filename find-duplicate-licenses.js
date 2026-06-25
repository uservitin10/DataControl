const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Erro: Variáveis de ambiente Supabase não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function findAndRemoveDuplicateLicenses() {
  try {
    // Buscar todas as licenças ativas
    const { data: licenses, error: fetchError } = await supabase
      .from('inventory_items')
      .select('id, type, model, asset_id, responsible, equipment_state')
      .eq('type', 'Licença')
      .in('equipment_state', ['ativa', 'ativo'])
      .order('asset_id', { ascending: true })
      .order('id', { ascending: true });

    if (fetchError) {
      throw new Error(`Erro ao buscar licenças: ${fetchError.message}`);
    }

    console.log(`\nTotal de licenças ativas: ${licenses.length}\n`);

    // Agrupar por asset_id (email) para encontrar duplicatas
    const groupedByAsset = {};
    licenses.forEach(l => {
      const key = (l.asset_id || '').trim() || `_no_email_${l.id}`;
      if (!groupedByAsset[key]) {
        groupedByAsset[key] = [];
      }
      groupedByAsset[key].push(l);
    });

    // Encontrar duplicatas
    const duplicates = {};
    let totalDuplicates = 0;
    let idsToDelete = [];

    for (const [key, items] of Object.entries(groupedByAsset)) {
      if (items.length > 1) {
        duplicates[key] = items;
        console.log(`\n🔄 Duplicata encontrada (${items.length} registros):`);
        items.forEach((item, idx) => {
          console.log(`  [${idx}] ID: ${item.id} | ${item.model} | ${item.responsible} | ${item.asset_id}`);
          // Manter o primeiro, marcar o resto para deletar
          if (idx > 0) {
            idsToDelete.push(item.id);
          }
        });
        totalDuplicates += items.length - 1;
      }
    }

    if (totalDuplicates === 0) {
      console.log('✓ Nenhuma duplicata encontrada!');
      return;
    }

    console.log(`\n⚠ Total de registros duplicados para remover: ${totalDuplicates}`);
    console.log(`IDs a deletar: ${idsToDelete.join(', ')}\n`);

    // Gerar SQL DELETE
    console.log('-- SQL DELETE para remover duplicatas:\n');
    idsToDelete.forEach(id => {
      console.log(`DELETE FROM inventory_items WHERE id = ${id};`);
    });

  } catch (error) {
    console.error('Erro:', error.message);
    process.exit(1);
  }
}

findAndRemoveDuplicateLicenses();
