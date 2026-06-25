import type { EquipmentItem } from '@/types/inventario';
import inventarioData from '@/data/inventario.json';

const mpoParkInventorySpec = [
  { sector: 'AECI', model: 'Daten / DC6A-S', count: 0 },
  { sector: 'AECI', model: 'Daten / DC5A-S', count: 3 },
  { sector: 'AECI', model: 'Lenovo ThinkCentre M75s Gen2', count: 1 },
  { sector: 'AECI', model: 'Positivo / Master C4400 Minipro rohs', count: 8 },
  { sector: 'AECI', model: 'Dell OptiPlex 3080', count: 8 },

  { sector: 'AESP/AREIN', model: 'Daten / DC6A-S', count: 0 },
  { sector: 'AESP/AREIN', model: 'Daten / DC5A-S', count: 0 },
  { sector: 'AESP/AREIN', model: 'Lenovo ThinkCentre M75s Gen2', count: 0 },
  { sector: 'AESP/AREIN', model: 'Positivo / Master C4400 Minipro rohs', count: 1 },
  { sector: 'AESP/AREIN', model: 'Dell OptiPlex 3080', count: 4 },

  { sector: 'ASTAD', model: 'Daten / DC6A-S', count: 0 },
  { sector: 'ASTAD', model: 'Daten / DC5A-S', count: 0 },
  { sector: 'ASTAD', model: 'Lenovo ThinkCentre M75s Gen2', count: 0 },
  { sector: 'ASTAD', model: 'Positivo / Master C4400 Minipro rohs', count: 3 },
  { sector: 'ASTAD', model: 'Dell OptiPlex 3080', count: 4 },

  { sector: 'ASTEC', model: 'Daten / DC6A-S', count: 0 },
  { sector: 'ASTEC', model: 'Daten / DC5A-S', count: 0 },
  { sector: 'ASTEC', model: 'Lenovo ThinkCentre M75s Gen2', count: 0 },
  { sector: 'ASTEC', model: 'Positivo / Master C4400 Minipro rohs', count: 5 },
  { sector: 'ASTEC', model: 'Dell OptiPlex 3080', count: 16 },

  { sector: 'CONJUR', model: 'Daten / DC6A-S', count: 0 },
  { sector: 'CONJUR', model: 'Daten / DC5A-S', count: 0 },
  { sector: 'CONJUR', model: 'Lenovo ThinkCentre M75s Gen2', count: 0 },
  { sector: 'CONJUR', model: 'Positivo / Master C4400 Minipro rohs', count: 11 },
  { sector: 'CONJUR', model: 'Dell OptiPlex 3080', count: 2 },

  { sector: 'Corregedoria', model: 'Daten / DC6A-S', count: 0 },
  { sector: 'Corregedoria', model: 'Daten / DC5A-S', count: 0 },
  { sector: 'Corregedoria', model: 'Lenovo ThinkCentre M75s Gen2', count: 0 },
  { sector: 'Corregedoria', model: 'Positivo / Master C4400 Minipro rohs', count: 0 },
  { sector: 'Corregedoria', model: 'Dell OptiPlex 3080', count: 2 },

  { sector: 'GM', model: 'Daten / DC6A-S', count: 0 },
  { sector: 'GM', model: 'Daten / DC5A-S', count: 0 },
  { sector: 'GM', model: 'Lenovo ThinkCentre M75s Gen2', count: 0 },
  { sector: 'GM', model: 'Positivo / Master C4400 Minipro rohs', count: 4 },
  { sector: 'GM', model: 'Dell OptiPlex 3080', count: 9 },

  { sector: 'Ouvidoria', model: 'Daten / DC6A-S', count: 0 },
  { sector: 'Ouvidoria', model: 'Daten / DC5A-S', count: 0 },
  { sector: 'Ouvidoria', model: 'Lenovo ThinkCentre M75s Gen2', count: 0 },
  { sector: 'Ouvidoria', model: 'Positivo / Master C4400 Minipro rohs', count: 0 },
  { sector: 'Ouvidoria', model: 'Dell OptiPlex 3080', count: 9 },

  { sector: 'SAGE', model: 'Daten / DC6A-S', count: 28 },
  { sector: 'SAGE', model: 'Daten / DC5A-S', count: 1 },
  { sector: 'SAGE', model: 'Lenovo ThinkCentre M75s Gen2', count: 0 },
  { sector: 'SAGE', model: 'Positivo / Master C4400 Minipro rohs', count: 8 },
  { sector: 'SAGE', model: 'Dell OptiPlex 3080', count: 13 },

  { sector: 'SE', model: 'Daten / DC6A-S', count: 7 },
  { sector: 'SE', model: 'Daten / DC5A-S', count: 3 },
  { sector: 'SE', model: 'Lenovo ThinkCentre M75s Gen2', count: 2 },
  { sector: 'SE', model: 'Positivo / Master C4400 Minipro rohs', count: 3 },
  { sector: 'SE', model: 'Dell OptiPlex 3080', count: 21 },

  { sector: 'SEAI', model: 'Daten / DC6A-S', count: 0 },
  { sector: 'SEAI', model: 'Daten / DC5A-S', count: 2 },
  { sector: 'SEAI', model: 'Lenovo ThinkCentre M75s Gen2', count: 0 },
  { sector: 'SEAI', model: 'Positivo / Master C4400 Minipro rohs', count: 12 },
  { sector: 'SEAI', model: 'Dell OptiPlex 3080', count: 20 },

  { sector: 'SEAID', model: 'Daten / DC6A-S', count: 1 },
  { sector: 'SEAID', model: 'Daten / DC5A-S', count: 0 },
  { sector: 'SEAID', model: 'Lenovo ThinkCentre M75s Gen2', count: 0 },
  { sector: 'SEAID', model: 'Positivo / Master C4400 Minipro rohs', count: 23 },
  { sector: 'SEAID', model: 'Dell OptiPlex 3080', count: 11 },

  { sector: 'SEPLAN', model: 'Daten / DC6A-S', count: 1 },
  { sector: 'SEPLAN', model: 'Daten / DC5A-S', count: 0 },
  { sector: 'SEPLAN', model: 'Lenovo ThinkCentre M75s Gen2', count: 0 },
  { sector: 'SEPLAN', model: 'Positivo / Master C4400 Minipro rohs', count: 15 },
  { sector: 'SEPLAN', model: 'Dell OptiPlex 3080', count: 40 },

  { sector: 'SMA', model: 'Daten / DC6A-S', count: 7 },
  { sector: 'SMA', model: 'Daten / DC5A-S', count: 0 },
  { sector: 'SMA', model: 'Lenovo ThinkCentre M75s Gen2', count: 1 },
  { sector: 'SMA', model: 'Positivo / Master C4400 Minipro rohs', count: 3 },
  { sector: 'SMA', model: 'Dell OptiPlex 3080', count: 30 },

  { sector: 'SOF', model: 'Daten / DC6A-S', count: 0 },
  { sector: 'SOF', model: 'Daten / DC5A-S', count: 0 },
  { sector: 'SOF', model: 'Lenovo ThinkCentre M75s Gen2', count: 0 },
  { sector: 'SOF', model: 'Positivo / Master C4400 Minipro rohs', count: 2 },
  { sector: 'SOF', model: 'Dell OptiPlex 3080', count: 7 },
];

const existingEquipmentItems = inventarioData as EquipmentItem[];
const highestInventoryId = Math.max(0, ...existingEquipmentItems.map((item) => item.id ?? 0));

const mpoParkEquipment: EquipmentItem[] = [];
let nextInventoryId = highestInventoryId + 1;

for (const spec of mpoParkInventorySpec) {
  for (let index = 0; index < spec.count; index += 1) {
    mpoParkEquipment.push({
      id: nextInventoryId,
      type: 'Desktop',
      model: spec.model,
      assetType: 'MPO',
      assetId: '',
      equipmentId: '',
      macIp: '',
      sector: spec.sector,
      responsible: '',
      allocatedUser: '',
      warranty: '',
      equipmentState: '',
      notes: 'Parque computacional MPO (Bloco K)',
    });
    nextInventoryId += 1;
  }
}

export const equipmentData: EquipmentItem[] = [
  ...existingEquipmentItems,
  ...mpoParkEquipment,
];

export { mpoParkEquipment };

export function normalizeType(type?: string): string {
  return (type ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function isLicenseType(type?: string): boolean {
  return normalizeType(type) === "licenca";
}

export function isActiveLicense(item: {
  type: string;
  equipmentState?: string;
}): boolean {
  return (
    isLicenseType(item.type) &&
    ["ativa", "ativo"].includes((item.equipmentState ?? "").toLowerCase())
  );
}

export function normalizeSectorName(sector?: string): string {
  const rawValue = sector?.toString() ?? "";
  const decodedValue = (() => {
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return rawValue;
    }
  })();

  return decodedValue
    .toLowerCase()
    .replace(/[-_]/g, " ")
    .replace(/%20/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isSemSetorValue(sector?: string): boolean {
  const normalized = normalizeSectorName(sector);
  return normalized === "sem setor" || normalized === "se setor" || normalized === "semsetor";
}

export function getAllSectors(): string[] {
  const sectorMap = new Map<string, string>();

  equipmentData.forEach((item) => {
    const normalized = normalizeSectorName(item.sector);
    const original = (item.sector ?? "").toString().trim();

    if (normalized && !sectorMap.has(normalized)) {
      sectorMap.set(normalized, original);
    }
  });

  const sectorNames = Array.from(sectorMap.values());

  if (equipmentData.some((item) => !normalizeSectorName(item.sector))) {
    sectorNames.push("Sem setor");
  }

  return sectorNames.sort((a, b) => a.localeCompare(b, "pt", { sensitivity: "base" }));
}

export function getLegalResponsible(sector?: string): string {
  const normalizedSector = sector?.toUpperCase() ?? "";

  if (["COTIC", "CONTB", "DIORC", "CGTCO"].includes(normalizedSector)) {
    return "Gustavo Andrade Bruzzeguez";
  }

  switch (normalizedSector) {
    case "CGEST":
      return "Ricardo de Assis Teixeira";
    case "COLOG":
      return "Patrícia Daniele Oliveira de Alarcão";
    case "COEFI":
      return "Dayene Cristine Peixoto";
    case "SAGE":
      return "Lorena Férrer Cavalcanti Randal Pompeu";
    case "AECI":
      return "Cesar Almeida de Meneses Silva";
    case "ASPAR":
      return "Paulo Eduardo Nunes de Moura Rocha";
    case "AESP":
    case "AREIN":
    case "AESP/AREIN":
      return "Marcelo Ribeiro Moreira";
    case "ASTAD":
      return "Waldir Antônio Gervásio";
    case "ASTEC":
      return "Carlene Guimarães de Souza";
    case "CONJUR":
      return "Jurandi Ferreira de Souza Neto";
    case "CORREGEDORIA":
      return "Nilton Carlos Jacintho Pereira";
    case "GM":
      return "Natalia Nogueira Pereira";
    case "OUVIDORIA":
      return "Carolina Palhares Lima";
    case "SMA":
      return "Mylene Greidinger Campos Coutinho";
    case "SEAID":
      return "Manuela de Azevedo Bezerra Vitor Ramos";
    case "SEAI":
      return "Sandro Eli Malcher de Alencar";
    case "SEPLAN":
      return "Giselle Aranha Farias";
    case "SOF":
      return "Leila Kuhnert Campos";
    default:
      return "-";
  }
}
