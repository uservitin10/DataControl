const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const env = fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(Boolean).reduce((acc, line) => {
  const [key, ...rest] = line.split('=');
  acc[key.trim()] = rest.join('=').trim();
  return acc;
}, {});
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Supabase env vars missing');
  process.exit(1);
}
const supabase = createClient(url, key);
(async () => {
  const data = JSON.parse(fs.readFileSync('src/data/inventario.json', 'utf8'));
  const jsonLicenses = data
    .filter(item => String(item.type || '').toLowerCase().includes('licen'))
    .filter(item => String(item.equipmentState || '').toLowerCase().trim() === 'ativa')
    .map(item => ({
      model: String(item.model || '').trim().toLowerCase(),
      assetId: String(item.assetId || '').trim().toLowerCase(),
      equipmentId: String(item.equipmentId || '').trim().toLowerCase(),
      raw: item,
    }));

  const { data: dbData, error } = await supabase
    .from('inventory_items')
    .select('id, model, asset_id, equipment_id, type, equipment_state')
    .in('type', ['Licença', 'licença', 'LICENÇA'])
    .limit(10000);

  if (error) {
    console.error(error);
    process.exit(1);
  }

  const dbLicenses = (dbData || [])
    .filter(item => String(item.equipment_state || '').toLowerCase().trim() === 'ativa')
    .map(item => ({
      model: String(item.model || '').trim().toLowerCase(),
      assetId: String(item.asset_id || '').trim().toLowerCase(),
      equipmentId: String(item.equipment_id || '').trim().toLowerCase(),
      raw: item,
    }));

  const jsonKeys = new Set(jsonLicenses.map(item => `${item.model}|${item.assetId}|${item.equipmentId}`));
  const dbKeys = new Set(dbLicenses.map(item => `${item.model}|${item.assetId}|${item.equipmentId}`));

  const missingInDb = jsonLicenses.filter(item => !dbKeys.has(`${item.model}|${item.assetId}|${item.equipmentId}`));
  const missingInJson = dbLicenses.filter(item => !jsonKeys.has(`${item.model}|${item.assetId}|${item.equipmentId}`));

  console.log('jsonLicenses=', jsonLicenses.length);
  console.log('dbLicenses=', dbLicenses.length);
  console.log('missingInDb=', missingInDb.length);
  console.log('missingInJson=', missingInJson.length);
  if (missingInDb.length > 0) {
    console.log('examples missingInDb:', missingInDb.slice(0, 20).map(i => ({ model: i.model, assetId: i.assetId, equipmentId: i.equipmentId })));
  }
  if (missingInJson.length > 0) {
    console.log('examples missingInJson:', missingInJson.slice(0, 20).map(i => ({ model: i.model, assetId: i.assetId, equipmentId: i.equipmentId })));
  }
})();
