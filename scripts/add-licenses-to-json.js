const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/data/inventario.json');

function load() {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function save(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function main() {
  const data = load();
  const maxId = data.reduce((max, item) => Math.max(max, Number(item.id || 0)), 0);
  let nextId = maxId + 1;

  const toAdd = [
    {
      id: nextId++,
      type: 'Licença',
      model: 'Acrobat Pro DC',
      assetType: 'SW',
      assetId: 'gustavo.guimaraes@planejamento.gov.br',
      responsible: 'Gustavo José de Guimarães e Souza',
      sector: '',
      equipmentState: 'Ativa',
      notes: 'Acrobat Pro DC atribuída'
    },
    {
      id: nextId++,
      type: 'Licença',
      model: 'Adobe Creative Cloud - All Apps',
      assetType: 'SW',
      assetId: 'rodolfo.aguiar@planejamento.gov.br',
      responsible: 'Rodolfo Vaz Oliveira Aguiar',
      sector: '',
      equipmentState: 'Ativa',
      notes: 'Adobe Creative Cloud - All Apps atribuída'
    }
  ];

  // Avoid duplicates by email
  const existingEmails = new Set(
    data
      .filter(i => i.type === 'Licença')
      .map(i => (i.assetId || '').toLowerCase().trim())
      .filter(Boolean)
  );

  const finalAdd = toAdd.filter(item => !existingEmails.has((item.assetId || '').toLowerCase().trim()));

  if (finalAdd.length === 0) {
    console.log('Nenhuma licença nova para adicionar (emails já existem no JSON).');
    return;
  }

  for (const item of finalAdd) data.push(item);

  save(data);
  console.log(`Adicionadas ${finalAdd.length} licenças ao arquivo: ${filePath}`);
  finalAdd.forEach(i => console.log(`  - ${i.model} | ${i.responsible} | ${i.assetId}`));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
