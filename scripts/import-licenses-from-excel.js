import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workbookPath = process.env.LICENSES_XLSX_PATH || 'C:/Users/victor.fernandes/Downloads/licencas_organizado.xlsx';
const inventoryPath = path.resolve(__dirname, '../src/data/inventario.json');

function normalizeText(value) {
  return (value ?? '').toString().trim();
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeModel(value) {
  return normalizeText(value).replace(/\s+/g, ' ');
}

function buildLicenseItem(id, { name, email, model }) {
  return {
    id,
    type: 'Licença',
    model,
    assetType: 'SW',
    assetId: email,
    equipmentId: '',
    macIp: '',
    sector: '',
    responsible: name,
    allocatedUser: '',
    warranty: '',
    equipmentState: 'Ativa',
    notes: `${model} atribuída`,
  };
}

function main() {
  if (!fs.existsSync(workbookPath)) {
    throw new Error(`Arquivo não encontrado: ${workbookPath}`);
  }

  const inventoryData = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
  const existingLicenses = inventoryData.filter((item) => item.type === 'Licença');
  const existingKeys = new Set(
    existingLicenses.map((item) => `${normalizeModel(item.model).toLowerCase()}::${normalizeEmail(item.assetId)}`),
  );

  const workbook = XLSX.readFile(workbookPath);
  const sheet = workbook.Sheets['Todos'];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const seen = new Set();
  const toImport = [];

  for (const row of rows) {
    const name = normalizeText(row['Nome']);
    const email = normalizeEmail(row['E-mail']);
    const model = normalizeModel(row['Licenca']);

    if (!name || !email || !model) {
      continue;
    }

    const key = `${model.toLowerCase()}::${email}`;
    if (seen.has(key) || existingKeys.has(key)) {
      continue;
    }

    seen.add(key);
    toImport.push({ name, email, model });
  }

  if (toImport.length === 0) {
    console.log('Nenhuma licença nova encontrada para importar.');
    return;
  }

  const nextId = Math.max(0, ...inventoryData.map((item) => Number(item.id) || 0)) + 1;
  const importedItems = toImport.map((item, index) => buildLicenseItem(nextId + index, item));
  const updatedInventory = [...inventoryData, ...importedItems];

  fs.writeFileSync(inventoryPath, `${JSON.stringify(updatedInventory, null, 2)}\n`, 'utf8');

  console.log(`Importadas ${importedItems.length} licenças novas.`);
  console.log(importedItems.slice(0, 10).map((item) => `${item.model} -> ${item.assetId}`).join('\n'));
}

main();
