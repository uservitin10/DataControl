import InventoryDetail from "@/components/inventario/InventoryDetail";
import { equipmentData } from "@/lib/inventario";

type Props = {
  params: Promise<{ id?: string }>;
};

export default async function ItemPage({ params }: Props) {
  const { id } = await params;
  const itemId = Number(id);

  const item = equipmentData.find((i) => i.id === itemId);

  if (!item) {
    return (
      <main className="gov-page-bg min-h-screen">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="gov-card rounded-3xl border border-slate-200 bg-white p-10 shadow-soft text-center">
            <h1 className="text-2xl font-semibold text-slate-900">Ativo não encontrado</h1>
            <p className="mt-4 text-slate-600">O ativo solicitado não existe.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="gov-page-bg min-h-screen">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="gov-card rounded-3xl border border-slate-200 bg-white p-10 shadow-soft">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Ativo #{item.id}</h1>
          </div>
          <InventoryDetail item={item} />
        </div>
      </div>
    </main>
  );
}
