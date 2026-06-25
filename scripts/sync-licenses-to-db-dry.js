const { createClient } = require('@supabase/supabase-js');
const inventarioData = require('../src/data/inventario.json');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Erro: Variáveis de ambiente Supabase não configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function dryRun() {
  try {
    const licensesFromJson = inventarioData.filter(item => 
      item.type === 'Licença' && 
      item.equipmentState && 
      item.equipmentState.toLowerCase() === 'ativa'
    );

    console.log(`✓ Encontradas ${licensesFromJson.length} licenças ativas no JSON`);

    const { data: licensesFromDb, error: fetchError } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('type', 'Licença')
      .in('equipment_state', ['ativa', 'ativo']);

    if (fetchError) {
      throw new Error(`Erro ao buscar licenças do banco: ${fetchError.message}`);
    }

    console.log(`✓ Encontradas ${licensesFromDb.length} licenças ativas no banco`);

    const emailsInDb = new Set(
      licensesFromDb.map(license => (license.asset_id || '').toLowerCase().trim())
    );

    const licensesToAdd = licensesFromJson.filter(jsonLicense => {
      const jsonEmail = (jsonLicense.assetId || '').toLowerCase().trim();
      return jsonEmail && !emailsInDb.has(jsonEmail);
    });

    console.log('\nLicenças faltando no banco: ' + licensesToAdd.length);
    if (licensesToAdd.length === 0) {
      console.log('Nenhuma ação necessária. Banco já contém todas as licenças ativas do JSON.');
      return;
    }

    console.log('\nLista de licenças que seriam inseridas:');
    licensesToAdd.forEach(l => console.log(`  - ${l.model} | ${l.responsible} | ${l.assetId}`));

    console.log('\nPara sincronizar de fato, execute: node scripts/sync-licenses-to-db.js');
  } catch (err) {
    console.error('Erro:', err.message || err);
    process.exit(1);
  }
}

dryRun();
