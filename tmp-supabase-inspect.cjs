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
  const { data, error } = await supabase.from('inventory_items').select('id, type, asset_type, equipment_state, asset_id, equipment_id').order('id', { ascending: true }).limit(10000);
  if (error) {
    console.error(error);
    process.exit(1);
  }
  const licenseRows = data.filter(i => String(i.type || '').toLowerCase().includes('licen') || String(i.asset_type || '').toLowerCase().includes('licen'));
  const activeStrict = licenseRows.filter(i => String(i.equipment_state || '').toLowerCase().trim() === 'ativa');
  const activeFlexible = licenseRows.filter(i => ['ativa','ativo'].includes(String(i.equipment_state || '').toLowerCase().trim()));
  const activeAny = licenseRows.filter(i => String(i.equipment_state || '').toLowerCase().includes('ativ'));
  const stateCounts = licenseRows.reduce((acc, i) => {
    const key = String(i.equipment_state || '').trim().toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const uniqueKeys = Array.from(new Set(licenseRows.map(i => `${String(i.model||'').trim().toLowerCase()}|${String(i.asset_id||'').trim().toLowerCase()}|${String(i.equipment_id||'').trim().toLowerCase()}`)));
  console.log('licenseRows=', licenseRows.length);
  console.log('activeStrict=', activeStrict.length);
  console.log('activeFlexible=', activeFlexible.length);
  console.log('activeAny=', activeAny.length);
  console.log('stateCounts=', stateCounts);
  console.log('uniqueActiveKeyCount=', uniqueKeys.length);
  console.log('example rows with blank equipment_state:');
  console.log(licenseRows.filter(i => !String(i.equipment_state || '').trim()).slice(0, 20));
  console.log('example rows with non-Ativa state:');
  console.log(licenseRows.filter(i => !['Ativa','ativo'].includes(String(i.equipment_state || '').toLowerCase().trim())).slice(0, 20));
})();
