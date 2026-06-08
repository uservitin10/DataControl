"use client";

import { useRef, ChangeEvent } from "react";

interface FileUploadInputProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  label?: string;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxSize?: number;
}

export function FileUploadInput({
  files,
  onFilesChange,
  label,
  accept,
  multiple = false,
  maxFiles,
  maxSize,
}: FileUploadInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.currentTarget.files;
    if (!selectedFiles) return;

    let nextFiles = Array.from(selectedFiles);
    if (!multiple && nextFiles.length > 1) {
      nextFiles = [nextFiles[0]];
    }

    if (maxFiles && nextFiles.length > maxFiles) {
      nextFiles = nextFiles.slice(0, maxFiles);
    }

    onFilesChange(nextFiles);
  };

  const handleRemoveFile = (index: number) => {
    onFilesChange(files.filter((_, fileIndex) => fileIndex !== index));
  };

  return (
    <div className="space-y-3">
      {label ? (
        <label className="block text-sm font-medium text-slate-700">{label}</label>
      ) : null}
      <div className="flex flex-col gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={handleFileSelection}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="gov-button-secondary-dark rounded-2xl px-4 py-3 text-sm font-semibold"
        >
          {files.length > 0 ? "Trocar arquivo" : "Selecionar arquivo"}
        </button>

        {files.length > 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Arquivo selecionado</p>
            <ul className="mt-2 space-y-2">
              {files.map((file, index) => (
                <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFile(index)}
                    className="gov-button-secondary-dark rounded-full px-3 py-1 text-xs font-semibold"
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {maxFiles ? (
          <p className="text-xs text-slate-500">
            Máximo de {maxFiles} arquivo{maxFiles > 1 ? "s" : ""}.
            {maxSize ? ` Tamanho máximo de ${(maxSize / 1024 / 1024).toFixed(0)}MB por arquivo.` : ""}
          </p>
        ) : null}
      </div>
    </div>
  );
}
