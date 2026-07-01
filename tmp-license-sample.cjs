const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const env = fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(Boolean).reduce((acc, line) => {
  const [key, ...rest] = line.split('=');
  acc[key.trim()] = rest.join('=').trim();
  return acc;
}, {});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
(async () => {
  const { data, error } = await supabase.from('inventory_items')
    .select('id, type, model, responsible, allocated_user, asset_id, asset_type, equipment_state, equipment_id')
    .ilike('type', '%licen%')
    .eq('equipment_state', 'Ativa')
    .order('id', { ascending: true })
    .limit(20);
  if (error) {
    console.error(error);
    process.exit(1);
  }
  console.log(data);
})();
