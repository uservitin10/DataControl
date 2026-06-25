"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { EquipmentItem } from "@/types/inventario";
import { getLegalResponsible, equipmentData } from "@/lib/inventario";

const PAGE_SIZE = 10;

type Props = {
  items: EquipmentItem[];
  showExtendedFields?: boolean;
  showSector?: boolean;
  showEmail?: boolean;
  showDetailsButton?: boolean;
};

export function SectorInventoryTable({ items, showExtendedFields = true, showSector = false, showEmail = false, showDetailsButton = true }: Props) {
  const [pageIndex, setPageIndex] = useState(0);
  const router = useRouter();

  const pageCount = useMemo(() => Math.ceil(items.length / PAGE_SIZE), [items.length]);

  const currentItems = useMemo(
    () => items.slice(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE),
    [items, pageIndex]
  );

  const firstItem = pageIndex * PAGE_SIZE + 1;
  const lastItem = Math.min((pageIndex + 1) * PAGE_SIZE, items.length);

  function openDetails(item: EquipmentItem) {
    router.push(`/inventario/item/${item.id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-600">Ativos</p>
          <p className="mt-1 text-sm text-slate-500">
            Mostrando {firstItem} - {lastItem} de {items.length} ativos
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={pageIndex === 0}
            onClick={() => setPageIndex((current) => Math.max(current - 1, 0))}
            className="gov-button rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={pageIndex >= pageCount - 1}
            onClick={() => setPageIndex((current) => Math.min(current + 1, pageCount - 1))}
            className="gov-button rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Próximo
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-y-2">
          <thead>
            <tr className="rounded-3xl bg-slate-50 text-left text-xs font-semibold uppercase text-slate-700">
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Modelo</th>
              {showSector && <th className="px-4 py-3">Setor</th>}
              {showExtendedFields && <th className="px-4 py-3">Etiqueta / Patrimônio</th>}
              <th className="px-4 py-3">Usuário</th>
              {showEmail && <th className="px-4 py-3">Email</th>}
              {showExtendedFields && <th className="px-4 py-3">Responsável legal</th>}
              {showExtendedFields && <th className="px-4 py-3">Garantia</th>}
              <th className="px-4 py-3">Estado</th>
              {showDetailsButton && <th className="px-4 py-3">Detalhes</th>}
            </tr>
          </thead>
          <tbody>
            {currentItems.map((item) => {
              return (
                <tr
                  key={`${item.id}-${item.assetId}-${item.equipmentId ?? "noeq"}`}
                  className="bg-white shadow-sm transition hover:bg-slate-50"
                >
                  <td className="px-4 py-3 text-sm text-slate-900">
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-800">
                      {item.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-900">{item.model}</td>
                  {showSector && (
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {(() => {
                        const related = Array.from(
                          new Set(
                            equipmentData
                              .filter(
                                (e) =>
                                  ((e.assetId || "") === (item.assetId || "")) ||
                                  ((e.responsible || "") === (item.responsible || ""))
                              )
                              .map((e) => (e.sector ?? "").toString().trim())
                              .filter(Boolean)
                          )
                        );

                        if (related.length > 0) return related.join(" / ");

                        return item.sector || "-";
                      })()}
                    </td>
                  )}
                  {showExtendedFields && (
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {item.assetId && item.equipmentId
                        ? `${item.assetId} / ${item.equipmentId}`
                        : item.assetId || item.equipmentId || "-"}
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm text-slate-900">{item.allocatedUser ?? item.responsible ?? "-"}</td>
                  {showEmail && (
                    <td className="px-4 py-3 text-sm text-slate-900">{item.assetId || "-"}</td>
                  )}
                  {showExtendedFields && (
                    <td className="px-4 py-3 text-sm text-slate-900">{item.legalResponsible ?? getLegalResponsible(item.sector)}</td>
                  )}
                  {showExtendedFields && (
                    <td className="px-4 py-3 text-sm text-slate-900">{item.warranty ?? "-"}</td>
                  )}
                  <td className="px-4 py-3 text-sm text-slate-900">{item.equipmentState || "-"}</td>
                  {showDetailsButton && (
                    <td className="px-4 py-3 text-sm text-slate-900">
                      <button
                        type="button"
                        onClick={() => openDetails(item)}
                        className="gov-button rounded px-3 py-1 text-sm"
                        aria-label={`Ver detalhes do item ${item.assetId}`}
                      >
                        +
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
