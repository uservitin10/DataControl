"use client";

import React from "react";
import type { EquipmentItem } from "@/types/inventario";
import { getLegalResponsible } from "@/lib/inventario";

type Props = {
  item: EquipmentItem;
};

export default function InventoryDetail({ item }: Props) {
  const isEmail = /@/.test(item.assetId);
  const isLicense = item.type === "Licença";
  const legalResponsible = item.legalResponsible ?? getLegalResponsible(item.sector);
  const identificationLabel = isLicense ? (isEmail ? "Email" : "Asset ID") : "Patrimônio";

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Detalhes do ativo</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-slate-500">Tipo</p>
          <p className="text-sm text-slate-900">{item.type}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Modelo</p>
          <p className="text-sm text-slate-900">{item.model}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Usuário alocado</p>
          <p className="text-sm text-slate-900">{item.allocatedUser ?? item.responsible ?? "-"}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">{isLicense ? identificationLabel : "Etiqueta / Patrimônio"}</p>
          <p className="text-sm text-slate-900">
            {item.assetId && item.equipmentId
              ? `${item.assetId} / ${item.equipmentId}`
              : item.assetId || item.equipmentId || "-"}
          </p>
        </div>
        {!isLicense && (
          <>
            <div>
              <p className="text-xs text-slate-500">Responsável legal</p>
              <p className="text-sm text-slate-900">{legalResponsible}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Garantia</p>
              <p className="text-sm text-slate-900">{item.warranty ?? "-"}</p>
            </div>
          </>
        )}
        <div>
          <p className="text-xs text-slate-500">Estado</p>
          <p className="text-sm text-slate-900">{item.equipmentState || "-"}</p>
        </div>
      </div>
    </div>
  );
}
