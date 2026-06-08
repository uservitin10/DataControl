# CRUD de Áreas e Módulos - Instruções de Setup

## 1. Criar Tabelas no Supabase

Acesse o SQL Editor no Supabase e execute os seguintes comandos:

### Tabela de Áreas

```sql
CREATE TABLE areas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL UNIQUE,
  descricao TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Criar índice para melhor performance
CREATE INDEX idx_areas_nome ON areas(nome);

-- Habilitar RLS (Row Level Security)
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;

-- Permitir leitura pública
CREATE POLICY "Allow public read" ON areas
  FOR SELECT USING (true);

-- Permitir criação apenas para usuários autenticados (admin)
CREATE POLICY "Allow authenticated create" ON areas
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Permitir atualização apenas para usuários autenticados (admin)
CREATE POLICY "Allow authenticated update" ON areas
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Permitir deleção apenas para usuários autenticados (admin)
CREATE POLICY "Allow authenticated delete" ON areas
  FOR DELETE USING (auth.role() = 'authenticated');
```

### Tabela de Módulos

```sql
CREATE TABLE modulos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(255) NOT NULL UNIQUE,
  descricao TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Criar índice para melhor performance
CREATE INDEX idx_modulos_nome ON modulos(nome);

-- Habilitar RLS (Row Level Security)
ALTER TABLE modulos ENABLE ROW LEVEL SECURITY;

-- Permitir leitura pública
CREATE POLICY "Allow public read" ON modulos
  FOR SELECT USING (true);

-- Permitir criação apenas para usuários autenticados (admin)
CREATE POLICY "Allow authenticated create" ON modulos
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Permitir atualização apenas para usuários autenticados (admin)
CREATE POLICY "Allow authenticated update" ON modulos
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Permitir deleção apenas para usuários autenticados (admin)
CREATE POLICY "Allow authenticated delete" ON modulos
  FOR DELETE USING (auth.role() = 'authenticated');
```

## 2. Acessar o Gerenciador

Após criar as tabelas, acesse:

```
http://localhost:3000/dashboard/admin/areas-modulos
```

## 3. Funcionalidades Disponíveis

### Áreas
- ✅ Listar todas as áreas
- ✅ Criar nova área (nome + descrição opcional)
- ✅ Editar área existente
- ✅ Deletar área

### Módulos
- ✅ Listar todos os módulos
- ✅ Criar novo módulo (nome + descrição opcional)
- ✅ Editar módulo existente
- ✅ Deletar módulo

## 4. API Endpoints

### Áreas
- `GET /api/areas` - Listar todas as áreas
- `POST /api/areas` - Criar nova área
- `GET /api/areas/[id]` - Buscar área específica
- `PATCH /api/areas/[id]` - Atualizar área
- `DELETE /api/areas/[id]` - Deletar área

### Módulos
- `GET /api/modulos` - Listar todos os módulos
- `POST /api/modulos` - Criar novo módulo
- `GET /api/modulos/[id]` - Buscar módulo específico
- `PATCH /api/modulos/[id]` - Atualizar módulo
- `DELETE /api/modulos/[id]` - Deletar módulo

## 5. Próximos Passos (Opcional)

Se quiser integrar áreas e módulos com equipamentos/licenças:

1. Adicionar coluna `area_id` e `modulo_id` às tabelas de equipamentos
2. Atualizar formulários para permitir seleção de área/módulo
3. Filtrar equipamentos por área/módulo na página de inventário
