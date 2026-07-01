const fs = require('fs');
const path = require('path');

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return {};
  const txt = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

function extractEmailsFromText(text) {
  const re = /[a-z0-9._%+-]+@[a-z0-9.-]+\.gov\.br/gi;
  const matches = text.matchAll(re);
  return Array.from(new Set(Array.from(matches, m => m[0].toLowerCase())));
}

(async function main(){
  const cwd = process.cwd();
  const pastedPath = path.join(cwd,'scripts','pasted.txt');
  if (!fs.existsSync(pastedPath)) {
    console.error('pasted.txt not found at', pastedPath); process.exit(1);
  }
  const pasted = fs.readFileSync(pastedPath,'utf8');
  const pastedEmails = extractEmailsFromText(pasted);

  const invPath = path.join(cwd,'src','data','inventario.json');
  const inv = JSON.parse(fs.readFileSync(invPath,'utf8'));
  const inventoryEmails = new Set(inv.map(i => ((i.assetId||i.asset_id||'')+'').toLowerCase().trim()).filter(Boolean));

  const existingInInventory = pastedEmails.filter(e => inventoryEmails.has(e));
  const missingInInventory = pastedEmails.filter(e => !inventoryEmails.has(e));

  const result = {
    pastedCount: pastedEmails.length,
    inventoryEmailCount: inventoryEmails.size,
    existingInInventoryCount: existingInInventory.length,
    missingInInventoryCount: missingInInventory.length,
    missingSample: missingInInventory.slice(0,200)
  };

  // Try Supabase lookup if .env.local present
  const envPath = path.join(cwd,'.env.local');
  const env = loadEnvFile(envPath);
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && supabaseKey) {
    try {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Query DB for pasted emails (chunk to avoid long query)
      const chunkSize = 150;
      const presentInDb = new Set();
      for (let i=0;i<pastedEmails.length;i+=chunkSize) {
        const chunk = pastedEmails.slice(i,i+chunkSize);
        const { data, error } = await supabase.from('inventory_items').select('asset_id').in('asset_id', chunk);
        if (error) {
          console.error('Supabase query error:', error.message || error);
          break;
        }
        (data||[]).forEach(r => { if (r && r.asset_id) presentInDb.add((r.asset_id+'').toLowerCase().trim()); });
      }

      result.presentInDbCount = presentInDb.size;
      result.missingButInDb = missingInInventory.filter(e => presentInDb.has(e));
      result.missingAndNotInDb = missingInInventory.filter(e => !presentInDb.has(e));
    } catch (err) {
      console.error('Supabase client error:', err.message || err);
      result.supabaseError = String(err.message || err);
    }
  } else {
    result.supabaseSkipped = true;
  }

  fs.writeFileSync(path.join(cwd,'tmp-analysis-result.json'), JSON.stringify(result,null,2)+'\n');
  console.log('Analysis written to tmp-analysis-result.json');
  console.log(JSON.stringify(result, null, 2));
})();
