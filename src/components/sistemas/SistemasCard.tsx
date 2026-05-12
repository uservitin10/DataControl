import type { Sistema } from "@/src/types/dashboard";
import { COLORS, UI_CLASSES } from "@/src/lib/ui-constants";

type SistemasCardProps = {
  sistema: Sistema;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (sistema: Sistema) => void;
  onDelete: (id: string) => void;
};

export function SistemasCard({
  sistema,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: SistemasCardProps) {
  const urlPrincipal = sistema.url_producao || sistema.url_homologacao;

  return (
    <div 
      className={UI_CLASSES.cardWithShadow}
      style={{ borderColor: COLORS.cardBg }}
    >
      <div className="p-5">
        {/* Header com Sigla */}
        <div className="mb-3 flex items-start justify-between">
          <div>
            <div 
              className="inline-block rounded-full px-3 py-1 text-xs font-bold text-white"
              style={{ backgroundColor: COLORS.info }}
            >
              {sistema.sigla}
            </div>
          </div>
        </div>

        {/* Nome e Descrição */}
        <p 
          className="text-base font-semibold mb-2 leading-tight"
          style={{ color: COLORS.primary }}
        >
          {sistema.nome}
        </p>
        {sistema.descricao && (
          <p className="text-sm line-clamp-2 text-slate-600 mb-4 leading-relaxed">
            {sistema.descricao}
          </p>
        )}

        {/* Informações principais */}
        <div className="space-y-2 mb-4 bg-slate-50 rounded-lg p-3">
          {sistema.gestores && (
            <p className="text-xs text-slate-700">
              <span className="font-semibold">Gestores:</span> {sistema.gestores}
            </p>
          )}
          {sistema.sustentacao && (
            <p className="text-xs text-slate-700">
              <span className="font-semibold">Sustentação:</span> {sistema.sustentacao}
            </p>
          )}
          {sistema.gestao_dados && (
            <p className="text-xs text-slate-700">
              <span className="font-semibold">Gestão de Dados:</span> {sistema.gestao_dados}
            </p>
          )}
          {sistema.acesso_bd && (
            <p className="text-xs text-slate-700">
              <span className="font-semibold">Acesso BD:</span> {sistema.acesso_bd}
            </p>
          )}
        </div>

        {/* Links de acesso */}
        <div className="space-y-2 mb-4">
          {sistema.url_producao && (
            <p className="text-xs">
              <a
                href={sistema.url_producao}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:text-blue-700 hover:underline transition-colors font-medium"
              >
                Acessar Produção
              </a>
            </p>
          )}
          {sistema.url_homologacao && (
            <p className="text-xs">
              <a
                href={sistema.url_homologacao}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:text-blue-700 hover:underline transition-colors font-medium"
              >
                Acessar Homologação
              </a>
            </p>
          )}
        </div>

        {/* Botões de ação */}
        {canEdit && (
          <div 
            className="flex items-center gap-2 pt-4 border-t"
            style={{ borderColor: "#f1f5f9" }}
          >
            <button
              type="button"
              onClick={() => onEdit(sistema)}
              className={UI_CLASSES.buttonEdit}
            >
              Editar
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete(sistema.id!)}
                className={UI_CLASSES.buttonDelete}
              >
                Excluir
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
