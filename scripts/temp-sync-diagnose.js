const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

(async () => {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('id, type, model, asset_id')
    .eq('type', 'Licença');

  if (error) {
    console.error('Supabase fetch error:', error.message || error);
    process.exit(1);
  }

  const seenDb = new Map();
  const dbDupes = [];
  data.forEach(item => {
    const key = `${(item.model || '').toString().trim().toLowerCase()}|${(item.asset_id || '').toString().trim().toLowerCase()}`;
    if (seenDb.has(key)) {
      dbDupes.push({ key, first: seenDb.get(key), item });
    } else {
      seenDb.set(key, { id: item.id, model: item.model, asset_id: item.asset_id });
    }
  });

  console.log('dbActiveCount=', data.length);
  console.log('dbDuplicates=', dbDupes.length);
  if (dbDupes.length > 0) {
    console.log(JSON.stringify(dbDupes.slice(0, 20), null, 2));
  }

  const json = JSON.parse(fs.readFileSync('src/data/inventario.json', 'utf8'));
  const licenses = json.filter(i => i.type === 'Licença' && String(i.equipmentState || '').toLowerCase() === 'ativa');
  const seenJson = new Map();
  const jsonDupes = [];
  licenses.forEach(item => {
    const key = `${(item.model || '').toString().trim().toLowerCase()}|${(item.assetId || '').toString().trim().toLowerCase()}`;
    if (seenJson.has(key)) {
      jsonDupes.push({ key, first: seenJson.get(key), item });
    } else {
      seenJson.set(key, { id: item.id, model: item.model, assetId: item.assetId });
    }
  });

  console.log('jsonActiveCount=', licenses.length);
  console.log('jsonDuplicates=', jsonDupes.length);
  if (jsonDupes.length > 0) {
    console.log(JSON.stringify(jsonDupes.slice(0, 20), null, 2));
  }

  const keysInDb = new Set(Array.from(seenDb.keys()));
  const toInsert = Array.from(seenJson.keys()).filter(k => !keysInDb.has(k));
  console.log('toInsert=', toInsert.length);
})();
