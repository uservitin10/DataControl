import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const inventoryPath = path.resolve(__dirname, '../src/data/inventario.json');
const outputPath = path.resolve(__dirname, 'insert-missing-licenses.sql');

function normalizeValue(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  const stringValue = value.toString();
  return `'${stringValue.replace(/'/g, "''")}'`;
}

const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
const licenses = inventory.filter((item) => item.type === 'Licença');
const values = licenses.map((item) => {
  const type = normalizeValue(item.type || 'Licença');
  const model = normalizeValue(item.model || '');
  const serial_number = normalizeValue(item.serial_number ?? item.serialNumber ?? null);
  const asset_id = normalizeValue(item.assetId ?? item.asset_id ?? null);
  const equipment_id = normalizeValue(item.equipmentId ?? item.equipment_id ?? null);
  const asset_type = normalizeValue(item.assetType ?? item.asset_type ?? 'SW');
  const mac_ip = normalizeValue(item.macIp ?? item.mac_ip ?? null);
  const responsible = normalizeValue(item.responsible ?? null);
  const allocated_user = normalizeValue(item.allocatedUser ?? item.allocated_user ?? null);
  const sector = normalizeValue(item.sector ?? null);
  const warranty = normalizeValue(item.warranty ?? null);
  const equipment_state = normalizeValue(item.equipmentState ?? item.equipment_state ?? 'Ativa');
  const notes = normalizeValue(item.notes ?? null);

  return `(${[
    type,
    model,
    serial_number,
    asset_id,
    equipment_id,
    asset_type,
    mac_ip,
    responsible,
    allocated_user,
    sector,
    warranty,
    equipment_state,
    notes,
  ].join(', ')})`;
});

const sql = `WITH new_rows(type, model, serial_number, asset_id, equipment_id, asset_type, mac_ip, responsible, allocated_user, sector, warranty, equipment_state, notes) AS (\n  VALUES\n  ${values.join(',\n  ')}\n)\nINSERT INTO inventory_items(type, model, serial_number, asset_id, equipment_id, asset_type, mac_ip, responsible, allocated_user, sector, warranty, equipment_state, notes)\nSELECT type, model, serial_number, asset_id, equipment_id, asset_type, mac_ip, responsible, allocated_user, sector, warranty, equipment_state, notes\nFROM new_rows nr\nWHERE NOT EXISTS (\n  SELECT 1 FROM inventory_items i\n  WHERE lower(i.type) = lower(nr.type)\n    AND lower(i.model) = lower(nr.model)\n    AND lower(coalesce(i.asset_id, '')) = lower(coalesce(nr.asset_id, ''))\n);\n`;

fs.writeFileSync(outputPath, sql, 'utf8');
console.log(`Arquivo SQL gerado em: ${outputPath}`);
console.log(`Linhas de licença processadas: ${licenses.length}`);
