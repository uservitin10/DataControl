import type { EquipmentItem } from '@/types/inventario';
import inventarioData from '@/data/inventario.json';

export const equipmentData: EquipmentItem[] = inventarioData as EquipmentItem[];

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
      return "Eliomar Wesley Ayres da Fonseca Rios";
    case "ASPAR":
      return "Paulo Eduardo Nunes de Moura Rocha";
    case "CONJUR":
      return "Jurandi Ferreira de Souza Neto";
    case "OUVIDORIA":
      return "Carolina Palhares Lima";
    case "CORREGEDORIA":
      return "Nilton Carlos Jacintho Pereira";
    case "SEAI":
      return "Wagner Artur de Oliveira Cabral";
    default:
      return "-";
  }
}
