import { createClient } from '@supabase/supabase-js';
import inventarioData from '../src/data/inventario.json' with { type: 'json' };
import fs from 'node:fs';
import path from 'node:path';

const envPath = path.resolve(process.cwd(), '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
for (const line of env.split(/\r?\n/)) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1]] = match[2];
  }
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: dbData, error: dbError } = await supabase
  .from('inventory_items')
  .select('id, model, asset_id, type, equipment_state')
  .eq('type', 'Licença')
  .in('equipment_state', ['Ativa', 'ativo']);
if (dbError) {
  console.error('DB fetch error', dbError);
  process.exit(1);
}

const dbCounts = new Map();
for (const item of dbData || []) {
  const key = `${(item.model || '').toString().trim().toLowerCase()}|${(item.asset_id || '').toString().trim().toLowerCase()}`;
  dbCounts.set(key, (dbCounts.get(key) || 0) + 1);
}
const dbDuplicates = [...dbCounts.entries()].filter(([, count]) => count > 1);
console.log('DB rows', dbData?.length ?? 0, 'duplicate keys', dbDuplicates.length);
if (dbDuplicates.length > 0) {
  console.log(dbDuplicates.slice(0, 50));
}

const licensesFromJson = inventarioData.filter(item =>
  item.type === 'Licença' &&
  item.equipmentState &&
  item.equipmentState.toString().toLowerCase() === 'Ativa'
);
const jsonCounts = new Map();
for (const item of licensesFromJson) {
  const key = `${(item.model || '').toString().trim().toLowerCase()}|${(item.assetId || '').toString().trim().toLowerCase()}`;
  jsonCounts.set(key, (jsonCounts.get(key) || 0) + 1);
}
const jsonDuplicates = [...jsonCounts.entries()].filter(([, count]) => count > 1);
console.log('JSON rows', licensesFromJson.length, 'duplicate keys', jsonDuplicates.length);
if (jsonDuplicates.length > 0) {
  console.log(jsonDuplicates.slice(0, 50));
}

const dbKeys = new Set(dbCounts.keys());
const missing = [...jsonCounts.keys()].filter(key => !dbKeys.has(key));
console.log('missing candidate keys', missing.length);
console.log('sample missing keys', missing.slice(0, 50));
