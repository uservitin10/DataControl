const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .reduce((acc, line) => {
    const [key, ...rest] = line.split('=');
    acc[key.trim()] = rest.join('=').trim();
    return acc;
  }, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function normalizeType(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function normalizeState(value) {
  return String(value || '').trim().toLowerCase();
}

function isLicenseJSON(item) {
  const type = normalizeType(item.type);
  const assetType = normalizeType(item.assetType);
  return type === 'licenca' || assetType === 'licenca';
}

function buildKey(item) {
  return [
    normalizeType(item.model),
    String(item.assetId || item.asset_id || '').trim().toLowerCase(),
    String(item.equipmentId || item.equipment_id || '').trim().toLowerCase(),
  ].join('|');
}

(function main() {
  const data = JSON.parse(fs.readFileSync('src/data/inventario.json', 'utf8'));
  const jsonLicenses = data.filter(isLicenseJSON);
  const jsonActive = jsonLicenses.filter((item) => {
    const state = normalizeState(item.equipmentState || item.equipment_state);
    return state === 'ativa' || state === 'ativo';
  });

  return supabase
    .from('inventory_items')
    .select('id,type,asset_type,equipment_state,asset_id,equipment_id,model')
    .limit(10000)
    .then(({ data: dbData, error }) => {
      if (error) throw error;
      const dbLicenses = dbData.filter((item) => {
        const type = normalizeType(item.type);
        const assetType = normalizeType(item.asset_type);
        return type === 'licenca' || assetType === 'licenca';
      });
      const dbActive = dbLicenses.filter((item) => {
        const state = normalizeState(item.equipment_state);
        return state === 'ativa' || state === 'ativo';
      });
      const jsonKeys = new Set(jsonLicenses.map(buildKey));
      const dbKeys = new Set(dbLicenses.map(buildKey));
      console.log('json total licenses:', jsonLicenses.length);
      console.log('json active licenses:', jsonActive.length);
      console.log('db total licenses:', dbLicenses.length);
      console.log('db active licenses:', dbActive.length);
      console.log('json licenses missing in DB:', jsonLicenses.filter((item) => !dbKeys.has(buildKey(item))).length);
      console.log('db licenses missing in JSON:', dbLicenses.filter((item) => !jsonKeys.has(buildKey(item))).length);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
})();