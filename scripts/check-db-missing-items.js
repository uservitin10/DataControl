import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envFile = path.join(process.cwd(), '.env.local');
const envText = fs.readFileSync(envFile, 'utf8');
for (const line of envText.split(/\r?\n/)) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const [, key, value] = match;
    process.env[key] = value;
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}
const supabase = createClient(supabaseUrl, supabaseKey);
const assetIds = [
  '12392502','12392520','12401574','12392528','12392570','12401661','12401684','749072','749076','47959600','12392576','12392831','47959663'
];

const { data, error } = await supabase
  .from('inventory_items')
  .select('id,asset_id,equipment_id,type,model,sector,responsible,allocated_user')
  .in('asset_id', assetIds);
if (error) {
  console.error('Supabase error', error);
  process.exit(1);
}
const found = data || [];
const foundIds = new Set(found.map((item) => String(item.asset_id).trim()));
console.log('Found', found.length, 'items in DB');
for (const item of found) {
  console.log('FOUND', item.asset_id, item.type, item.model, item.sector, item.responsible);
}
console.log('Missing from DB:');
for (const assetId of assetIds) {
  if (!foundIds.has(assetId)) {
    console.log('MISSING', assetId);
  }
}
const { data: totalData, error: totalError } = await supabase.from('inventory_items').select('id', { count: 'exact', head: true });
if (totalError) {
  console.error('Total count error', totalError);
} else {
  console.log('DB total inventory_items count', totalData ? '<unknown>' : '<head query ok>');
}
