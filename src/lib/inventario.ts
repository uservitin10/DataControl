import type { EquipmentItem } from '@/types/inventario';
import inventarioData from '@/data/inventario.json';

const mpoParkInventorySpec = [
  { sector: 'SAGE', model: 'Daten / DC6A-S', count: 28 },
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
    case "COGEP":
      return "Patricia de Oliveira Ribeiro";
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
