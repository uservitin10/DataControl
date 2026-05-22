import Image from "next/image";
import { useEffect, useState } from "react";
import type { Registro } from "@/types/dashboard";

type DocumentCardProps = {
  registro: Registro;
  canEdit: boolean;
  canDelete: boolean;
  color: { bg: string; text: string };
  getPreviewUrl: (previewPath?: string) => Promise<string | null>;
  getFileTipo: (path?: string) => { label: string; bg: string; text: string } | null;
  onEdit: (registro: Registro) => void;
  onDelete: (id: string, arquivoPath?: string, previewPath?: string, nome?: string) => void;
  onVisualizarArquivo: (arquivoPath: string, nome: string) => void;
  isViewer?: boolean;
  viewerPublicLink?: string;
  viewerPreviewImage?: string;
};

export function DocumentCard({
  registro,
  canEdit,
  canDelete,
  color,
  getPreviewUrl,
  getFileTipo,
  onEdit,
  onDelete,
  onVisualizarArquivo,
  isViewer = false,
  viewerPublicLink,
  viewerPreviewImage,
}: DocumentCardProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const isBIMunis = registro.categoria === "BI Munis" || /munis/i.test(registro.nome || "");
  const ext = registro.arquivo_path?.split('.').pop()?.toLowerCase();
  const isExcelOrPowerBI = ['xlsx', 'xls', 'pbix', 'ppt', 'pptx'].includes(ext || '');
  
  const shouldShowLink = !isViewer || isBIMunis;
  const linkHref = isViewer && isBIMunis ? viewerPublicLink : null;
  const linkText = "Abrir site público do gov.br";

  useEffect(() => {
    const loadPreview = async () => {
      // Se for BI Munis e arquivo for Excel/PowerBI, usar preview padrão
      if (isBIMunis && isExcelOrPowerBI) {
        const previewImage = isViewer && viewerPreviewImage ? viewerPreviewImage : "/bimunis.png";
        setPreviewUrl(previewImage);
        return;
      }

      const url = await getPreviewUrl(registro.preview_path);
      setPreviewUrl(url);
    };
    loadPreview();
  }, [getPreviewUrl, registro.preview_path, isBIMunis, isExcelOrPowerBI, isViewer, viewerPreviewImage]);

  const tipo = getFileTipo(registro.arquivo_path);
  const fonteLink = registro.fonte_dados?.match(/https?:\/\/[^\s]+/)?.[0] ?? null;
  const fonteText = fonteLink ? registro.fonte_dados?.replace(fonteLink, "").trim() : registro.fonte_dados;

  return (
    <div className="rounded-2xl border bg-white overflow-hidden transition-all duration-200 hover-lift shadow-soft hover:shadow-medium" style={{ borderColor: "#e2e8f0" }}>
      {previewUrl ? (
        <div className="relative w-full h-40 overflow-hidden">
          <Image src={previewUrl} alt={registro.nome} fill className="object-cover transition-transform duration-200 hover:scale-105" unoptimized />
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-200" />
        </div>
      ) : (
        <div className="w-full h-40 flex items-center justify-center hover-scale" style={{ backgroundColor: color.bg }}>
          <svg width="36" height="36" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="1" width="10" height="14" rx="1.5" stroke={color.text} strokeWidth="1.3" />
            <path d="M5 6h6M5 9h6M5 12h4" stroke={color.text} strokeWidth="1.3" strokeLinecap="round" />
            <path d="M12 1v5h4" stroke={color.text} strokeWidth="1.3" />
          </svg>
        </div>
      )}

      <div className="p-5">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {!isViewer && tipo && (
            <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ backgroundColor: tipo.bg, color: tipo.text }}>
              {tipo.label}
            </span>
          )}
          {!isViewer && registro.tipo_acesso === "restrito" && (
            <span className="rounded-full px-3 py-1 text-xs font-medium bg-red-50 text-red-700">
              🔒 Restrito
            </span>
          )}
          {!isViewer && registro.dados_sensiveis && (
            <span className="rounded-full px-3 py-1 text-xs font-medium bg-orange-50 text-orange-700">
              ⚠️ Sensível
            </span>
          )}
        </div>

        <p className="text-base font-semibold mb-2 leading-tight" style={{ color: "#1a2744" }}>{registro.nome}</p>
        {registro.descricao && <p className="text-sm line-clamp-2 text-slate-600 mb-3 leading-relaxed">{registro.descricao}</p>}

        <div className="space-y-1.5 mb-4">
          {!isViewer && registro.secretaria && <p className="text-sm text-slate-600 flex items-center gap-2"><span>🏛️</span> {registro.secretaria}</p>}
          {!isViewer && registro.responsavel && <p className="text-sm text-slate-600 flex items-center gap-2"><span>👤</span> {registro.responsavel}</p>}
          {!isViewer && registro.fonte_dados && (
            <p className="text-sm text-slate-600 flex items-center gap-2 break-all">
              <span>🗄️</span>
              {fonteLink ? (
                <a href={fonteLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                  Abrir fonte de dados
                </a>
              ) : (
                registro.fonte_dados
              )}
            </p>
          )}
          {shouldShowLink && linkHref && (
            <p className="text-sm text-slate-600 break-all">
              <span>🔗</span>{' '}
              <a
                href={linkHref}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:text-blue-700 hover:underline transition-colors"
              >
                {linkText}
              </a>
            </p>
          )}
        </div>

        <div className="flex items-center justify-between border-t pt-4" style={{ borderColor: "#f1f5f9" }}>
          {!isViewer ? (
            registro.arquivo_path ? (
              <button
                type="button"
                onClick={() => onVisualizarArquivo(registro.arquivo_path!, registro.nome)}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
              >
                Visualizar
              </button>
            ) : (
              <span className="text-sm text-slate-400">Sem arquivo</span>
            )
          ) : (
            <span className="text-sm text-slate-400">Acesso restrito a documentos</span>
          )}

          {canEdit && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onEdit(registro)}
                className="rounded px-2 py-1 text-xs bg-amber-100 text-amber-800"
              >
                Editar
              </button>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(registro.id!, registro.arquivo_path, registro.preview_path, registro.nome)}
                  className="rounded px-2 py-1 text-xs bg-red-100 text-red-800"
                >
                  Excluir
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
