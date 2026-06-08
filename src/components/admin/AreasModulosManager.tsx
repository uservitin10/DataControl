"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { fetchJson } from "@/lib/api";

interface Area {
  id: string;
  nome: string;
  descricao: string | null;
  created_at: string;
  updated_at: string;
}

interface Modulo {
  id: string;
  nome: string;
  descricao: string | null;
  created_at: string;
  updated_at: string;
}

export default function AreasModulosManager() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Form states
  const [activeTab, setActiveTab] = useState<"areas" | "modulos">("areas");
  const [formData, setFormData] = useState({ nome: "", descricao: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Get auth token
  useEffect(() => {
    async function getToken() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        setAuthToken(session.access_token);
      }
    }

    getToken();
  }, []);

  // Load areas and modulos
  useEffect(() => {
    if (authToken) {
      fetchData();
    }
  }, [authToken]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [areasData, modulosData] = await Promise.all([
        fetchJson<Area[]>('/api/areas'),
        fetchJson<Modulo[]>('/api/modulos'),
      ]);

      setAreas(areasData);
      setModulos(modulosData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao carregar dados'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!authToken) {
      setError("Token de autenticação não encontrado");
      return;
    }

    if (!formData.nome.trim()) {
      setError("Nome é obrigatório");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const endpoint =
        activeTab === "areas"
          ? `/api/areas${editingId ? `/${editingId}` : ""}`
          : `/api/modulos${editingId ? `/${editingId}` : ""}`;

      const method = editingId ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.status === 401) {
        setError("Você não tem permissão para fazer esta ação");
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao salvar");
      }

      await fetchData();
      setFormData({ nome: "", descricao: "" });
      setEditingId(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao salvar dados"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: Area | Modulo) => {
    setFormData({ nome: item.nome, descricao: item.descricao || "" });
    setEditingId(item.id);
  };

  const handleDelete = async (id: string) => {
    if (!authToken) {
      setError("Token de autenticação não encontrado");
      return;
    }

    if (!confirm("Tem certeza que deseja deletar?")) return;

    try {
      const endpoint =
        activeTab === "areas" ? `/api/areas/${id}` : `/api/modulos/${id}`;

      const response = await fetch(endpoint, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.status === 401) {
        setError("Você não tem permissão para deletar");
        return;
      }

      if (!response.ok) {
        throw new Error("Erro ao deletar");
      }

      await fetchData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao deletar dados"
      );
    }
  };

  const handleCancel = () => {
    setFormData({ nome: "", descricao: "" });
    setEditingId(null);
  };

  const currentItems = activeTab === "areas" ? areas : modulos;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-500">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-soft">
      <h1 className="text-2xl font-bold mb-6">Gerenciar Áreas e Módulos</h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => {
            setActiveTab("areas");
            handleCancel();
          }}
          className={`pb-2 font-medium transition-colors ${
            activeTab === "areas"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Áreas
        </button>
        <button
          onClick={() => {
            setActiveTab("modulos");
            handleCancel();
          }}
          className={`pb-2 font-medium transition-colors ${
            activeTab === "modulos"
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Módulos
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">
          {editingId ? "Editar" : "Adicionar"}{" "}
          {activeTab === "areas" ? "Área" : "Módulo"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome *
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) =>
                setFormData({ ...formData, nome: e.target.value })
              }
              placeholder="Digite o nome"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <input
              type="text"
              value={formData.descricao}
              onChange={(e) =>
                setFormData({ ...formData, descricao: e.target.value })
              }
              placeholder="Digite a descrição (opcional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={submitting}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Salvando..." : "Salvar"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Nome
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Descrição
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">
                Data de Criação
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-700">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length === 0 ? (
              <tr className="border-b">
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  Nenhum {activeTab === "areas" ? "área" : "módulo"} cadastrado
                </td>
              </tr>
            ) : (
              currentItems.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {item.nome}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {item.descricao || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(item.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleEdit(item)}
                      disabled={submitting}
                      className="inline-block px-3 py-1 mr-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors disabled:opacity-50"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={submitting}
                      className="inline-block px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors disabled:opacity-50"
                    >
                      Deletar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
