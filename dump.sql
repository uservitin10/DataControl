--
-- PostgreSQL database dump
--

\restrict 3xxakW5Yb56614NftoXZFvdH0UL1eg71aofdK75slV42BF6XvDF9cO0vhOfjSu0

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: horus_admin
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO horus_admin;

--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: horus_admin
--

CREATE SCHEMA extensions;


ALTER SCHEMA extensions OWNER TO horus_admin;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: frequencia_atualizacao; Type: TYPE; Schema: public; Owner: horus_admin
--

CREATE TYPE public.frequencia_atualizacao AS ENUM (
    'diario',
    'semanal',
    'mensal',
    'semestral',
    'anual',
    'nao_atualiza',
    'outra'
);


ALTER TYPE public.frequencia_atualizacao OWNER TO horus_admin;

--
-- Name: natureza_dados; Type: TYPE; Schema: public; Owner: horus_admin
--

CREATE TYPE public.natureza_dados AS ENUM (
    'pessoais',
    'pessoais_sensiveis',
    'anonimizado',
    'nenhuma'
);


ALTER TYPE public.natureza_dados OWNER TO horus_admin;

--
-- Name: nivel_acesso; Type: TYPE; Schema: public; Owner: horus_admin
--

CREATE TYPE public.nivel_acesso AS ENUM (
    'publico',
    'interno',
    'restrito'
);


ALTER TYPE public.nivel_acesso OWNER TO horus_admin;

--
-- Name: nivel_sigilo; Type: TYPE; Schema: public; Owner: horus_admin
--

CREATE TYPE public.nivel_sigilo AS ENUM (
    'pessoal',
    'sigiloso',
    'publico'
);


ALTER TYPE public.nivel_sigilo OWNER TO horus_admin;

--
-- Name: periodicidade_revisao; Type: TYPE; Schema: public; Owner: horus_admin
--

CREATE TYPE public.periodicidade_revisao AS ENUM (
    'nao',
    'mensal',
    'bimestral',
    'trimestral',
    'quadrimestral',
    'semestral',
    'anual',
    'outra'
);


ALTER TYPE public.periodicidade_revisao OWNER TO horus_admin;

--
-- Name: status_ativo; Type: TYPE; Schema: public; Owner: horus_admin
--

CREATE TYPE public.status_ativo AS ENUM (
    'em_uso',
    'legado',
    'em_desenvolvimento'
);


ALTER TYPE public.status_ativo OWNER TO horus_admin;

--
-- Name: tecnologia_armazenamento; Type: TYPE; Schema: public; Owner: horus_admin
--

CREATE TYPE public.tecnologia_armazenamento AS ENUM (
    'planilhas',
    'banco_de_dados_sql',
    'banco_de_dados_nosql',
    'nuvem',
    'sharepoint',
    'outra'
);


ALTER TYPE public.tecnologia_armazenamento OWNER TO horus_admin;

--
-- Name: tipo_api; Type: TYPE; Schema: public; Owner: horus_admin
--

CREATE TYPE public.tipo_api AS ENUM (
    'nao',
    'publica',
    'privada'
);


ALTER TYPE public.tipo_api OWNER TO horus_admin;

--
-- Name: tipo_ativo; Type: TYPE; Schema: public; Owner: horus_admin
--

CREATE TYPE public.tipo_ativo AS ENUM (
    'banco_de_dados',
    'sistema_corporativo',
    'planilha',
    'dashboard',
    'data_lake',
    'outra'
);


ALTER TYPE public.tipo_ativo OWNER TO horus_admin;

--
-- Name: tipo_backup; Type: TYPE; Schema: public; Owner: horus_admin
--

CREATE TYPE public.tipo_backup AS ENUM (
    'nao',
    'nuvem',
    'sharepoint',
    'servidor_interno',
    'outra'
);


ALTER TYPE public.tipo_backup OWNER TO horus_admin;

--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: horus_admin
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT nullif(current_setting('app.current_role', true), '')
$$;


ALTER FUNCTION auth.role() OWNER TO horus_admin;

--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: horus_admin
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  SELECT nullif(current_setting('app.current_user_id', true), '')::uuid
$$;


ALTER FUNCTION auth.uid() OWNER TO horus_admin;

--
-- Name: atualizar_timestamp(); Type: FUNCTION; Schema: public; Owner: horus_admin
--

CREATE FUNCTION public.atualizar_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.atualizar_timestamp() OWNER TO horus_admin;

--
-- Name: can_user(text, text); Type: FUNCTION; Schema: public; Owner: horus_admin
--

CREATE FUNCTION public.can_user(p_module text, p_action text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT CASE p_action
    WHEN 'view'   THEN rp.can_view
    WHEN 'edit'   THEN rp.can_edit
    WHEN 'delete' THEN rp.can_delete
    ELSE FALSE
  END
  FROM public.role_permissions rp
  JOIN public.modules m ON m.id = rp.module_id
  WHERE rp.role = public.get_my_role()
    AND m.name  = p_module
$$;


ALTER FUNCTION public.can_user(p_module text, p_action text) OWNER TO horus_admin;

--
-- Name: get_my_role(); Type: FUNCTION; Schema: public; Owner: horus_admin
--

CREATE FUNCTION public.get_my_role() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid()
$$;


ALTER FUNCTION public.get_my_role() OWNER TO horus_admin;

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: horus_admin
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  requested_role TEXT;
BEGIN
  requested_role := NEW.raw_user_meta_data->>'role';

  -- Nunca deixa o usuário se auto-promover para admin
  IF requested_role = 'admin' THEN
    requested_role := 'viewer';
  END IF;

  -- Garante que só roles válidos sejam aceitos (e trata NULL)
  IF requested_role IS NULL OR requested_role NOT IN (
    'editor', 'viewer', 'painel_editor', 'sistema_editor', 'inventario_editor'
  ) THEN
    requested_role := 'viewer';
  END IF;

  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'display_name',
    requested_role
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.handle_new_user() OWNER TO horus_admin;

--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: horus_admin
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION public.rls_auto_enable() OWNER TO horus_admin;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: horus_admin
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO horus_admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: areas; Type: TABLE; Schema: public; Owner: horus_admin
--

CREATE TABLE public.areas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.areas OWNER TO horus_admin;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: horus_admin
--

CREATE TABLE public.audit_logs (
    id bigint NOT NULL,
    user_id uuid,
    action text NOT NULL,
    resource_type text,
    resource_id text,
    details text,
    ip_address text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);


ALTER TABLE public.audit_logs OWNER TO horus_admin;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: horus_admin
--

ALTER TABLE public.audit_logs ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.audit_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: equipamentos; Type: TABLE; Schema: public; Owner: horus_admin
--

CREATE TABLE public.equipamentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tipo text NOT NULL,
    modelo text NOT NULL,
    etiqueta text NOT NULL,
    usuario_alocado text,
    responsavel_legal text NOT NULL,
    garantia_ativa boolean DEFAULT false NOT NULL,
    estado_conservacao text DEFAULT 'bom'::text NOT NULL,
    criado_em timestamp with time zone DEFAULT now(),
    atualizado_em timestamp with time zone DEFAULT now(),
    CONSTRAINT equipamentos_estado_conservacao_check CHECK ((estado_conservacao = ANY (ARRAY['ótimo'::text, 'bom'::text, 'regular'::text, 'ruim'::text, 'inativo'::text]))),
    CONSTRAINT equipamentos_tipo_check CHECK ((tipo = ANY (ARRAY['monitor'::text, 'notebook'::text, 'desktop'::text])))
);


ALTER TABLE public.equipamentos OWNER TO horus_admin;

--
-- Name: equipment_files; Type: TABLE; Schema: public; Owner: horus_admin
--

CREATE TABLE public.equipment_files (
    id bigint NOT NULL,
    equipment_id text NOT NULL,
    file_url text NOT NULL,
    file_name text NOT NULL,
    file_type text NOT NULL,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.equipment_files OWNER TO horus_admin;

--
-- Name: equipment_files_id_seq; Type: SEQUENCE; Schema: public; Owner: horus_admin
--

ALTER TABLE public.equipment_files ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.equipment_files_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: fontes_dados; Type: TABLE; Schema: public; Owner: horus_admin
--

CREATE TABLE public.fontes_dados (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.fontes_dados OWNER TO horus_admin;

--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: horus_admin
--

CREATE TABLE public.inventory_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id text,
    equipment_id text,
    type text,
    model text,
    sector text,
    allocated_user text,
    responsible text,
    legal_responsible text,
    warranty text,
    equipment_state text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    allocated_user_id uuid,
    asset_type text,
    mac_ip text,
    bios text,
    notes text,
    subsector text,
    sei_process_number text,
    updated_at timestamp with time zone DEFAULT now(),
    serial_number text
);


ALTER TABLE public.inventory_items OWNER TO horus_admin;

--
-- Name: levantamento_ativos; Type: TABLE; Schema: public; Owner: horus_admin
--

CREATE TABLE public.levantamento_ativos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    secretaria text NOT NULL,
    unidade_responsavel text NOT NULL,
    tipo_ativo public.tipo_ativo[] NOT NULL,
    nome_ativo text NOT NULL,
    sigla text,
    finalidade text NOT NULL,
    responsavel_negocio text NOT NULL,
    responsavel_tecnico text,
    status_ativo public.status_ativo NOT NULL,
    uso_ativo text[] NOT NULL,
    tecnologia_armazenamento public.tecnologia_armazenamento NOT NULL,
    backup public.tipo_backup NOT NULL,
    volume_dados text NOT NULL,
    frequencia_atualizacao public.frequencia_atualizacao NOT NULL,
    crescimento_por_atualizacao text NOT NULL,
    linguagem_programacao text NOT NULL,
    nivel_sigilo public.nivel_sigilo NOT NULL,
    natureza_dados public.natureza_dados NOT NULL,
    nivel_acesso public.nivel_acesso NOT NULL,
    norma_especifica text,
    risco_percebido text,
    termo_responsabilidade boolean NOT NULL,
    observacao_juridica text,
    tipo_api public.tipo_api NOT NULL,
    como_extracao text NOT NULL,
    dificuldade_extracao text NOT NULL,
    integracao_automatizada boolean NOT NULL,
    potencial_reuso boolean NOT NULL,
    possiveis_interessados text[],
    curador_dados text,
    substituto_curador text,
    data_inventario date,
    periodicidade_revisao public.periodicidade_revisao,
    secretaria_id uuid,
    unidade_responsavel_id uuid,
    responsavel_negocio_id uuid,
    responsavel_tecnico_id uuid,
    curador_dados_id uuid,
    substituto_curador_id uuid,
    criado_por uuid
);


ALTER TABLE public.levantamento_ativos OWNER TO horus_admin;

--
-- Name: license_files; Type: TABLE; Schema: public; Owner: horus_admin
--

CREATE TABLE public.license_files (
    id bigint NOT NULL,
    license_id text NOT NULL,
    file_url text NOT NULL,
    file_name text NOT NULL,
    file_type text NOT NULL,
    created_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.license_files OWNER TO horus_admin;

--
-- Name: license_files_id_seq; Type: SEQUENCE; Schema: public; Owner: horus_admin
--

ALTER TABLE public.license_files ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.license_files_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: modules; Type: TABLE; Schema: public; Owner: horus_admin
--

CREATE TABLE public.modules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.modules OWNER TO horus_admin;

--
-- Name: modulos; Type: TABLE; Schema: public; Owner: horus_admin
--

CREATE TABLE public.modulos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome character varying(255) NOT NULL,
    descricao text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.modulos OWNER TO horus_admin;

--
-- Name: notificacoes; Type: TABLE; Schema: public; Owner: horus_admin
--

CREATE TABLE public.notificacoes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tipo text NOT NULL,
    mensagem text NOT NULL,
    lida boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.notificacoes OWNER TO horus_admin;

--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: horus_admin
--

CREATE TABLE public.password_reset_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.password_reset_tokens OWNER TO horus_admin;

--
-- Name: profiles; Type: TABLE; Schema: public; Owner: horus_admin
--

CREATE TABLE public.profiles (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    email text NOT NULL,
    display_name text,
    role text DEFAULT 'viewer'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    password_hash text,
    must_reset_password boolean DEFAULT true NOT NULL,
    password_updated_at timestamp with time zone,
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'editor'::text, 'viewer'::text, 'painel_editor'::text, 'sistema_editor'::text, 'inventario_editor'::text])))
);


ALTER TABLE public.profiles OWNER TO horus_admin;

--
-- Name: registros; Type: TABLE; Schema: public; Owner: horus_admin
--

CREATE TABLE public.registros (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    categoria text NOT NULL,
    link text,
    descricao text,
    criado_por uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    arquivo_path text,
    tipo_acesso text DEFAULT 'publico'::text,
    responsavel text,
    desenvolvedor text,
    fonte_dados text,
    dados_sensiveis boolean DEFAULT false,
    secretaria text,
    preview_path text,
    CONSTRAINT registros_tipo_acesso_check CHECK ((tipo_acesso = ANY (ARRAY['publico'::text, 'restrito'::text])))
);


ALTER TABLE public.registros OWNER TO horus_admin;

--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: horus_admin
--

CREATE TABLE public.role_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role text NOT NULL,
    module_id uuid NOT NULL,
    can_view boolean DEFAULT true NOT NULL,
    can_edit boolean DEFAULT false NOT NULL,
    can_delete boolean DEFAULT false NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO horus_admin;

--
-- Name: sistemas; Type: TABLE; Schema: public; Owner: horus_admin
--

CREATE TABLE public.sistemas (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    sigla character varying(100) NOT NULL,
    nome text NOT NULL,
    descricao text NOT NULL,
    gestores text NOT NULL,
    sustentacao text NOT NULL,
    url_producao text,
    url_homologacao text,
    gestao_dados text NOT NULL,
    acesso_bd text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tipo_acesso text DEFAULT 'publico'::text NOT NULL
);


ALTER TABLE public.sistemas OWNER TO horus_admin;

--
-- Name: user_permissions; Type: TABLE; Schema: public; Owner: horus_admin
--

CREATE TABLE public.user_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    module text NOT NULL,
    can_view boolean DEFAULT false NOT NULL,
    can_edit boolean DEFAULT false NOT NULL,
    can_create boolean DEFAULT false NOT NULL,
    can_delete boolean DEFAULT false NOT NULL,
    module_id uuid,
    CONSTRAINT user_permissions_module_check CHECK ((module = ANY (ARRAY['dashboard'::text, 'painel'::text, 'sistemas'::text, 'inventario'::text, 'levantamento'::text, 'usuarios'::text, 'registros'::text, 'notificacoes'::text, 'areas'::text, 'fontes_dados'::text])))
);


ALTER TABLE public.user_permissions OWNER TO horus_admin;

--
-- Data for Name: areas; Type: TABLE DATA; Schema: public; Owner: horus_admin
--

COPY public.areas (id, nome, created_at) FROM stdin;
6f259933-3260-45e2-a067-bf0dc8bd350b	Secretaria-Executiva (SEEXEC)	2026-05-04 13:46:54.992713+00
d8d6053b-5d28-4e3d-8525-2a965542002a	Secretaria de Orçamento Federal (SOF)	2026-05-04 13:46:54.992713+00
7f54c395-963e-4283-8e21-9e2ca91b98d0	Secretaria de Assuntos Internacionais e Desenvolvimento	2026-05-04 13:46:54.992713+00
9cc65ea2-6b53-4b5f-89c2-c984d366f81e	Secretaria Nacional de Planejamento (SEPLAN)	2026-05-04 13:46:54.992713+00
041628ef-aaad-43c8-a7bb-b25a76f3b0d4	Secretaria de Monitoramento e Avaliação de Políticas Públicas e Assuntos Econômicos	2026-05-04 13:46:54.992713+00
69d8a092-963c-4ad7-a9c6-b43b83a42fd2	Secretaria de Articulação Institucional	2026-05-04 13:46:54.992713+00
b916e2c3-ee9d-4d09-a197-719eb56d978d	Gabinete do Ministro	2026-05-04 13:46:54.992713+00
c118a8ba-cbdc-4f7e-a5a1-e3cadc4fc6c2	Subsecretaria de Administração e Gestão Estratégica	2026-05-04 13:46:54.992713+00
9cb82429-2da7-4d41-973a-1c2b123a11ae	Assessoria de Participação Social e Diversidade	2026-05-04 13:46:54.992713+00
891427a5-de10-47cc-a79d-805e00704907	Assessoria de Relações Internacionais	2026-05-04 13:46:54.992713+00
614d0045-63c0-4fca-9197-012d81a30fd8	Assessoria Especial de Controle Interno	2026-05-04 13:46:54.992713+00
0d6f4d22-3373-4ec0-8c27-732e4daec9e1	Assessoria Especial de Comunicação Social	2026-05-04 13:46:54.992713+00
4f950da7-f3ce-402e-b63f-77dac3cc762f	Assessoria Especial de Assuntos Parlamentares e Federativos	2026-05-04 13:46:54.992713+00
039b5d13-6bab-499d-80d9-cff0bf15555d	Assessoria Técnica e Administrativa	2026-05-04 13:46:54.992713+00
6bb2224e-a80a-4f43-a1e6-e655bf0bb1a0	Consultoria Jurídica	2026-05-04 13:46:54.992713+00
8fd001d8-b9f1-4a2e-a547-fa3e927c1483	Ouvidoria	2026-05-04 13:46:54.992713+00
0ff0ab1d-040c-4add-bdca-442f8ff66df9	Corregedoria	2026-05-04 13:46:54.992713+00
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: horus_admin
--

COPY public.audit_logs (id, user_id, action, resource_type, resource_id, details, ip_address, created_at) FROM stdin;
4	32fa09a3-ba6d-4a75-ab60-95804c18b232	Editou painel	dashboard	e737907e-5775-4d52-bcc4-a50c165a25dc	{"nome":"DOU","categoria":"Congresso/Senado/Câmara","descricao":"DOU aa","tipo_acesso":"publico","responsavel":"","desenvolvedor":"","fonte_dados":"","dados_sensiveis":false,"secretaria":"","updated_at":"2026-05-21T14:38:38.832Z"}	::1	2026-05-21 14:38:40.636975+00
6	32fa09a3-ba6d-4a75-ab60-95804c18b232	logout	auth	\N	Logout via botão de perfil	::1	2026-05-21 14:53:07.113148+00
7	32fa09a3-ba6d-4a75-ab60-95804c18b232	login	auth	\N	Login via formulário	::1	2026-05-21 14:53:13.763996+00
8	32fa09a3-ba6d-4a75-ab60-95804c18b232	logout	auth	\N	Logout via botão de perfil	::1	2026-05-21 14:53:31.356247+00
9	32fa09a3-ba6d-4a75-ab60-95804c18b232	login	auth	\N	Login via formulário	::1	2026-05-21 15:07:27.114354+00
12	32fa09a3-ba6d-4a75-ab60-95804c18b232	login	auth	\N	Login via formulário	10.209.178.11	2026-05-22 11:36:37.166006+00
13	\N	login_failed	auth	\N	email:asdasdas@gmail.com error:Invalid login credentials	10.209.178.11	2026-05-22 11:43:11.426454+00
14	\N	login_failed	auth	\N	email:marcos.alsina@planejamento.gov.br error:Invalid login credentials	10.209.178.65	2026-05-22 11:44:09.116933+00
15	32fa09a3-ba6d-4a75-ab60-95804c18b232	login	auth	\N	Login via formulário	::1	2026-05-25 11:09:16.651254+00
16	\N	login_failed	auth	\N	email:victorodrigues.cc@gmail.com error:Invalid login credentials	::1	2026-05-27 11:34:25.678257+00
17	32fa09a3-ba6d-4a75-ab60-95804c18b232	login	auth	\N	Login via formulário	::1	2026-05-27 11:34:30.70711+00
18	32fa09a3-ba6d-4a75-ab60-95804c18b232	Editou painel	dashboard	e737907e-5775-4d52-bcc4-a50c165a25dc	{"nome":"DOU","categoria":"Congresso/Senado/Câmara","descricao":"DOU  aa","tipo_acesso":"publico","responsavel":"","desenvolvedor":"","fonte_dados":"","dados_sensiveis":false,"secretaria":"","updated_at":"2026-05-27T14:20:29.435Z"}	::1	2026-05-27 14:20:31.313223+00
19	32fa09a3-ba6d-4a75-ab60-95804c18b232	Editou painel	dashboard	e737907e-5775-4d52-bcc4-a50c165a25dc	{"nome":"DOU","categoria":"Congresso/Senado/Câmara","descricao":"DOU \\n","tipo_acesso":"publico","responsavel":"","desenvolvedor":"","fonte_dados":"","dados_sensiveis":false,"secretaria":"","updated_at":"2026-05-27T14:20:39.580Z"}	::1	2026-05-27 14:20:40.516736+00
25	32fa09a3-ba6d-4a75-ab60-95804c18b232	login	auth	\N	Login via formulário	::1	2026-06-01 14:22:03.586446+00
26	32fa09a3-ba6d-4a75-ab60-95804c18b232	logout	auth	\N	Logout via botão de perfil	::1	2026-06-02 11:32:35.396162+00
29	\N	login_failed	auth	\N	email:victor.fernandes@planejamento.gov.br error:Invalid login credentials	::1	2026-06-02 11:55:27.229625+00
27	\N	create_account	auth	\N	Cadastro de novo usuário via formulário	::1	2026-06-02 11:33:19.19303+00
28	\N	create_account	auth	\N	Cadastro de novo usuário via formulário	::1	2026-06-02 11:53:26.909622+00
30	\N	login	auth	\N	Login via formulário	::1	2026-06-02 11:55:34.864262+00
33	\N	login_failed	auth	\N	email:victor.fernandes@planejamento.gov.br error:Invalid login credentials	::1	2026-06-02 12:23:20.075519+00
34	32fa09a3-ba6d-4a75-ab60-95804c18b232	login	auth	\N	Login via formulário	::1	2026-06-02 12:27:24.962136+00
35	\N	login_failed	auth	\N	email:victorodrigues.cc@gmail.com error:Invalid login credentials	::1	2026-06-02 12:48:03.065421+00
36	32fa09a3-ba6d-4a75-ab60-95804c18b232	login	auth	\N	Login via formulário	::1	2026-06-02 12:48:10.531227+00
37	32fa09a3-ba6d-4a75-ab60-95804c18b232	create_inventory_item	inventory_item	9daf89ea-3f01-43c6-8fa6-d5927672bb05	{"type":"Monitor","model":"aoc ","asset_id":"123123123","equipment_id":"123123123123","sector":"COTIC","responsible":"Gustavo Andrade Bruzzeguez ","warranty":"12 meses","equipment_state":"Operacional","notes":null}	::1	2026-06-03 11:22:08.247611+00
38	32fa09a3-ba6d-4a75-ab60-95804c18b232	mark_notifications_read	notificacoes	\N	Todas as notificações foram marcadas como lidas.	\N	2026-06-03 11:22:36.139751+00
39	32fa09a3-ba6d-4a75-ab60-95804c18b232	mark_notifications_read	notificacoes	\N	Todas as notificações foram marcadas como lidas.	\N	2026-06-03 11:22:38.499227+00
40	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_inventory_item	inventory_item	9daf89ea-3f01-43c6-8fa6-d5927672bb05	{"id":"9daf89ea-3f01-43c6-8fa6-d5927672bb05"}	::1	2026-06-03 11:33:05.683026+00
41	32fa09a3-ba6d-4a75-ab60-95804c18b232	mark_notifications_read	notificacoes	\N	Todas as notificações foram marcadas como lidas.	\N	2026-06-03 11:33:24.454935+00
68	32fa09a3-ba6d-4a75-ab60-95804c18b232	login	auth	\N	Login via formulário	::1	2026-06-08 12:53:57.419947+00
69	32fa09a3-ba6d-4a75-ab60-95804c18b232	login	auth	\N	Login via formulário	::1	2026-06-09 13:42:21.308685+00
70	32fa09a3-ba6d-4a75-ab60-95804c18b232	login	auth	\N	Login via formulário	::1	2026-06-09 13:43:04.03169+00
71	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	7f56e0bc-7701-4e28-8632-d4b09749be48	{"type":"Monitor","model":"AOC / 24P1U","asset_id":"47959716","equipment_id":"GNSO9XA014163","sector":"COTIC","responsible":"Tâmila Rayane Espíndola De Brito Lima/  Luiz Felipe Bertassoni Pinto","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-09 14:43:47.045003+00
72	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	31c0448b-2b3b-46cb-ab5a-6ef6c79f97a5	{"type":"Monitor","model":"AOC / 24P1U","asset_id":"47959717","equipment_id":"GNSO9XA014167","sector":"COTIC","responsible":"Tâmila Rayane Espíndola De Brito Lima/  Luiz Felipe Bertassoni Pinto","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-09 14:44:24.624561+00
73	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	7114040c-9e6c-4f44-9eb0-e11cdf561243	{"type":"Monitor","model":"AOC / 24P1U","asset_id":"47959627","equipment_id":"GNSO8XA009661","sector":"COTIC","responsible":"Álvaro José de Andrade Carneiro / Henrique Eiti Otaguiri Nagazawa","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-09 14:45:09.22835+00
74	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	7c5d5beb-cc69-493a-8210-9dd7d2961e54	{"type":"Monitor","model":"AOC / 24P1U","asset_id":"47959726","equipment_id":"GNSO9XA014156","sector":"COTIC","responsible":"Álvaro José de Andrade Carneiro / Henrique Eiti Otaguiri Nagazawa","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-09 14:45:30.941968+00
75	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	cfaf4f54-c0fe-4c9f-8819-adb47633157e	{"type":"Monitor","model":"AOC / 24P1U","asset_id":"47959610","equipment_id":"GNSO8XA009021","sector":"COTIC","responsible":"Álvaro José de Andrade Carneiro / Henrique Eiti Otaguiri Nagazawa","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-09 14:45:49.121672+00
76	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	dc08f7c7-5a8a-4d19-b66b-b417e3cc60ac	{"type":"Monitor","model":"AOC / 24P1U","asset_id":"47959710","equipment_id":"GNSOAXA002186","sector":null,"responsible":"Sem usuário alocado","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-09 14:47:31.968524+00
77	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	cba9131c-69b9-4247-b0f4-f7b61830f65d	{"type":"Monitor","model":"AOC / 24P1U","asset_id":"47959722","equipment_id":"GNSO9XA014165","sector":null,"responsible":"Sem usuário alocado","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-09 14:47:52.141984+00
78	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	e350d664-a5d1-40fc-8342-591e0edb7e80	{"type":"Monitor","model":"AOC / 24P1U","asset_id":"47959709","equipment_id":"GNSO9XA014171","sector":null,"responsible":"Sem usuário alocado","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-09 14:48:25.051933+00
79	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	f0e7e4bd-b0a0-44de-87c7-1cba85a26dca	{"type":"Monitor","model":"AOC / 24P1U","asset_id":"47959713","equipment_id":"GNSOAXA002180","sector":null,"responsible":"Sem usuário alocado","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-09 14:48:46.369898+00
80	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	776327a9-a0ee-4e59-8452-2ac4544d8afd	{"type":"Desktop","model":"Daten / DC6A-S","asset_id":"47959637","equipment_id":"01047510010024","sector":"COLOG","responsible":"Sem usuário alocado","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-09 14:55:25.889966+00
137	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_equipment_file	equipment_files	5	{"equipmentId":"48353866-4b4a-4ebb-9044-029442f80d57"}	\N	2026-06-12 12:28:02.211104+00
81	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	c8e11a65-a067-46a0-9bd3-1f590932cf0f	{"type":"Desktop","model":"Daten / DC6A-S","asset_id":"47959682","equipment_id":"01047510010021","sector":"COLOG","responsible":"Andrine Gonçalves Soares / Hilquias Rosa de Oliveira","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-09 14:56:25.73505+00
82	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	e013891a-6072-44ba-a4fe-db574ffab22f	{"type":"Monitor","model":"AOC / 24P1U","asset_id":"147959608","equipment_id":"GNSO8XA009013","sector":"COLOG","responsible":"Andrine Gonçalves Soares / Hilquias Rosa de Oliveira","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-09 14:56:56.89672+00
83	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	a2f82825-f413-465c-9782-9702de06ba1d	{"type":"Monitor","model":"AOC / 24P1U","asset_id":"47959605","equipment_id":"GNSO8XA009001","sector":"COLOG","responsible":"Andrine Gonçalves Soares / Hilquias Rosa de Oliveira","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-09 14:57:04.75043+00
84	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	a9c7a34e-d01a-4609-9fdd-f993f328b4c2	{"type":"Monitor","model":"AOC / 24P1U","asset_id":"47959631","equipment_id":"GNSO8XA010454","sector":"COLOG","responsible":"Andrine Gonçalves Soares / Hilquias Rosa de Oliveira","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-09 14:57:14.198445+00
85	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	083afc10-6e47-46f5-ba3c-6e4da83d474d	{"type":"Monitor","model":"AOC / 24P1U","asset_id":"47959614","equipment_id":"GNSO8XA009422","sector":"CGEST","responsible":"Matheus Maurício Rodrigues Pereira","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-09 14:57:48.420079+00
86	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	83c0d285-15df-4e43-9dd9-741fd1531a32	{"type":"Monitor","model":"AOC / 24P1U","asset_id":"47959724","equipment_id":"GNSO9XA014157","sector":"CGEST","responsible":"Matheus Maurício Rodrigues Pereira","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-09 14:57:59.943316+00
87	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	2e35b9eb-6a4d-41ee-ba28-3f899f0f6d8a	{"type":"Monitor","model":"AOC / 24P1U","asset_id":"47959619","equipment_id":"GNSO8XA009430","sector":"CGEST","responsible":"Matheus Maurício Rodrigues Pereira","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-09 14:58:16.011726+00
88	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	f8803afb-a3c3-48b4-8957-d4ebb820920a	{"type":"Monitor","model":"AOC / 24P1U","asset_id":"47959629","equipment_id":"GNSO8XA009668","sector":"COGEP","responsible":"Maristella Alves do Nascimento Salgado / João Remisson Teixeira Figueiredo","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-09 14:58:39.276464+00
89	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	652617f6-2ff0-4df5-bb25-b403b36b37f9	{"type":"Monitor","model":"AOC / 24P1U","asset_id":"47959588","equipment_id":"GNSO8XA008981","sector":"COGEP","responsible":"Maristella Alves do Nascimento Salgado / João Remisson Teixeira Figueiredo","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-09 14:59:00.110676+00
90	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	7690d3e0-bd6f-4224-b05f-9206cd37f76e	{"type":"Monitor","model":"AOC / 24P1U","asset_id":"47959624","equipment_id":"GNSO8XA009651","sector":"COGEP","responsible":"Maristella Alves do Nascimento Salgado / João Remisson Teixeira Figueiredo","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-09 14:59:11.234805+00
91	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	5a00b817-9f6f-41ed-a9c2-0f2f63052c6c	{"type":"Desktop","model":"Daten / DC6A-S","asset_id":"47959681","equipment_id":"01047510010025","sector":"COGEP","responsible":"Maristella Alves do Nascimento Salgado / João Remisson Teixeira Figueiredo","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-10 11:27:24.740496+00
92	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	f1589124-c522-442a-8b8c-9173536e494f	{"type":"Desktop","model":"Daten / DC6A-S","asset_id":"47959651","equipment_id":"01047510010003","sector":"COTIC","responsible":"Matheus Maurício Rodrigues Pereira","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-10 11:28:44.47884+00
93	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	955620a9-7cf3-4e90-b0c6-dc99a483ce39	{"type":"Desktop","model":"Daten / DC6A-S","asset_id":"47959569","equipment_id":"01047095010036","sector":"COTIC","responsible":"Álvaro José de Andrade Carneiro / Henrique Eiti Otaguiri Nagazawa","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-10 11:29:05.356791+00
94	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	9adf34b5-e35a-467f-ada3-e2938e621d39	{"type":"Desktop","model":"Daten / DC6A-S","asset_id":"47959556","equipment_id":"01047095010023","sector":"DIORC","responsible":"Sem usuário alocado","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-10 11:30:12.30922+00
95	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	60b1240a-64a0-4b27-bd92-a4533f3021c2	{"type":"Desktop","model":"Daten / DC6A-S","asset_id":"47959575","equipment_id":"01047095010042","sector":null,"responsible":"Depósito","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-10 11:30:36.318444+00
96	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	4ea4a81f-9eeb-42e5-8c8f-e5d105377243	{"type":"Desktop","model":"Daten / DC6A-S","asset_id":"47959767","equipment_id":"01047511010031","sector":null,"responsible":"Caixa - Depósito","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-10 11:31:40.594945+00
97	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	ce36f540-c559-49eb-864b-c23f07628060	{"type":"Desktop","model":"Daten / DC6A-S","asset_id":"47959764","equipment_id":"01047511010028","sector":null,"responsible":"Caixa - Depósito ","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-10 11:32:17.134746+00
98	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	8f42b455-67f3-42ff-9580-5c3a2269f640	{"type":"Desktop","model":"Daten / DC6A-S","asset_id":"47959747","equipment_id":"01047511010011","sector":null,"responsible":"Depósito ","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-10 11:32:40.400251+00
99	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	936364ab-d48c-4ae4-bcf6-fa4ad2b15279	{"type":"Monitor","model":"Positivo / 24BL550J","asset_id":"12402586","equipment_id":"312AZWS8R873","sector":"COGEP","responsible":"Franciellen Euzébio Silva dos Santos","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-10 11:33:27.430018+00
100	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	a560ad65-5226-4b74-b2b6-775df84dc315	{"type":"Monitor","model":"Positivo / 24BL550J","asset_id":"12402692","equipment_id":"312AZKA3F829","sector":"COGEP","responsible":"Franciellen Euzébio Silva dos Santos","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-10 11:33:36.374017+00
291	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_storage	storage	documentos/1784294542030_Teste.pdf	Remoção de arquivo no bucket documentos em 1784294542030_Teste.pdf	\N	2026-07-22 12:38:47.685397+00
101	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	d9b5cda6-af11-4987-ae08-444e5fbd6cd5	{"type":"Monitor","model":"Positivo / 24BL550J","asset_id":"12402661","equipment_id":"401AZPU4N968","sector":"COLOG","responsible":"André Luiz Rodrigues","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-10 11:34:29.086696+00
102	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	803f5bf4-5b8c-4fc0-bcc6-3cab977e2d6f	{"type":"Monitor","model":"Positivo / 24BL550J","asset_id":"12402696","equipment_id":"312AZBZ3M117","sector":"COLOG","responsible":"André Luiz Rodrigues","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-10 11:34:35.983901+00
103	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	cebba16a-5ea0-4fef-a6a6-7221b29158bd	{"type":"Monitor","model":"Positivo / 24BL550J","asset_id":"12402583","equipment_id":"312AZKA85349","sector":"DIORC","responsible":"Lea Mendonça Nobrega","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-10 11:34:57.350096+00
104	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	a6a42859-971a-410e-8afe-d4022d521bd7	{"type":"Monitor","model":"Positivo / 24BL550J","asset_id":"12402598","equipment_id":"401AZMG0J835","sector":"DIORC","responsible":"Lea Mendonça Nobrega","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-10 11:35:06.792039+00
105	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	c1ebc045-3e6b-4168-8db0-04db9ddbb376	{"type":"Monitor","model":"Positivo / 24BL550J","asset_id":"12399200","equipment_id":"301AZXC9R962","sector":null,"responsible":"Sem usuário alocado","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-10 11:35:27.191323+00
106	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	b24d9a20-e997-4700-aca6-d865f34964e0	{"type":"Monitor","model":"Positivo / 24BL550J","asset_id":"12402594","equipment_id":"312AZHY7S497","sector":null,"responsible":"Sem usuário alocado","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-10 11:35:34.837983+00
107	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	d89e780a-d9ff-47e4-8344-eaf75bfd474e	{"type":"Monitor","model":"Positivo / 24BL550J","asset_id":"12402690","equipment_id":"312AZCQ3M075","sector":null,"responsible":"Sem usuário alocado","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-10 11:35:58.389614+00
108	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	577e713b-6f10-43b0-ba84-9cef4fb00647	{"type":"Monitor","model":"Positivo / 24BL550J","asset_id":"12402585","equipment_id":"312AZHY88577","sector":null,"responsible":"Sem usuário alocado","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-10 11:36:05.572944+00
109	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	cd5a9ef8-bd4b-42d9-b4c8-2725d934a86e	{"type":"Desktop","model":"Positivo / Master C4400 Minipro rohs","asset_id":"12401666","equipment_id":"5A463710Z","sector":"SAGE","responsible":"Minidepósito IPEA","warranty":null,"equipment_state":null,"notes":"Deposito"}	::1	2026-06-10 11:36:24.367212+00
110	\N	login_failed	auth	\N	email:voce@empresa.com error:Invalid login credentials	::1	2026-06-10 11:39:49.074954+00
111	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	92190674-da74-402f-9f04-911cc16e1502	{"type":"Desktop","model":"Daten / DC6A-S","asset_id":"47959583","equipment_id":"01047095010050","sector":"COGEP","responsible":"Franciellen Euzébio Silva dos Santos","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-10 11:45:28.413925+00
112	32fa09a3-ba6d-4a75-ab60-95804c18b232	login	auth	\N	Login via formulário	::1	2026-06-10 12:40:57.986953+00
113	32fa09a3-ba6d-4a75-ab60-95804c18b232	login	auth	\N	Login via formulário	::1	2026-06-10 12:46:13.902827+00
114	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	42890c82-6e22-4e66-b4a8-18c47993fa8b	{"type":"Desktop","model":"Daten / DC6A-S","asset_id":"47959578","equipment_id":"01047095010045","sector":"COLOG","responsible":"Patrícia Daniele Oliveira de Alarcão","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-10 12:48:27.767149+00
115	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	0ca2b36e-6d15-4b59-a67b-6d42a5d762e4	{"type":"Monitor","model":"Dell / P2419Hc","asset_id":"12392332","equipment_id":"D1WLF83","sector":"COLOG","responsible":"Patrícia Daniele Oliveira de Alarcão","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-10 12:48:45.162231+00
116	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	3fda45cc-bf5b-49f8-94f8-120123c8861c	{"type":"Monitor","model":"Dell / P2419Hc","asset_id":"12392522","equipment_id":"FPDLF83","sector":"COLOG","responsible":"Patrícia Daniele Oliveira de Alarcão","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-10 12:48:52.894599+00
117	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	7f56e0bc-7701-4e28-8632-d4b09749be48	{"type":"Monitor","model":"AOC / 24P1U","asset_id":"47959716","equipment_id":"GNSO9XA014163","sector":"COTIC","responsible":"Tâmila Rayane Espíndola De Brito Lima/  Luiz Felipe Bertassoni Pinto","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-10 12:49:37.797544+00
118	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	10c3b131-1ea8-40f7-b18b-f478a7f1bda2	{"type":"Desktop","model":"Daten / DC6A-S","asset_id":"47959634","equipment_id":"01047510010014","sector":"COEFI","responsible":"Bruno Henrique Bernardes Inocencio","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-10 12:59:18.250584+00
119	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	18da12d3-843e-442a-92bd-154f13ed8ab5	{"type":"Monitor","model":"AOC / 24P1U","asset_id":"47959607","equipment_id":"GNSO8XA009008","sector":"COEFI","responsible":"Bruno Henrique Bernardes Inocencio","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-10 12:59:27.298108+00
120	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	b31ce96f-e5e5-4564-98b7-00accd46950b	{"type":"Monitor","model":"AOC / 24P1U","asset_id":"47959702","equipment_id":"GNSO9XA014172","sector":"COEFI","responsible":"Bruno Henrique Bernardes Inocencio","warranty":null,"equipment_state":null,"notes":null}	::1	2026-06-10 12:59:33.640353+00
122	32fa09a3-ba6d-4a75-ab60-95804c18b232	upload_license_files	license_files	27060b30-3fbd-4dab-a6a4-c2da9d1ddab1	{"fileCount":1}	\N	2026-06-10 14:57:13.296244+00
123	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_license_file	license_files	1	{"licenseId":"27060b30-3fbd-4dab-a6a4-c2da9d1ddab1"}	\N	2026-06-10 14:59:30.661592+00
124	32fa09a3-ba6d-4a75-ab60-95804c18b232	upload_license_files	license_files	27060b30-3fbd-4dab-a6a4-c2da9d1ddab1	{"fileCount":1}	\N	2026-06-10 14:59:47.254035+00
125	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_license_file	license_files	2	{"licenseId":"27060b30-3fbd-4dab-a6a4-c2da9d1ddab1"}	\N	2026-06-10 15:00:01.291176+00
126	32fa09a3-ba6d-4a75-ab60-95804c18b232	upload_license_files	license_files	27060b30-3fbd-4dab-a6a4-c2da9d1ddab1	{"fileCount":1}	\N	2026-06-10 15:01:01.90725+00
127	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_license_file	license_files	3	{"licenseId":"27060b30-3fbd-4dab-a6a4-c2da9d1ddab1"}	\N	2026-06-10 15:01:23.857819+00
128	32fa09a3-ba6d-4a75-ab60-95804c18b232	upload_equipment_files	equipment_files	48353866-4b4a-4ebb-9044-029442f80d57	{"fileCount":2}	\N	2026-06-11 11:32:22.274002+00
129	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_equipment_file	equipment_files	2	{"equipmentId":"48353866-4b4a-4ebb-9044-029442f80d57"}	\N	2026-06-11 12:12:15.859123+00
130	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_equipment_file	equipment_files	1	{"equipmentId":"48353866-4b4a-4ebb-9044-029442f80d57"}	\N	2026-06-11 12:12:24.529397+00
131	32fa09a3-ba6d-4a75-ab60-95804c18b232	upload_equipment_files	equipment_files	48353866-4b4a-4ebb-9044-029442f80d57	{"fileCount":1}	\N	2026-06-11 12:28:01.073569+00
132	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_equipment_file	equipment_files	3	{"equipmentId":"48353866-4b4a-4ebb-9044-029442f80d57"}	\N	2026-06-12 11:41:42.594548+00
133	32fa09a3-ba6d-4a75-ab60-95804c18b232	upload_equipment_files	equipment_files	48353866-4b4a-4ebb-9044-029442f80d57	{"fileCount":1}	\N	2026-06-12 11:56:03.931884+00
134	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_equipment_file	equipment_files	4	{"equipmentId":"48353866-4b4a-4ebb-9044-029442f80d57"}	\N	2026-06-12 12:15:43.246664+00
135	32fa09a3-ba6d-4a75-ab60-95804c18b232	upload_equipment_files	equipment_files	48353866-4b4a-4ebb-9044-029442f80d57	{"fileCount":1}	\N	2026-06-12 12:16:05.095553+00
136	32fa09a3-ba6d-4a75-ab60-95804c18b232	upload_equipment_files	equipment_files	f3d0311b-c105-4ae7-b396-55950a7c4dec	{"fileCount":3}	\N	2026-06-12 12:19:35.96177+00
138	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_equipment_file	equipment_files	8	{"equipmentId":"f3d0311b-c105-4ae7-b396-55950a7c4dec"}	\N	2026-06-12 12:28:09.88054+00
139	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_equipment_file	equipment_files	7	{"equipmentId":"f3d0311b-c105-4ae7-b396-55950a7c4dec"}	\N	2026-06-12 12:28:14.405414+00
140	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_equipment_file	equipment_files	6	{"equipmentId":"f3d0311b-c105-4ae7-b396-55950a7c4dec"}	\N	2026-06-12 12:28:21.77704+00
141	32fa09a3-ba6d-4a75-ab60-95804c18b232	upload_equipment_files	equipment_files	48353866-4b4a-4ebb-9044-029442f80d57	{"fileCount":3}	\N	2026-06-16 11:03:22.864727+00
142	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_equipment_file	equipment_files	9	{"equipmentId":"48353866-4b4a-4ebb-9044-029442f80d57"}	\N	2026-06-16 11:25:40.856269+00
143	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_equipment_file	equipment_files	10	{"equipmentId":"48353866-4b4a-4ebb-9044-029442f80d57"}	\N	2026-06-16 11:25:47.887121+00
144	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_equipment_file	equipment_files	11	{"equipmentId":"48353866-4b4a-4ebb-9044-029442f80d57"}	\N	2026-06-16 11:25:51.909364+00
145	32fa09a3-ba6d-4a75-ab60-95804c18b232	upload_equipment_files	equipment_files	48353866-4b4a-4ebb-9044-029442f80d57	{"fileCount":3}	\N	2026-06-16 11:26:08.457537+00
146	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_equipment_file	equipment_files	14	{"equipmentId":"48353866-4b4a-4ebb-9044-029442f80d57"}	\N	2026-06-16 11:26:12.543635+00
147	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_equipment_file	equipment_files	13	{"equipmentId":"48353866-4b4a-4ebb-9044-029442f80d57"}	\N	2026-06-16 11:32:41.282537+00
148	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_equipment_file	equipment_files	12	{"equipmentId":"48353866-4b4a-4ebb-9044-029442f80d57"}	\N	2026-06-16 11:32:42.150657+00
149	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_equipment_file	equipment_files	12	{"equipmentId":"48353866-4b4a-4ebb-9044-029442f80d57"}	\N	2026-06-16 11:32:42.441645+00
150	32fa09a3-ba6d-4a75-ab60-95804c18b232	upload_equipment_files	equipment_files	48353866-4b4a-4ebb-9044-029442f80d57	{"fileCount":3}	\N	2026-06-16 11:37:19.920273+00
151	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_equipment_file	equipment_files	16	{"equipmentId":"48353866-4b4a-4ebb-9044-029442f80d57"}	\N	2026-06-16 11:48:26.345327+00
152	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_equipment_file	equipment_files	17	{"equipmentId":"48353866-4b4a-4ebb-9044-029442f80d57"}	\N	2026-06-16 11:49:50.542416+00
153	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_equipment_file	equipment_files	15	{"equipmentId":"48353866-4b4a-4ebb-9044-029442f80d57"}	\N	2026-06-16 11:49:55.341108+00
154	32fa09a3-ba6d-4a75-ab60-95804c18b232	upload_equipment_files	equipment_files	426	{"fileCount":3}	\N	2026-06-17 12:44:26.891689+00
155	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_equipment_file	equipment_files	18	{"equipmentId":"426"}	\N	2026-06-17 12:44:52.612273+00
156	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_equipment_file	equipment_files	19	{"equipmentId":"426"}	\N	2026-06-17 12:44:55.13972+00
157	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_equipment_file	equipment_files	20	{"equipmentId":"426"}	\N	2026-06-17 12:44:58.813525+00
158	32fa09a3-ba6d-4a75-ab60-95804c18b232	upload_equipment_files	equipment_files	426	{"fileCount":2}	\N	2026-06-17 13:01:06.922699+00
159	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_equipment_file	equipment_files	21	{"equipmentId":"426"}	\N	2026-06-17 13:02:41.823646+00
160	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_equipment_file	equipment_files	22	{"equipmentId":"426"}	\N	2026-06-17 13:02:48.01961+00
161	32fa09a3-ba6d-4a75-ab60-95804c18b232	upload_equipment_files	equipment_files	426	{"fileCount":3}	\N	2026-06-17 13:05:32.407808+00
162	32fa09a3-ba6d-4a75-ab60-95804c18b232	logout	auth	\N	Logout via botão de perfil	::1	2026-06-17 15:21:10.528803+00
163	6b87a7ee-889d-487e-b643-27f250661830	create_account	auth	\N	Cadastro de novo usuário via formulário	::1	2026-06-17 15:22:23.006281+00
164	32fa09a3-ba6d-4a75-ab60-95804c18b232	login	auth	\N	Login via formulário	::1	2026-06-18 10:55:29.407048+00
165	32fa09a3-ba6d-4a75-ab60-95804c18b232	upload_equipment_files	equipment_files	48353866-4b4a-4ebb-9044-029442f80d57	{"fileCount":2}	\N	2026-06-18 12:59:18.89884+00
166	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_equipment_file	equipment_files	26	{"equipmentId":"48353866-4b4a-4ebb-9044-029442f80d57"}	\N	2026-06-18 12:59:50.566713+00
167	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_equipment_file	equipment_files	27	{"equipmentId":"48353866-4b4a-4ebb-9044-029442f80d57"}	\N	2026-06-18 12:59:54.521452+00
168	32fa09a3-ba6d-4a75-ab60-95804c18b232	upload_equipment_files	equipment_files	48353866-4b4a-4ebb-9044-029442f80d57	{"fileCount":3}	\N	2026-06-18 13:06:40.332361+00
169	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_equipment_file	equipment_files	29	{"equipmentId":"48353866-4b4a-4ebb-9044-029442f80d57"}	\N	2026-06-18 13:06:58.189094+00
170	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_equipment_file	equipment_files	28	{"equipmentId":"48353866-4b4a-4ebb-9044-029442f80d57"}	\N	2026-06-18 13:07:15.872431+00
171	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_equipment_file	equipment_files	30	{"equipmentId":"48353866-4b4a-4ebb-9044-029442f80d57"}	\N	2026-06-18 13:07:20.055428+00
172	32fa09a3-ba6d-4a75-ab60-95804c18b232	upload_equipment_files	equipment_files	48353866-4b4a-4ebb-9044-029442f80d57	{"fileCount":1}	\N	2026-06-18 13:07:30.164701+00
173	32fa09a3-ba6d-4a75-ab60-95804c18b232	upload_equipment_files	equipment_files	f3d0311b-c105-4ae7-b396-55950a7c4dec	{"fileCount":1}	\N	2026-06-18 13:23:40.142848+00
174	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_equipment_file	equipment_files	31	{"equipmentId":"48353866-4b4a-4ebb-9044-029442f80d57"}	\N	2026-06-18 14:12:26.94212+00
175	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_equipment_file	equipment_files	32	{"equipmentId":"f3d0311b-c105-4ae7-b396-55950a7c4dec"}	\N	2026-06-18 14:12:37.727665+00
176	32fa09a3-ba6d-4a75-ab60-95804c18b232	upload_equipment_files	equipment_files	48353866-4b4a-4ebb-9044-029442f80d57	{"fileCount":1}	\N	2026-06-18 14:15:08.444748+00
177	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_equipment_file	equipment_files	33	{"equipmentId":"48353866-4b4a-4ebb-9044-029442f80d57"}	\N	2026-06-19 12:10:27.989937+00
178	32fa09a3-ba6d-4a75-ab60-95804c18b232	login	auth	\N	Login via formulário	::1	2026-06-22 11:50:04.517376+00
179	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	6d6440a0-37d5-4cd6-892c-a15926b5c0c5	{"type":"Licença","model":"Acrobat Pro DC","asset_id":"andre.monteiro@planejamento.gov.br","equipment_id":null,"sector":null,"responsible":"André do Nascimento Monteiro","warranty":null,"equipment_state":"Ativa","notes":"Acrobat Pro DC atribu├¡da"}	::1	2026-06-24 13:24:28.221292+00
180	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	b17a0e0f-b0ba-4680-ae0f-69515a2efb3b	{"type":"Licença","model":"Acrobat Pro DC","asset_id":"carlene.souza@planejamento.gov.br","equipment_id":null,"sector":null,"responsible":"Carlene Guimarães de Souza","warranty":null,"equipment_state":"Ativa","notes":"Acrobat Pro DC atribu├¡da"}	::1	2026-06-24 13:24:49.887824+00
181	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	7173f0c0-61a7-4bc6-a9cc-6df68283a227	{"type":"Licença","model":"Acrobat Pro DC","asset_id":"geraldo.francisco@planejamento.gov.br","equipment_id":null,"sector":null,"responsible":"Geraldo Francisco da Silva Júnior","warranty":null,"equipment_state":"Ativa","notes":"Acrobat Pro DC atribu├¡da"}	::1	2026-06-24 13:25:15.069268+00
292	32fa09a3-ba6d-4a75-ab60-95804c18b232	Excluiu painel	dashboard	af8674a1-770a-4bf7-bfbb-9dee0a93be5d	\N	::1	2026-07-22 12:38:48.02829+00
293	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_storage	storage	documentos/1784294542030_Teste.pdf	Remoção de arquivo no bucket documentos em 1784294542030_Teste.pdf	\N	2026-07-22 12:49:20.190356+00
182	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	651e5d66-c8ea-4826-a246-914c104e90aa	{"type":"Licença","model":"Acrobat Pro DC","asset_id":"gustavo.guimaraes@planejamento.gov.br","equipment_id":null,"sector":null,"responsible":"Gustavo José de Guimarães e Souza","warranty":null,"equipment_state":"Ativa","notes":"Acrobat Pro DC atribu├¡da"}	::1	2026-06-24 13:25:28.642812+00
183	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	ad936944-304e-4acf-85b8-e6b48218823b	{"type":"Licença","model":"Acrobat Pro DC","asset_id":"jessica.orion@planejamento.gov.br","equipment_id":null,"sector":null,"responsible":"Jessica Ellen Azevedo Orion Lopes","warranty":null,"equipment_state":"Ativa","notes":"Acrobat Pro DC atribu├¡da"}	::1	2026-06-24 13:25:58.520621+00
223	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_notification	notificacoes	c678eaf7-94c6-4f3e-8d80-d38e3125dd7b	Notificação removida.	\N	2026-07-06 13:47:26.234004+00
184	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	911a659c-445d-4e7a-b6ef-66546934b221	{"type":"Licença","model":"Acrobat Pro DC","asset_id":"amarildo.lima@planejamento.gov.br","equipment_id":null,"sector":null,"responsible":"José Amarildo Nunes de Lima","warranty":null,"equipment_state":"Ativa","notes":"Acrobat Pro DC atribu├¡da"}	::1	2026-06-24 13:26:09.202088+00
187	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	3c95b027-810e-47a2-920b-133b77064193	{"type":"Licença","model":"Acrobat Pro DC","asset_id":"tatiane.oliveira@planejamento.gov.br","equipment_id":null,"sector":null,"responsible":"Tatiane Braz De Oliveira","warranty":null,"equipment_state":"Ativa","notes":"Acrobat Pro DC atribu├¡da"}	::1	2026-06-24 13:29:25.219878+00
188	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	673e86c1-980f-4819-866e-7a27bf624696	{"type":"Licença","model":"Acrobat Pro DC","asset_id":"vinicius.andrade@planejamento.gov.br","equipment_id":null,"sector":null,"responsible":"Vinícius Pereira Andrade","warranty":null,"equipment_state":"Ativa","notes":"Acrobat Pro DC atribu├¡da"}	::1	2026-06-24 13:29:58.212144+00
193	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	fa930fa9-be95-443b-8d79-916e7dbf4de4	{"type":"Licença","model":"Gartner","asset_id":"wertiz.silva-junior@planejamento.gov.br","equipment_id":null,"sector":"SOF","responsible":"Wertiz Dantas da Silva Junior","warranty":null,"equipment_state":"ativa","notes":"Licença Gartner - Technical Professionals Team Member atribuída"}	::1	2026-06-24 13:32:42.287323+00
195	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	bb6037c0-ce9c-4494-8059-f49b91097e44	{"type":"Licença","model":"Gartner for Technical Professionals Team Leader","asset_id":"ramon.brandao@planejamento.gov.br","equipment_id":null,"sector":"SOF","responsible":"Ramon Gomes Brandão","warranty":null,"equipment_state":"ativa","notes":"Licença Gartner - Technical Professionals Team Leader atribuída"}	::1	2026-06-24 13:33:56.609734+00
196	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	ce7162f6-127f-423d-83ae-b31a45393a5b	{"type":"Licença","model":"Gartner CDAO Executive Team Member","asset_id":"silvafelipe.csilva@planejamento.gov.br","equipment_id":null,"sector":"SOF","responsible":"Felipe Cesar Araujo Da Silva","warranty":null,"equipment_state":"ativa","notes":"Licença Gartner - Technical Professionals Team Member atribuída"}	::1	2026-06-24 13:34:57.658676+00
197	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	aefaa084-a49c-4703-9e2e-18fcf7a79023	{"type":"Licença","model":"Power BI Pro","asset_id":"eduardo.m.araujo@planejamento.gov.br","equipment_id":null,"sector":null,"responsible":"Eduardo Moreira Araújo","warranty":null,"equipment_state":"Ativa","notes":"Power BI Pro atribu├¡da"}	::1	2026-06-24 13:35:29.378287+00
185	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	09e7bdd4-c2e9-47e7-89ea-24d2f125e78b	{"type":"Licença","model":"Acrobat Pro DC","asset_id":"laurinei.martins@planejamento.gov.br","equipment_id":null,"sector":null,"responsible":"Laurinei Pimentel Martins","warranty":null,"equipment_state":"Ativa","notes":"Acrobat Pro DC atribu├¡da"}	::1	2026-06-24 13:26:45.015935+00
186	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	9a135b45-5cb2-4093-aec2-3a7ec7f71715	{"type":"Licença","model":"Acrobat Pro DC","asset_id":"mirian.fiuza@planejamento.gov.br","equipment_id":null,"sector":null,"responsible":"Mirian de Fátima Fiuza de Oliveira","warranty":null,"equipment_state":"Ativa","notes":"Acrobat Pro DC atribu├¡da"}	::1	2026-06-24 13:28:36.622015+00
189	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	3fdf2f47-e224-4989-9815-df27d35c78b8	{"type":"Licença","model":"Adobe Creative Cloud - All Apps","asset_id":"karina.martins@planejamento.gov.br","equipment_id":null,"sector":null,"responsible":"Karina Rocha Martins","warranty":null,"equipment_state":"Ativa","notes":"Adobe Creative Cloud - All Apps atribu├¡da"}	::1	2026-06-24 13:30:36.458512+00
190	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	57913a3e-8dce-4fce-83cc-588e74f25283	{"type":"Licença","model":"Adobe Creative Cloud - All Apps","asset_id":"karine.costa@planejamento.gov.br","equipment_id":null,"sector":null,"responsible":"Karine Patrício Costa","warranty":null,"equipment_state":"Ativa","notes":"Adobe Creative Cloud - All Apps atribu├¡da"}	::1	2026-06-24 13:30:45.66721+00
191	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	02a2f783-c04e-4a0d-a0f6-40a937d09a3f	{"type":"Licença","model":"Adobe Creative Cloud - All Apps","asset_id":"viviane.barros@planejamento.gov.br","equipment_id":null,"sector":null,"responsible":"Viviane Gomes De Barros Nóbrega","warranty":null,"equipment_state":"Ativa","notes":"Adobe Creative Cloud - All Apps atribu├¡da"}	::1	2026-06-24 13:30:56.114021+00
192	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	a03b3591-fdb4-494d-bff0-ac846a224da1	{"type":"Licença","model":"Copilot Studio","asset_id":"vinicius.araujo@planejamento.gov.br","equipment_id":null,"sector":null,"responsible":"Vinícius Araújo dos Santos","warranty":null,"equipment_state":"Ativa","notes":"Copilot Studio atribu├¡da"}	::1	2026-06-24 13:31:52.887349+00
194	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	340d4e56-9ad7-4da3-b139-c4bbf8424e57	{"type":"Licença","model":"Gartner for Technical Professionals Member","asset_id":"ricardo.peixoto@planejamento.gov.br","equipment_id":null,"sector":"SOF","responsible":"Ricardo Tadeu de Albuquerque Peixoto","warranty":null,"equipment_state":"ativa","notes":"Licença Gartner - Technical Professionals Team Member atribuída"}	::1	2026-06-24 13:33:17.021878+00
198	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_inventory_item	inventory_item	ae79f293-06a8-42d0-8fa6-e585e668db11	{"id":"ae79f293-06a8-42d0-8fa6-e585e668db11"}	::1	2026-06-24 13:52:50.146959+00
199	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_inventory_item	inventory_item	5457430e-7791-4de2-a4f1-0f2f3310bcdf	{"id":"5457430e-7791-4de2-a4f1-0f2f3310bcdf"}	::1	2026-06-24 13:53:27.396892+00
200	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_inventory_item	inventory_item	09269ccd-1ce5-48da-8e73-e76fb689b58e	{"id":"09269ccd-1ce5-48da-8e73-e76fb689b58e"}	::1	2026-06-24 13:54:49.917841+00
201	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_inventory_item	inventory_item	651e5d66-c8ea-4826-a246-914c104e90aa	{"id":"651e5d66-c8ea-4826-a246-914c104e90aa"}	::1	2026-06-24 14:15:54.460484+00
202	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	9dc0d4e1-ce0e-4d68-8072-232a2f846496	{"type":"Licença","model":"Acrobat Pro DC","asset_id":"marilia.lima@planejamento.gov.br","equipment_id":null,"sector":null,"responsible":"Marília Oliveira Barbosa Lima","warranty":null,"equipment_state":"Ativa","notes":"Acrobat Pro DC atribu├¡da"}	::1	2026-06-24 14:18:56.12756+00
296	32fa09a3-ba6d-4a75-ab60-95804c18b232	Excluiu painel	dashboard	ecda16ae-c9c6-4cbc-8343-6affa9241d50	\N	::1	2026-07-22 12:49:21.904148+00
203	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	218553ca-2860-4ac6-9d44-2e47319a3aff	{"type":"Licença","model":"Acrobat Pro DC","asset_id":"moises.s.carvalho@planejamento.gov.br","equipment_id":null,"sector":null,"responsible":"Moisés dos Santos Carvalho","warranty":null,"equipment_state":"Ativa","notes":"Acrobat Pro DC atribu├¡da"}	::1	2026-06-24 14:20:31.00076+00
204	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_inventory_item	inventory_item	a3e99887-fc3d-4cab-9a93-a1df6a4f920e	{"id":"a3e99887-fc3d-4cab-9a93-a1df6a4f920e"}	::1	2026-06-24 14:22:10.421265+00
205	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_inventory_item	inventory_item	2aa05c22-d3da-48c1-81db-f993b37bbc9e	{"id":"2aa05c22-d3da-48c1-81db-f993b37bbc9e"}	::1	2026-06-24 14:25:50.852485+00
206	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_inventory_item	inventory_item	55248c53-648a-4bdc-8596-e7b3b58b5212	{"id":"55248c53-648a-4bdc-8596-e7b3b58b5212"}	::1	2026-06-24 14:34:52.072917+00
207	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	fa930fa9-be95-443b-8d79-916e7dbf4de4	{"type":"Licença","model":"Gartner for Technical Professionals Member","asset_id":"wertiz.silva-junior@planejamento.gov.br","equipment_id":null,"sector":"SOF","responsible":"Wertiz Dantas da Silva Junior","warranty":null,"equipment_state":"ativa","notes":"Licença Gartner - Technical Professionals Team Member atribuída"}	::1	2026-06-24 14:36:25.893787+00
208	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	340d4e56-9ad7-4da3-b139-c4bbf8424e57	{"type":"Licença","model":"Gartner CDAO Executive Team Member","asset_id":"ricardo.peixoto@planejamento.gov.br","equipment_id":null,"sector":"SOF","responsible":"Ricardo Tadeu de Albuquerque Peixoto","warranty":null,"equipment_state":"ativa","notes":"Licença Gartner - Technical Professionals Team Member atribuída"}	::1	2026-06-24 14:40:17.647941+00
209	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_inventory_item	inventory_item	340d4e56-9ad7-4da3-b139-c4bbf8424e57	{"type":"Licença","model":"Gartner for Technical Professionals Member","asset_id":"ricardo.peixoto@planejamento.gov.br","equipment_id":null,"sector":"SOF","responsible":"Ricardo Tadeu de Albuquerque Peixoto","warranty":null,"equipment_state":"ativa","notes":"Licença Gartner - Technical Professionals Team Member atribuída"}	::1	2026-06-24 14:40:50.652314+00
210	\N	login_failed	auth	\N	email:admin@test.com error:Invalid login credentials	::1	2026-06-26 11:22:47.764667+00
211	32fa09a3-ba6d-4a75-ab60-95804c18b232	mark_notifications_read	notificacoes	\N	Todas as notificações foram marcadas como lidas.	\N	2026-07-02 15:06:41.400776+00
212	32fa09a3-ba6d-4a75-ab60-95804c18b232	logout	auth	\N	Logout via botão de perfil	::1	2026-07-03 11:16:23.209248+00
213	32fa09a3-ba6d-4a75-ab60-95804c18b232	login	auth	\N	Login via formulário	::1	2026-07-03 11:16:37.292407+00
214	\N	login_failed	auth	\N	email:victor.rf@sempreceub.com error:Invalid login credentials	::1	2026-07-03 11:18:15.101926+00
215	\N	login_failed	auth	\N	email:victor.rf@sempreceub.com error:Invalid login credentials	::1	2026-07-03 11:18:21.808945+00
216	\N	login_failed	auth	\N	email:victor.rf@sempreceub.com error:Invalid login credentials	::1	2026-07-03 11:18:26.353712+00
217	\N	login_failed	auth	\N	email:victor.rf@sempreceub.com error:Invalid login credentials	::1	2026-07-03 11:18:31.480004+00
218	\N	login_failed	auth	\N	email:victor.rf@sempreceub.com error:Invalid login credentials	::1	2026-07-03 11:19:09.312299+00
219	\N	login_failed	auth	\N	email:victor.rf@sempreceub.com error:Invalid login credentials	::1	2026-07-03 11:19:12.099376+00
220	\N	password_reset_requested	auth	\N	email:victor.rf@sempreceub.com	::1	2026-07-03 11:23:54.746915+00
222	\N	login_failed	auth	\N	email:victor.rf@sempreceub.com error:Invalid login credentials	::1	2026-07-03 11:30:19.896595+00
224	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_notification	notificacoes	92945e60-79e3-4a96-97b4-c26c5f0ae25c	Notificação removida.	\N	2026-07-06 14:09:04.639286+00
225	32fa09a3-ba6d-4a75-ab60-95804c18b232	login	auth	\N	Login via formulário	::1	2026-07-06 14:16:47.917053+00
226	\N	login_failed	auth	\N	email: error:missing email or phone	::1	2026-07-06 14:21:29.171723+00
227	32fa09a3-ba6d-4a75-ab60-95804c18b232	login	auth	\N	Login via formulário	::1	2026-07-06 14:21:57.777638+00
228	32fa09a3-ba6d-4a75-ab60-95804c18b232	login	auth	\N	Login via formulário	::ffff:10.209.178.28	2026-07-06 14:36:34.523701+00
229	\N	login_failed	auth	\N	email:stuani255@gmail.com error:Invalid login credentials	::ffff:10.209.178.24	2026-07-06 14:38:52.089876+00
230	\N	password_reset_requested	auth	\N	email:stuani255@gmail.com	::ffff:10.209.178.24	2026-07-06 14:39:05.785191+00
231	\N	password_reset_requested	auth	\N	email:victor.rf@sempreceub.com	::ffff:10.209.178.28	2026-07-06 14:43:06.288149+00
232	\N	password_reset_requested	auth	\N	email:victor.rf@sempreceub.com	::1	2026-07-07 10:59:54.602053+00
233	\N	password_reset_requested	auth	\N	email:victor.rf@sempreceub.com	127.0.0.1	2026-07-07 11:09:42.178174+00
235	\N	login_failed	auth	\N	email:victor.rf@sempreceub.com error:Invalid login credentials	::ffff:10.209.178.28	2026-07-08 12:28:27.975067+00
236	\N	login_failed	auth	\N	email:victor.rf@sempreceub.com error:Invalid login credentials	::ffff:10.209.178.28	2026-07-08 12:28:37.95408+00
237	\N	password_reset_requested	auth	\N	email:victor.rf@sempreceub.com	::ffff:10.209.178.28	2026-07-08 12:28:50.822151+00
238	\N	signup_failed	auth	\N	email:victor.rf@sempreceub.com error:{"__isAuthError":true,"name":"AuthRetryableFetchError","status":504}	::ffff:10.209.178.28	2026-07-08 14:31:09.204262+00
239	\N	signup_failed	auth	\N	email:victor.rf@sempreceub.com error:{"__isAuthError":true,"name":"AuthRetryableFetchError","status":504}	::ffff:10.209.178.28	2026-07-08 14:35:47.359292+00
240	\N	signup_failed	auth	\N	email:victor.rf@sempreceub.com error:{"__isAuthError":true,"name":"AuthRetryableFetchError","status":504}	::ffff:10.209.178.28	2026-07-08 14:55:14.56293+00
241	\N	signup_failed	auth	\N	email:victor.rf@sempreceub.com error:{"__isAuthError":true,"name":"AuthApiError","status":429,"code":"over_email_send_rate_limit"}	::1	2026-07-08 14:57:20.805881+00
242	\N	signup_failed	auth	\N	email:victor.rf@sempreceub.com error:{"__isAuthError":true,"name":"AuthRetryableFetchError","status":504}	::ffff:10.209.178.28	2026-07-09 12:49:58.530302+00
243	\N	signup_failed	auth	\N	email:victor.rf@sempreceub.com error:{"__isAuthError":true,"name":"AuthRetryableFetchError","status":504}	::ffff:10.209.178.28	2026-07-09 13:10:57.900219+00
246	\N	signup_failed	auth	\N	email:Aassamasm@gmail.com error:{"__isAuthError":true,"name":"AuthRetryableFetchError","status":504}	::ffff:10.209.178.28	2026-07-09 13:34:13.613047+00
247	\N	signup_failed	auth	\N	email:victor.rf@sempreceub.com error:{"__isAuthError":true,"name":"AuthApiError","status":429,"code":"over_email_send_rate_limit"}	::ffff:10.209.178.28	2026-07-09 14:41:47.571528+00
249	\N	login_failed	auth	\N	email:victor.rf@sempreceub.com error:{"__isAuthError":true,"name":"AuthApiError","status":400,"code":"invalid_credentials"}	::ffff:10.209.178.28	2026-07-09 14:44:06.538807+00
250	\N	password_reset_requested	auth	\N	email:victor.rf@sempreceub.com	::ffff:10.209.178.28	2026-07-09 14:44:21.623655+00
256	32fa09a3-ba6d-4a75-ab60-95804c18b232	login	auth	\N	Login via formulário	::1	2026-07-13 11:22:51.731338+00
257	32fa09a3-ba6d-4a75-ab60-95804c18b232	upload_storage	storage	documentos/1784294542030_Teste.pdf	Upload de arquivo no bucket documentos em 1784294542030_Teste.pdf	\N	2026-07-17 13:22:22.260478+00
298	32fa09a3-ba6d-4a75-ab60-95804c18b232	Excluiu painel	dashboard	65698731-ce6c-48ee-84d8-3e92d164449f	\N	::1	2026-07-22 12:49:23.524189+00
258	32fa09a3-ba6d-4a75-ab60-95804c18b232	Criou painel	dashboard	af8674a1-770a-4bf7-bfbb-9dee0a93be5d	{"nome":"Teste","categoria":"BI Munis","descricao":"","tipo_acesso":"publico","responsavel":"","desenvolvedor":"","fonte_dados":"","dados_sensiveis":false,"secretaria":"","arquivo_path":"1784294542030_Teste.pdf","criado_por":"32fa09a3-ba6d-4a75-ab60-95804c18b232"}	::1	2026-07-17 13:22:22.300122+00
259	32fa09a3-ba6d-4a75-ab60-95804c18b232	upload_storage	storage	documentos/1784294625681_Teste.pdf	Upload de arquivo no bucket documentos em 1784294625681_Teste.pdf	\N	2026-07-17 13:23:45.737713+00
260	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_storage	storage	documentos/1784294542030_Teste.pdf	Remoção de arquivo no bucket documentos em 1784294542030_Teste.pdf	\N	2026-07-17 13:24:06.415532+00
261	32fa09a3-ba6d-4a75-ab60-95804c18b232	Excluiu painel	dashboard	af8674a1-770a-4bf7-bfbb-9dee0a93be5d	\N	::1	2026-07-17 13:24:07.268137+00
262	32fa09a3-ba6d-4a75-ab60-95804c18b232	upload_storage	storage	documentos/1784294653808_teste.pdf	Upload de arquivo no bucket documentos em 1784294653808_teste.pdf	\N	2026-07-17 13:24:13.856163+00
263	32fa09a3-ba6d-4a75-ab60-95804c18b232	Criou painel	dashboard	ecda16ae-c9c6-4cbc-8343-6affa9241d50	{"nome":"teste","categoria":"BI Munis","descricao":"","tipo_acesso":"publico","responsavel":"","desenvolvedor":"","fonte_dados":"","dados_sensiveis":false,"secretaria":"","arquivo_path":"1784294653808_teste.pdf","criado_por":"32fa09a3-ba6d-4a75-ab60-95804c18b232"}	::1	2026-07-17 13:24:13.891778+00
264	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_storage	storage	documentos/1784294653808_teste.pdf	Remoção de arquivo no bucket documentos em 1784294653808_teste.pdf	\N	2026-07-17 13:24:32.378607+00
265	32fa09a3-ba6d-4a75-ab60-95804c18b232	Excluiu painel	dashboard	ecda16ae-c9c6-4cbc-8343-6affa9241d50	\N	::1	2026-07-17 13:24:33.462534+00
266	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_storage	storage	documentos/1784294542030_Teste.pdf	Remoção de arquivo no bucket documentos em 1784294542030_Teste.pdf	\N	2026-07-17 13:24:35.663736+00
267	32fa09a3-ba6d-4a75-ab60-95804c18b232	Excluiu painel	dashboard	af8674a1-770a-4bf7-bfbb-9dee0a93be5d	\N	::1	2026-07-17 13:24:36.350521+00
268	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_storage	storage	documentos/1784294653808_teste.pdf	Remoção de arquivo no bucket documentos em 1784294653808_teste.pdf	\N	2026-07-17 13:24:48.897547+00
269	32fa09a3-ba6d-4a75-ab60-95804c18b232	Excluiu painel	dashboard	ecda16ae-c9c6-4cbc-8343-6affa9241d50	\N	::1	2026-07-17 13:24:49.661405+00
270	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_storage	storage	documentos/1784294542030_Teste.pdf	Remoção de arquivo no bucket documentos em 1784294542030_Teste.pdf	\N	2026-07-17 13:24:51.677693+00
271	32fa09a3-ba6d-4a75-ab60-95804c18b232	Excluiu painel	dashboard	af8674a1-770a-4bf7-bfbb-9dee0a93be5d	\N	::1	2026-07-17 13:24:51.996086+00
272	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_storage	storage	documentos/1784294653808_teste.pdf	Remoção de arquivo no bucket documentos em 1784294653808_teste.pdf	\N	2026-07-17 13:31:52.239139+00
273	32fa09a3-ba6d-4a75-ab60-95804c18b232	Excluiu painel	dashboard	ecda16ae-c9c6-4cbc-8343-6affa9241d50	\N	::1	2026-07-17 13:31:53.468749+00
274	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_storage	storage	documentos/1784294542030_Teste.pdf	Remoção de arquivo no bucket documentos em 1784294542030_Teste.pdf	\N	2026-07-17 13:31:55.116083+00
275	32fa09a3-ba6d-4a75-ab60-95804c18b232	Excluiu painel	dashboard	af8674a1-770a-4bf7-bfbb-9dee0a93be5d	\N	::1	2026-07-17 13:31:55.438703+00
276	32fa09a3-ba6d-4a75-ab60-95804c18b232	upload_storage	storage	documentos/1784297340790_teste.pdf	Upload de arquivo no bucket documentos em 1784297340790_teste.pdf	\N	2026-07-17 14:09:00.890278+00
277	32fa09a3-ba6d-4a75-ab60-95804c18b232	Criou painel	dashboard	65698731-ce6c-48ee-84d8-3e92d164449f	{"nome":"teste ","categoria":"BI Munis","descricao":"","tipo_acesso":"publico","responsavel":"","desenvolvedor":"","fonte_dados":"","dados_sensiveis":false,"secretaria":"","arquivo_path":"1784297340790_teste.pdf","criado_por":"32fa09a3-ba6d-4a75-ab60-95804c18b232"}	::1	2026-07-17 14:09:00.92259+00
278	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_storage	storage	documentos/1784294542030_Teste.pdf	Remoção de arquivo no bucket documentos em 1784294542030_Teste.pdf	\N	2026-07-17 14:11:10.275483+00
279	32fa09a3-ba6d-4a75-ab60-95804c18b232	Excluiu painel	dashboard	af8674a1-770a-4bf7-bfbb-9dee0a93be5d	\N	::1	2026-07-17 14:11:12.364337+00
280	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_storage	storage	documentos/1784294653808_teste.pdf	Remoção de arquivo no bucket documentos em 1784294653808_teste.pdf	\N	2026-07-17 14:11:15.897862+00
281	32fa09a3-ba6d-4a75-ab60-95804c18b232	Excluiu painel	dashboard	ecda16ae-c9c6-4cbc-8343-6affa9241d50	\N	::1	2026-07-17 14:11:16.6073+00
282	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_storage	storage	documentos/1784297340790_teste.pdf	Remoção de arquivo no bucket documentos em 1784297340790_teste.pdf	\N	2026-07-17 14:11:24.148838+00
283	32fa09a3-ba6d-4a75-ab60-95804c18b232	Excluiu painel	dashboard	65698731-ce6c-48ee-84d8-3e92d164449f	\N	::1	2026-07-17 14:11:24.984928+00
284	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_profile_permissions	profile	682335d9-e33a-4f99-a302-26a81f68f588	{"role":"painel_editor","permissions":{"dashboard":{"view":true,"edit":true,"create":true,"delete":false},"sistemas":{"view":true,"edit":false,"create":false,"delete":false},"inventario":{"view":true,"edit":false,"create":false,"delete":false},"levantamento":{"view":true,"edit":false,"create":false,"delete":false},"usuarios":{"view":false,"edit":false,"create":false,"delete":false},"notificacoes":{"view":false,"edit":false,"create":false,"delete":false},"areas":{"view":true,"edit":false,"create":false,"delete":false},"fontes_dados":{"view":true,"edit":false,"create":false,"delete":false},"registros":{"view":false,"edit":false,"create":false,"delete":false}}}	::1	2026-07-21 11:55:40.175927+00
285	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_profile_permissions	profile	682335d9-e33a-4f99-a302-26a81f68f588	{"role":"viewer","permissions":{"dashboard":{"view":true,"edit":false,"create":false,"delete":false},"levantamento":{"view":true,"edit":false,"create":false,"delete":false},"sistemas":{"view":true,"edit":false,"create":false,"delete":false},"inventario":{"view":true,"edit":false,"create":false,"delete":false},"usuarios":{"view":false,"edit":false,"create":false,"delete":false},"notificacoes":{"view":false,"edit":false,"create":false,"delete":false},"areas":{"view":true,"edit":false,"create":false,"delete":false},"fontes_dados":{"view":true,"edit":false,"create":false,"delete":false},"registros":{"view":false,"edit":false,"create":false,"delete":false}}}	::1	2026-07-21 11:55:44.223724+00
286	32fa09a3-ba6d-4a75-ab60-95804c18b232	update_profile_permissions	profile	8ada9593-b7d8-4127-a579-510646b10bf5	{"role":"viewer","permissions":{"dashboard":{"view":true,"edit":false,"create":false,"delete":false},"levantamento":{"view":true,"edit":false,"create":false,"delete":false},"sistemas":{"view":true,"edit":false,"create":false,"delete":false},"inventario":{"view":true,"edit":false,"create":false,"delete":false},"usuarios":{"view":false,"edit":false,"create":false,"delete":false},"notificacoes":{"view":false,"edit":false,"create":false,"delete":false},"areas":{"view":true,"edit":false,"create":false,"delete":false},"fontes_dados":{"view":true,"edit":false,"create":false,"delete":false},"registros":{"view":false,"edit":false,"create":false,"delete":false}}}	::1	2026-07-21 11:58:58.809571+00
287	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_storage	storage	documentos/1784297340790_teste.pdf	Remoção de arquivo no bucket documentos em 1784297340790_teste.pdf	\N	2026-07-22 12:38:42.251746+00
288	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_storage	storage	documentos/1784294653808_teste.pdf	Remoção de arquivo no bucket documentos em 1784294653808_teste.pdf	\N	2026-07-22 12:38:45.250968+00
289	32fa09a3-ba6d-4a75-ab60-95804c18b232	Excluiu painel	dashboard	65698731-ce6c-48ee-84d8-3e92d164449f	\N	::1	2026-07-22 12:38:45.394666+00
290	32fa09a3-ba6d-4a75-ab60-95804c18b232	Excluiu painel	dashboard	ecda16ae-c9c6-4cbc-8343-6affa9241d50	\N	::1	2026-07-22 12:38:45.745846+00
294	32fa09a3-ba6d-4a75-ab60-95804c18b232	Excluiu painel	dashboard	af8674a1-770a-4bf7-bfbb-9dee0a93be5d	\N	::1	2026-07-22 12:49:20.346131+00
295	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_storage	storage	documentos/1784294653808_teste.pdf	Remoção de arquivo no bucket documentos em 1784294653808_teste.pdf	\N	2026-07-22 12:49:21.8422+00
297	32fa09a3-ba6d-4a75-ab60-95804c18b232	delete_storage	storage	documentos/1784297340790_teste.pdf	Remoção de arquivo no bucket documentos em 1784297340790_teste.pdf	\N	2026-07-22 12:49:23.463983+00
\.


--
-- Data for Name: equipamentos; Type: TABLE DATA; Schema: public; Owner: horus_admin
--

COPY public.equipamentos (id, tipo, modelo, etiqueta, usuario_alocado, responsavel_legal, garantia_ativa, estado_conservacao, criado_em, atualizado_em) FROM stdin;
\.


--
-- Data for Name: equipment_files; Type: TABLE DATA; Schema: public; Owner: horus_admin
--

COPY public.equipment_files (id, equipment_id, file_url, file_name, file_type, created_by, created_at) FROM stdin;
23	426	equipments/426/1781701527449_Layout_-_SAGE_IPEA.pdf	Layout_-_SAGE_IPEA.pdf	application/pdf	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-06-17 13:05:30.249523+00
24	426	equipments/426/1781701530418_aaaa.pdf	aaaa.pdf	application/pdf	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-06-17 13:05:31.308886+00
25	426	equipments/426/1781701531472_Fundamento_de_Dados.jpeg	Fundamento_de_Dados.jpeg	image/jpeg	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-06-17 13:05:32.158123+00
\.


--
-- Data for Name: fontes_dados; Type: TABLE DATA; Schema: public; Owner: horus_admin
--

COPY public.fontes_dados (id, nome, created_at) FROM stdin;
62bc51ca-71bc-41e0-8aa0-ee1196c8a8c5	SIAFI	2026-05-04 13:46:54.992713+00
e5b069e2-c8c9-4366-972a-2ff7a43d20db	SIAPE	2026-05-04 13:46:54.992713+00
de189a48-3b4d-4443-abdb-3473937685de	SIGPLAN	2026-05-04 13:46:54.992713+00
82468355-baf0-46bc-836c-d0ed429aa034	SIGA	2026-05-04 13:46:54.992713+00
e8e686c5-5a6c-425b-875d-6e5e7f08744d	SharePoint	2026-05-04 13:46:54.992713+00
de0a8e37-9088-49c0-a5da-d28ab4198db5	Power BI Service	2026-05-04 13:46:54.992713+00
221fd849-0f9d-488e-a2d6-2055ba65cad2	SICONV	2026-05-04 13:46:54.992713+00
b8d88ad8-7cc6-4f5f-9371-b6fa6327eac1	Tesouro Gerencial	2026-05-04 13:46:54.992713+00
eb0ae062-d687-4e2d-bb89-6930ab446c4c	SIORG	2026-05-04 13:46:54.992713+00
a9ab8d9b-2eee-4cd4-bb60-779f9fd6bc6c	SEI	2026-05-04 13:46:54.992713+00
\.


--
-- Data for Name: inventory_items; Type: TABLE DATA; Schema: public; Owner: horus_admin
--

COPY public.inventory_items (id, asset_id, equipment_id, type, model, sector, allocated_user, responsible, legal_responsible, warranty, equipment_state, created_by, created_at, allocated_user_id, asset_type, mac_ip, bios, notes, subsector, sei_process_number, updated_at, serial_number) FROM stdin;
7f56e0bc-7701-4e28-8632-d4b09749be48	47959716	GNSO9XA014163	Monitor	AOC / 24P1U	COTIC	\N	Tâmila Rayane Espíndola De Brito Lima/  Luiz Felipe Bertassoni Pinto	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-10 12:49:37.815+00	GNSO9XA014167
17cf6fa4-b603-4cd5-bd5c-3ec9ce9e63e1	sousamara.sousa@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	Mara Helena Sousa	\N	\N	ativa	\N	2026-06-23 14:45:15.033838+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-23 14:45:15.033838+00	\N
4d128fb9-68a0-43db-b1bd-02143269fd46	rodriguesmariana.rodrigues@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	Mariana Cunha Eleutério Rodrigues	\N	\N	ativa	\N	2026-06-23 14:45:15.033838+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-23 14:45:15.033838+00	\N
c7ded00e-5176-40ab-bf8a-6e64ce4fc2bb	netomario.valverde@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	Mario dos Santos Morais Valverde Neto	\N	\N	ativa	\N	2026-06-23 14:45:15.033838+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-23 14:45:15.033838+00	\N
fce64584-4f8d-4acf-8621-852547f3ab05	salgadomaristella.salgado@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	Maristella Alves do Nascimento Salgado	\N	\N	ativa	\N	2026-06-23 14:45:15.033838+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-23 14:45:15.033838+00	\N
6bc93a3d-6116-4502-965b-1eef0d38720a	annananahira.rabelo@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	Nanahira de Rabelo e Sant'Anna	\N	\N	ativa	\N	2026-06-23 14:45:15.033838+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-23 14:45:15.033838+00	\N
ca6fafc4-c1fa-4fa5-aa83-cc74485ef80a	rochapaulo-n.rocha@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	Paulo Eduardo Nunes de Moura Rocha	\N	\N	ativa	\N	2026-06-23 14:45:15.033838+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-23 14:45:15.033838+00	\N
196ccb7a-0e87-4df4-9141-aff91eadf6b6	silvapedro.barbosa@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	Pedro Barbosa da Silva	\N	\N	ativa	\N	2026-06-23 14:45:15.033838+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-23 14:45:15.033838+00	\N
236e9e09-8b43-443f-ba5a-7ea6a0acdea9	sganzerlapriscilla.pimentel@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	Priscilla Rosa Pimentel Sganzerla	\N	\N	ativa	\N	2026-06-23 14:45:15.033838+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-23 14:45:15.033838+00	\N
d62c5526-62c5-4ade-823f-b4a24d7bfa93	jeaner.silva@planejamento.gov.br	\N	Licença	Power BI Pro		\N	Jeaner Luis de Paula Silva	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Power BI Pro atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
63452d92-a042-417d-92b0-a1169a345d8b	luiz.gondin@planejamento.gov.br	\N	Licença	Power BI Pro		\N	Luiz Gondin	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Power BI Pro atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
aa6523f3-639a-4a3e-9cd8-1996b5d2ce19	luzia.melo@planejamento.gov.br	\N	Licença	Power BI Pro		\N	Luzia Maria Cavalcante de Mello	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Power BI Pro atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
9c4c9118-86a6-4b23-83c7-03119d540e04	maira.costa@planejamento.gov.br	\N	Licença	Power BI Pro		\N	Maíra Murrieta Costa	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Power BI Pro atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
42097930-69d8-4dcb-9bca-d953563f1594	mara.sousa@planejamento.gov.br	\N	Licença	Power BI Pro		\N	Mara Helena Sousa	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Power BI Pro atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
8b501815-e222-449f-87bb-87d434e99e31	marcelo.prudente@planejamento.gov.br	\N	Licença	Power BI Pro		\N	Marcelo Augusto Prudente Lima	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Power BI Pro atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
450147e1-0a57-4c88-9033-6c3bfc2b6e2a	marcelo.s.pereira@planejamento.gov.br	\N	Licença	Power BI Pro		\N	Marcelo De Souza Pereira	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Power BI Pro atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
0080cbc2-cfc1-4124-83e7-8494c0f7b1be	matheus.soares@planejamento.gov.br	\N	Licença	Power BI Pro		\N	Matheus Varanda Soares	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Power BI Pro atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
4e730a27-e564-4582-87a3-fdb00e1fe13c	priscilla.pimentel@planejamento.gov.br	\N	Licença	Power BI Pro		\N	Priscilla Rosa Pimentel Sganzerla	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Power BI Pro atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
3c97f823-51ba-4d0a-be3d-a0bf74bc3df1	suia.rocha@planejamento.gov.br	\N	Licença	Power BI Pro		\N	Suia Kafure Da Rocha	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Power BI Pro atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
3409e929-6825-4751-83a9-5b3fe42b7084	vitor.goncalves@planejamento.gov.br	\N	Licença	Power BI Pro		\N	Vitor Gabriel Gonçalves Da Silva	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Power BI Pro atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
a68c4fe8-ebe6-44c0-a2fe-540e0ccb40e4	waldeck.araujo@planejamento.gov.br	\N	Licença	Power BI Pro		\N	Waldeck Pinto de Araujo Junior	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Power BI Pro atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
0cdcb5ed-19ca-4436-9c5c-f719f7c888c0	welton.barros@planejamento.gov.br	\N	Licença	Power BI Pro		\N	Welton Barros	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Power BI Pro atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
35702c98-5e67-4c86-bc76-2674fb4aa2aa	davi-r.silva@planejamento.gov.br	\N	Licença	Acrobat Pro DC		\N	Davi Santana Cesar Rodrigues da Silva	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Acrobat Pro DC atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
68722177-e08c-41a7-b3ed-748a6c56b6ec	eduardo.stuani@planejamento.gov.br	\N	Licença	Acrobat Pro DC	COTIC	\N	Eduardo do Nascimento Stuani	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Acrobat Pro DC atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
e7bfca14-e23c-4f1d-8787-e76b56754b17	gustavo.gumaraes@planejamento.gov.br	\N	Licença	Acrobat Pro DC		\N	Gustavo José de Guimarães e Souza	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Acrobat Pro DC atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
dff88213-a37c-4d68-a299-5c15d6c751e6	leandro.lira@planejamento.gov.br	\N	Licença	Acrobat Pro DC		\N	Leandro de Lima Lira	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Acrobat Pro DC atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
74ad49b4-bac0-4c10-b3cf-f3dac3d376f2	mario.valverde@planejamento.gov.br	\N	Licença	Acrobat Pro DC		\N	Mário dos Santos Morais Valverde Neto	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Acrobat Pro DC atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
31c7cb05-c974-4c76-a6c8-637c6f61132b	ricardo.teixeira@planejamento.gov.br	\N	Licença	Acrobat Pro DC	CGEST	\N	Ricardo de Assis Teixeira	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Acrobat Pro DC atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
e80ee89c-91f2-443d-8bdf-60c9baac20a1	vinicius.jovito@planejamento.gov.br	\N	Licença	Acrobat Pro DC	COTIC	\N	Vinícius Soares Jovito	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Acrobat Pro DC atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
f01e1119-fbfd-4c3d-9795-b1f2786f7629	cristiane.carvalho@planejamento.gov.br	\N	Licença	Adobe Creative Cloud - All Apps		\N	Cristiane Gonzaga Chaves de Carvalho	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Adobe Creative Cloud - All Apps atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
ed34eb16-2608-464e-8cbc-59ab497e762a	denise.gontijo@planejamento.gov.br	\N	Licença	Adobe Creative Cloud - All Apps		\N	Denise Herminio Gontijo	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Adobe Creative Cloud - All Apps atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
39dd3dd0-665b-4c1e-b905-f9c665af5fcf	fabiano.chaves@planejamento.gov.br	\N	Licença	Adobe Creative Cloud - All Apps		\N	Fabiano Chaves da Silva	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Adobe Creative Cloud - All Apps atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
405058e9-21cb-4df6-9e02-9c97ae73d6ed	oscar.zveiter@planejamento.gov.br	\N	Licença	Adobe Creative Cloud - All Apps		\N	Oscar Zveiter Neto	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Adobe Creative Cloud - All Apps atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
7fa38155-474c-4ac0-bed3-eb82ef4ca5f4	cesar.mascarenhas@planejamento.gov.br	\N	Licença	Copilot Add-on		\N	César Augusto Assis Mascarenhas de Oliveira	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
40216786-f8ae-4d80-8e3f-0f37c46ca366	daniel.s.coelho@planejamento.gov.br	\N	Licença	Copilot Add-on		\N	Daniel Souza Coelho	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
ca0beae1-ef06-4ee4-9ec0-6a33c2c4cddf	edimilson.oliveira@planejamento.gov.br	\N	Licença	Copilot Add-on		\N	Edimilson Torres de Oliveira Neto	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
31c0448b-2b3b-46cb-ab5a-6ef6c79f97a5	47959717	GNSO9XA014167	Monitor	AOC / 24P1U	COTIC	\N	Tâmila Rayane Espíndola De Brito Lima/  Luiz Felipe Bertassoni Pinto	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-09 14:44:23.728+00	GNSO9XA014163
a6f90b83-343f-4fbb-bb39-20c619486d12	hermann.mirindiba@planejamento.gov.br	\N	Licença	Copilot Add-on		\N	Hermann Moraes Mirindiba	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
7a9ebb80-f244-43e5-9d57-b50eaac41ffb	raquel.sampaio@planejamento.gov.br	\N	Licença	Copilot Add-on		\N	Raquel Braga Barreto Sampaio	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
70dfbca3-7490-494e-b4fc-68ae9f9a718b	47959602	GNSO8XA008995	Monitor	AOC / 24P1U	COGEP	\N	Carolina Menna Soares Pinto / Luciane de Sousa Piccini Lopes	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSO8XA008995
e43d654c-896d-4bd6-acad-816cfed29ebc	mauro.t.santos@planejamento.gov.br		Licença	Gartner for Technical Professionals Team Member	SE	\N	Mauro Tapajós Santos	\N		ativa	\N	2026-06-23 15:01:07.315897+00	\N	SW		\N	Licença Gartner - Technical Professionals Team Member atribuída	\N	\N	2026-06-23 15:01:07.315897+00	
f7f63c51-b53c-477b-8b72-ef6a7355c6d4	monade.costa@planejamento.gov.br		Licença	Gartner for Technical Professionals Team Member	SOF	\N	Monade Rassa Souza Costa	\N		ativa	\N	2026-06-23 15:01:07.315897+00	\N	SW		\N	Licença Gartner - Technical Professionals Team Member atribuída	\N	\N	2026-06-23 15:01:07.315897+00	
567552b6-a5d3-4bc9-a298-8bdba6b392ec	nelson.fonseca@planejamento.gov.br		Licença	Gartner for Technical Professionals Team Member	SOF	\N	Nelson Sattler da Fonseca	\N		ativa	\N	2026-06-23 15:01:07.315897+00	\N	SW		\N	Licença Gartner - Technical Professionals Team Member atribuída	\N	\N	2026-06-23 15:01:07.315897+00	
0c17dab4-d406-4f5f-924c-fdb6ec4f5be4	alvaro.carneiro@planejamento.gov.br	\N	Licença	Copilot Add-on	COTIC	\N	Álvaro José de Andrade Carneiro	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
ac46a3e0-abe4-45b2-8dd3-12b462b56269	daniel.reiss@planejamento.gov.br	\N	Licença	Copilot Add-on		\N	Daniel Gersten Reiss	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
48ffe524-cdbe-4c1a-9774-0ded2bcf1f99	thomaz.fronzaglia@planejamento.gov.br		Licença	Copilot Add-on		\N	Thomaz Fronzaglia	\N		ativa	\N	2026-06-23 15:01:07.315897+00	\N	SW		\N	Copilot Add-on atribuída	\N	\N	2026-06-23 15:01:07.315897+00	
1e2977a9-3e22-4bd5-bf39-9390afdef175	gustavo.bruzzeguez@planejamento.gov.br	\N	Licença	Copilot Add-on	CGTCO	\N	Gustavo Andrade Bruzzeguez	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
aa6cd078-4c08-49fa-bb56-d4060a0c1ca0	luciano.pacheco@planejamento.gov.br	\N	Licença	Copilot Add-on		\N	Luciano da Silva Pacheco	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
87a93bc7-fb5d-4dd9-94f7-1d7f760ebcb0	joao.figueredo@planejamento.gov.br	\N	Licença	Copilot Add-on		\N	João Gabriel Dias Figueredo	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
80486f7b-b6c1-4aa4-92fa-7f6b1f18370a	leonardo.c.mello@planejamento.gov.br	\N	Licença	Copilot Add-on		\N	Leonardo Mello	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
c05690dd-3394-450a-bc85-ce6e532551f8	rodolfo.aguiar@planejamento.gov.br	\N	Licença	Copilot Add-on		\N	Rodolfo Vaz Oliveira Aguiar	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
5b1f4011-6004-4e84-bd63-46a8fff8f821	luiz.a.neto@planejamento.gov.br	\N	Licença	Copilot Studio		\N	Luiz Alves Antonio Neto	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Copilot Studio atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
41f6eb6c-fad3-49f6-baab-c74cb09dd9a5	jorge.arbex@planejamento.gov.br	\N	Licença	Copilot Studio	COTIC	\N	Jorge Toufic Arbex	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Copilot Studio atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
0fe6ba54-c42f-4592-a708-0d6ce6421aeb	luiz.h.moreira@planejamento.gov.br	\N	Licença	Copilot Studio		\N	Luiz Henrique Moreira	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Copilot Studio atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
9cc880e7-ec3a-483b-b700-7049b56c630d	marcelo.shinkoda@planejamento.gov.br	\N	Licença	Copilot Studio		\N	Marcelo Shinkoda	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Copilot Studio atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
8ab74549-0ab2-4801-973e-9e43064ccff3	pedro.aguiar@planejamento.gov.br	\N	Licença	Copilot Studio		\N	Pedro De Souza Aguiar	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Copilot Studio atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
0de2972a-a3c2-4a2b-bef3-33048de939ee	ricardo.almeida@planejamento.gov.br	\N	Licença	Copilot Studio		\N	Ricardo Almeida Carvalho	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Copilot Studio atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
f0afd289-9f80-496b-89e9-412ecd2375af	rodrigo.c.silva@planejamento.gov.br	\N	Licença	Copilot Studio		\N	Rodrigo Cardoso Da Silva	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Copilot Studio atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
6c513f9d-70c1-45a3-9691-b12f7a433cd1	david.meister@planejamento.gov.br	\N	Licença	Planner Plan		\N	David Meister	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Planner Plan atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
ea60816e-b6af-42e0-8e96-7e1505cb50e7	everton.ramos@planejamento.gov.br	\N	Licença	CDAO Executive Team Member	SOF	\N	Everton Batista Ramos	\N	\N	Ativa	\N	2026-06-24 13:11:27.115884+00	\N	SW	\N	\N	Licença Gartner - CDAO Executive Team Member atribuída	\N	\N	2026-06-24 13:11:27.115884+00	\N
bb6037c0-ce9c-4494-8059-f49b91097e44	ramon.brandao@planejamento.gov.br	\N	Licença	Gartner for Technical Professionals Team Leader	SOF	\N	Ramon Gomes Brandão	\N	\N	ativa	\N	2026-06-23 15:01:07.315897+00	\N	Licença	\N	\N	Licença Gartner - Technical Professionals Team Leader atribuída	\N	\N	2026-06-24 13:33:56.127+00	
fa930fa9-be95-443b-8d79-916e7dbf4de4	wertiz.silva-junior@planejamento.gov.br	\N	Licença	Gartner for Technical Professionals Member	SOF	\N	Wertiz Dantas da Silva Junior	\N	\N	ativa	\N	2026-06-23 15:01:07.315897+00	\N	Licença	\N	\N	Licença Gartner - Technical Professionals Team Member atribuída	\N	\N	2026-06-24 14:36:25.434+00	
664033b9-1c6e-47fc-a521-0e6bf835630a	marcio.l.oliveira@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			MÁRCIO LUIZ DE ALBUQUERQUE OLIVEIRA	\N		Ativa	\N	2026-07-08 12:14:03.587049+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-08 12:14:03.587049+00	\N
46d13270-267a-4e74-aadf-3a0a9a91a3a3	rafael.coelho@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Rafael Duarte Pinto de Oliveira Coelho	\N		Ativa	\N	2026-07-08 12:14:03.587049+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-08 12:14:03.587049+00	\N
fff0066a-27b5-44bd-a962-f6198f1fc3a1	tulio.oliveira@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Tulio Andre Pereira de Oliveira	\N		Ativa	\N	2026-07-08 12:14:03.587049+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-08 12:14:03.587049+00	\N
36a93c87-9c9c-4d64-8a68-0779e222bdbc	vinicius.reis@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Vinicius Fialho Reis	\N		Ativa	\N	2026-07-08 12:14:03.587049+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-08 12:14:03.587049+00	\N
0c776461-b1c9-4f97-bec9-d547c491bd40	47959571	01047510010023	Desktop	Daten / DC6A-S	COTIC	\N	Dienny Rocha Meira dos Santos	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	10.209.178.48	feito	\N	\N	\N	2026-05-28 13:53:30.584859+00	01047510010023
541ce54c-1f08-4e8e-aab4-66731f3e4422	andreia.r.santos@planejamento.gov.br	\N	Licença	Power BI Pro	\N	\N	Andreia Rodrigues Dos Santos	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Power BI Pro atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
340d4e56-9ad7-4da3-b139-c4bbf8424e57	ricardo.peixoto@planejamento.gov.br	\N	Licença	Gartner for Technical Professionals Member	SOF	\N	Ricardo Tadeu de Albuquerque Peixoto	\N	\N	ativa	\N	2026-06-23 15:01:07.315897+00	\N	Licença	\N	\N	Licença Gartner - Technical Professionals Team Member atribuída	\N	\N	2026-06-24 14:40:50.202+00	
4c3efef7-6af3-4272-be7b-4013867c316e	claudinei.souza@planejamento.gov.br	\N	Licença	Power BI Pro	\N	\N	Claudiney Cardoso De Souza	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Power BI Pro atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
5429b07d-5b6e-47bc-ba9f-a5ec0f81cd02	daniel.bandarrinha@planejamento.gov.br	\N	Licença	Power BI Pro	\N	\N	Daniel De Figueiredo Bandarrinha	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Power BI Pro atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
26917977-d4e5-4bcf-a1f2-3b9c2e4e0d89	edson.hoji@planejamento.gov.br	\N	Licença	Power BI Pro	\N	\N	Edson Yukio Hoji	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Power BI Pro atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
88bb82c1-b4f1-41df-a26c-af9868423dd6	erick.ribeiro@planejamento.gov.br	\N	Licença	Power BI Pro	\N	\N	Erick Fagundes Ribeiro	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Power BI Pro atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
329fd154-199d-413b-a38c-652f2f3ee1ac	estela.medeiros@planejamento.gov.br	\N	Licença	Power BI Pro	\N	\N	Estela Alves De Medeiros	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Power BI Pro atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
2336a0b5-6a5c-4c70-9d77-9c2002004871	glaucio.charao@planejamento.gov.br	\N	Licença	Power BI Pro	\N	\N	Gláucio Rafael Da Rocha Charão	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Power BI Pro atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
23f14e03-a977-4217-8599-f74f7842b6c7	hugo.val@planejamento.gov.br	\N	Licença	Power BI Pro	\N	\N	Hugo Torres do Val	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Power BI Pro atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
4a106b65-392e-43f4-8aae-7cd358818617	lucas.s.vieira@planejamento.gov.br	\N	Licença	Power BI Pro	\N	\N	Lucas Da Silva Vieira	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Power BI Pro atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
27243b09-b2f8-4ac9-bf37-bcb043990d92	47959584	GNSO8XA008997	Monitor	AOC / 24P1U	COLOG	\N	Joao Pedro Mendes de Souza	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSO8XA008997
8c2ae4dd-04c6-47e9-9b98-10824e2875dc	47959616	GNSO8XA009424	Monitor	AOC / 24P1U	COLOG	\N	Joao Pedro Mendes de Souza	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSO8XA009424
cba9131c-69b9-4247-b0f4-f7b61830f65d	47959722	GNSO9XA014165	Monitor	AOC / 24P1U	\N	\N	Sem usuário alocado	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-09 14:47:51.761+00	312AZCQ3M075
e350d664-a5d1-40fc-8342-591e0edb7e80	47959709	GNSO9XA014171	Monitor	AOC / 24P1U	\N	\N	Sem usuário alocado	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-09 14:48:24.67+00	GNSOAXA002186
60b1240a-64a0-4b27-bd92-a4533f3021c2	47959575	01047095010042	Desktop	Daten / DC6A-S	\N	\N	Depósito	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Desktop	\N	\N	\N	\N	\N	2026-06-10 11:30:35.514+00	01047095010042
4ea4a81f-9eeb-42e5-8c8f-e5d105377243	47959767	01047511010031	Desktop	Daten / DC6A-S	\N	\N	Caixa - Depósito	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Desktop	\N	\N	\N	\N	\N	2026-06-10 11:31:40.198+00	01047511010031
ce36f540-c559-49eb-864b-c23f07628060	47959764	01047511010028	Desktop	Daten / DC6A-S	\N	\N	Caixa - Depósito	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Desktop	\N	\N	\N	\N	\N	2026-06-10 11:32:16.707+00	01047511010028
7f1dea1c-0cd2-4d1c-b84b-45e128ee077e	12404369	01045653060112	Desktop	Daten / DC5A-S	\N	\N	Coordenadores - remoto	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MGI	\N	\N	Deposito	\N	\N	2026-05-28 13:53:30.584859+00	01045653060112
b05f195d-e619-4e6a-9f95-38588b089225	47959664	01047510010045	Desktop	Daten / DC6A-S	\N	\N	Problema	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	01047510010045
6cf61703-df5a-4101-82e6-faa88f5d2421	12409161	89776029E	Laptop	VAIO / FH15	\N	\N	Power BI - remoto	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MGI	\N	\N	Deposito	\N	\N	2026-05-28 13:53:30.584859+00	89776029E
8f42b455-67f3-42ff-9580-5c3a2269f640	47959747	01047511010011	Desktop	Daten / DC6A-S	\N	\N	Depósito	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Desktop	\N	\N	\N	\N	\N	2026-06-10 11:32:39.646+00	01047511010011
d89e780a-d9ff-47e4-8344-eaf75bfd474e	12402690	312AZCQ3M075	Monitor	Positivo / 24BL550J	\N	\N	Sem usuário alocado	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-10 11:35:58.058+00	312AZCQ3M075
577e713b-6f10-43b0-ba84-9cef4fb00647	12402585	312AZHY88577	Monitor	Positivo / 24BL550J	\N	\N	Sem usuário alocado	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-10 11:36:05.21+00	312AZHY88577
1d14dfb2-2543-47d3-9b03-fd314e4d4da6	adriana.a.silva@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Adriana Amorim da Silva	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Acrobat Pro DC atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
24907d61-13f5-4a6d-b419-d05cf7f7ae30	alisson.boas@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Alisson Vilas Boas	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Acrobat Pro DC atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
0e529997-5d5c-4bc5-8513-26043f2914b0	andre.henriques@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Andre Santiago Henriques	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Acrobat Pro DC atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
7cdddfa9-a87f-47fa-a2d5-67f111f8a484	basemate.santos@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Basemate Oliveira dos Santos	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Acrobat Pro DC atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
72183b79-77ee-4d8a-b4c5-f8d7dd7571c7	camila.curi@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Camila Barbosa Curi	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Acrobat Pro DC atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
2873b7f9-1269-440b-8168-8293ae08f875	cecilia.nascimento@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Cecília Umetsu do Nascimento	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Acrobat Pro DC atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
06082e59-2500-4e12-9972-62dca0b06671	lea.nobrega@planejamento.gov.br	\N	Licença	Power BI Pro	DIORC	\N	Lea Mendonça Nobrega	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	Licença	\N	\N	Power BI Pro atribu├¡da	\N	\N	2026-06-01 12:40:07.424+00	\N
cf5ee8d5-7b36-4f66-8085-65d4795550b7	edmar.oliveira@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Edmar Silva de Oliveira	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Acrobat Pro DC atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
0f72bb0b-8ea7-44e3-9d5d-394dc9c36f18	elayne.batista@planejamento.gov.br	\N	Licença	Acrobat Pro DC	DIORC	\N	Elayne Maria da Silva Batista	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Acrobat Pro DC atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
9758d7f7-92f9-4f63-860d-eaad68ad9b91	iane.azevedo@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Ianê de Andrade Azevedo	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Acrobat Pro DC atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
33a32c26-bf0a-4e43-946f-5a53296d803c	isadora.colombo@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Isadora do Carmo Colombo	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Acrobat Pro DC atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
3eab906d-e613-4375-976a-a6821cce2d18	jean.ferreira@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Jean Carlos Moura Ferreira	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Acrobat Pro DC atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
9a2dc3db-d253-4447-a277-aeed8742d5b8	jonatas.santos@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Jônatas D'Alma Costa Santos	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Acrobat Pro DC atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
0ae24ee2-1a9f-4eab-9cda-15c78c350e73	marcelo.r.moreira@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Marcelo Ribeiro Moreira	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Acrobat Pro DC atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
4384ebb1-a6c5-4d16-8209-8a8c5b8d0696	nanahira.rabelo@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Nanahira de Rabelo e Sant'Anna	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Acrobat Pro DC atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
7c7a7ba2-1e9f-45b0-8e4a-f33d60dafd68	paulo-n.rocha@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Paulo Eduardo Nunes de Moura Rocha	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Acrobat Pro DC atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
ce1d2427-ae51-4e54-8417-2a43096c19fc	paulo.possas@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Paulo Henrique Possas	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Acrobat Pro DC atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
186d2dec-2861-49fe-b60d-3c22ca8bef2c	raquel.ferrari@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Raquel Ferrari da Veiga	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Acrobat Pro DC atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
778ea3fd-fca1-4b9f-a42b-a5645a4c6ea9	socorro.lima@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Socorro Lima	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Acrobat Pro DC atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
5a00b817-9f6f-41ed-a9c2-0f2f63052c6c	47959681	01047510010025	Desktop	Daten / DC6A-S	COGEP	\N	Maristella Alves do Nascimento Salgado / João Remisson Teixeira Figueiredo	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Desktop	10.209.178.16	feito	\N	\N	\N	2026-06-10 11:27:23.56+00	01047510010025
955620a9-7cf3-4e90-b0c6-dc99a483ce39	47959569	01047095010036	Desktop	Daten / DC6A-S	COTIC	\N	Álvaro José de Andrade Carneiro / Henrique Eiti Otaguiri Nagazawa	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Desktop	10.209.178.46	feito	\N	\N	\N	2026-06-10 11:29:05.016+00	01047095010036
7cdaacbc-f7d0-42f3-ad68-a6837680800d	taissa.vieira@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Taissa Thieme de Barros Vieira	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Acrobat Pro DC atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
6c3ec3da-0ea7-42f7-8ceb-78ad6a7302ab	thomaz.silva@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Thomaz Milani Rodrigues Muroni Silva	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Acrobat Pro DC atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
3938763f-ebb9-4746-82e4-b87513e8256c	andrea.bertolini@planejamento.gov.br	\N	Licença	Adobe Creative Cloud - All Apps	\N	\N	Andrea Curiacos Bertolini	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Adobe Creative Cloud - All Apps atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
df733e40-1856-4db0-8b6d-e465c4cf3cf9	arthur.feitoza@planejamento.gov.br	\N	Licença	Adobe Creative Cloud - All Apps	\N	\N	Arthur Feitoza de Oliveira	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Adobe Creative Cloud - All Apps atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
41c21e1e-fb8e-4d64-b151-360dac3ff8b8	beatriz.yamada@planejamento.gov.br	\N	Licença	Adobe Creative Cloud - All Apps	\N	\N	Beatriz Leão Yamada	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Adobe Creative Cloud - All Apps atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
6322b539-7494-4b2d-a494-84518d1fbaa7	clarice.marinho@planejamento.gov.br	\N	Licença	Adobe Creative Cloud - All Apps	\N	\N	Clarice Fernandes Marinho	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Adobe Creative Cloud - All Apps atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
96676bed-140e-4f48-a53d-57a91fa66c2c	douglas.saymom@planejamento.gov.br	\N	Licença	Adobe Creative Cloud - All Apps	\N	\N	Douglas Saymom de Freitas Ferreira	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Adobe Creative Cloud - All Apps atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
190419dd-5c16-4f32-bc49-05bcc71be1c3	eduardo.m.silva@planejamento.gov.br	\N	Licença	Adobe Creative Cloud - All Apps	CGEST	\N	Eduardo Moura da Silva	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Adobe Creative Cloud - All Apps atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
1a898d75-4182-444c-a144-3ada9c45bc3f	emanuele.queiros@planejamento.gov.br	\N	Licença	Adobe Creative Cloud - All Apps	\N	\N	Emanuele dos Santos Queiros	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Adobe Creative Cloud - All Apps atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
546d78ce-21c3-427d-b5a7-27f82b0cce2b	emanuele.marrocos@planejamento.gov.br	\N	Licença	Adobe Creative Cloud - All Apps	\N	\N	Emanuele Raquel de Oliveira Marrocos	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Adobe Creative Cloud - All Apps atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
1c904299-6dad-4cdf-9da8-42d40d23886c	felipe.piletti@planejamento.gov.br	\N	Licença	Adobe Creative Cloud - All Apps	\N	\N	Felipe José Piletti	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Adobe Creative Cloud - All Apps atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
874a2881-d032-4d37-bb82-474dc778887d	thiago.reis@planejamento.gov.br	\N	Licença	Adobe Creative Cloud - All Apps	\N	\N	Thiago Tavares Reis	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Adobe Creative Cloud - All Apps atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
3f10c920-1128-4fd0-a1ff-b322376084ae	marcos.fonseca@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Marcos César Chaves da Fonseca	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	Licença	\N	\N	Acrobat Pro DC atribu├¡da	\N	\N	2026-06-01 12:54:29.031+00	\N
1d8c25c4-66ef-4727-a782-34c18048d606	12392502	9TDLF83	Monitor	Dell / P2419Hc	SAGE	Bianca Andrioli de Moura Guimarães	Bianca Andrioli de Moura Guimarães	\N	\N	\N	\N	2026-07-01 12:02:51.486799+00	\N	ME	\N	\N	\N	\N	\N	2026-07-01 12:02:51.486799+00	\N
3843be46-16ce-4239-b1b3-ca4853930d8d	12392520	CYDLF83	Monitor	Dell / P2419Hc	SAGE	Bianca Andrioli de Moura Guimarães	Bianca Andrioli de Moura Guimarães	\N	\N	\N	\N	2026-07-01 12:02:51.486799+00	\N	ME	\N	\N	\N	\N	\N	2026-07-01 12:02:51.486799+00	\N
72cc8fc5-8382-434f-b594-5ba7f7b88370	12401574	5A463W96D	Desktop	Positivo / Master C4400 Minipro rohs	SAGE	Bianca Andrioli de Moura Guimarães	Bianca Andrioli de Moura Guimarães	\N	\N	\N	\N	2026-07-01 12:02:51.486799+00	\N	MGI	10.209.178.32	\N	\N	\N	\N	2026-07-01 12:02:51.486799+00	\N
9b680d17-bbc1-49bd-883a-b1e1e0f63689	12392528	FQHLF83	Monitor	Dell / P2419Hc	SAGE	Larissa Martins Vieira	Larissa Martins Vieira	\N	\N	\N	\N	2026-07-01 12:02:51.486799+00	\N	ME	\N	\N	\N	\N	\N	2026-07-01 12:02:51.486799+00	\N
dc08f7c7-5a8a-4d19-b66b-b417e3cc60ac	47959710	GNSOAXA002186	Monitor	AOC / 24P1U	\N	\N	Sem usuário alocado	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-09 14:47:31.597+00	312AZHY88577
776327a9-a0ee-4e59-8452-2ac4544d8afd	47959637	01047510010024	Desktop	Daten / DC6A-S	COLOG	\N	Sem usuário alocado	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Desktop	10.209.178.14	feito	\N	\N	\N	2026-06-09 14:55:25.501+00	01047510010024
b4c5d287-6a1c-4853-9add-cb9660289d0d	12392570	5BPLF83	Monitor	Dell / P2419Hc	SAGE	Larissa Martins Vieira	Larissa Martins Vieira	\N	\N	\N	\N	2026-07-01 12:02:51.486799+00	\N	ME	\N	\N	\N	\N	\N	2026-07-01 12:02:51.486799+00	\N
12b0351b-71a0-4eeb-aa68-abdce8769284	ronan.leal@planejamento.gov.br	\N	Licença	Adobe Creative Cloud - All Apps	\N	\N	Ronan Ramos Leal	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Adobe Creative Cloud - All Apps atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
593a7125-b108-40d0-9c85-70f7cdf6388f	12401661	5A4636140	Desktop	Positivo / Master C4400 Minipro rohs	SAGE	Larissa Martins Vieira	Larissa Martins Vieira	\N	\N	\N	\N	2026-07-01 12:02:51.486799+00	\N	MGI	10.209.178.33	\N	\N	\N	\N	2026-07-01 12:02:51.486799+00	\N
b7d9ffdc-69e2-4c56-bd88-db9f0beececa	12401684	5A463672E	Desktop	Positivo / Master C4400 Minipro rohs	SAGE	Lorena Ferrer Cavalcanti Randal Pompeu	Lorena Ferrer Cavalcanti Randal Pompeu	\N	\N	\N	\N	2026-07-01 12:02:51.486799+00	\N	MGI	10.209.178.26	\N	\N	\N	\N	2026-07-01 12:02:51.486799+00	\N
5e61c1c3-685c-4bd7-ba69-c8fb46abc1a8	anael.jacob@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	Anael Aymore Jacob	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
310a142c-509d-43a2-be0f-f5d32d4939da	749072	GNSJ2XA003114	Monitor	AOC / 24P1U	SAGE	Lorena Ferrer Cavalcanti Randal Pompeu	Lorena Ferrer Cavalcanti Randal Pompeu	\N	\N	\N	\N	2026-07-01 12:02:51.486799+00	\N	MPO	\N	\N	\N	\N	\N	2026-07-01 12:02:51.486799+00	\N
86f7d780-bbc8-4360-b7e1-e9e9bb3d8698	claudio.navarro@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	Cláudio  Alexandre de Area Leão Navarro	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
ea7da39e-c9c5-4b16-b33d-b34e87022ea0	749076	GNSJ2XA003256	Monitor	AOC / 24P1U	SAGE	Lorena Ferrer Cavalcanti Randal Pompeu	Lorena Ferrer Cavalcanti Randal Pompeu	\N	\N	\N	\N	2026-07-01 12:02:51.486799+00	\N	MPO	\N	\N	\N	\N	\N	2026-07-01 12:02:51.486799+00	\N
644ede41-ff19-4aa6-87a9-cc9535705f2c	47959600	01047510010016	Desktop	Daten / DC6A-S	CONTB	Rafael Ibsen Souza Silva	Rafael Ibsen Souza Silva	\N	\N	\N	\N	2026-07-01 12:02:51.486799+00	\N	MPO	10.209.178.41	\N	\N	\N	\N	2026-07-01 12:02:51.486799+00	\N
f5a42415-0b3c-4982-bfe9-15a15c591bda	12392576	\N	Monitor	Dell / P2419Hc	\N	\N	Sem usuário alocado	\N	\N	\N	\N	2026-07-01 12:02:51.486799+00	\N	ME	\N	\N	Adicionado como item faltante identificado na planilha	\N	\N	2026-07-01 12:02:51.486799+00	\N
ed8d9d4d-a2d4-481d-9745-d0e360dfd907	12392831	\N	Monitor	Dell / P2419Hc	\N	\N	Sem usuário alocado	\N	\N	\N	\N	2026-07-01 12:02:51.486799+00	\N	ME	\N	\N	Adicionado como item faltante identificado na planilha	\N	\N	2026-07-01 12:02:51.486799+00	\N
148f3929-0e47-46f9-b276-7254d70f94b5	joao.figuereido@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	João Gabriel Dias Figuereido	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
66dbaa97-64f2-4638-9ff8-abb6050d490b	47959663	\N	Desktop	Daten / DC6A-S	Sem setor	\N	Sem usuário alocado	\N	\N	\N	\N	2026-07-01 12:02:51.486799+00	\N	MPO	\N	\N	Adicionado como item faltante identificado na planilha	\N	\N	2026-07-01 12:02:51.486799+00	\N
5bb4cce8-550b-47a3-bf03-c0593d9bd8f6	rafael.neto@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	Rafael Martins Neto	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
719ff75f-6159-4f0b-b615-c6729bf82cd6	rodolfo.marques@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	Rodolfo Marques Santos	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
4414000c-72c0-4909-a273-d4968987160e	italo.soares@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	Ítalo Nogueira Soares	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
3bab0648-6f78-42c9-a4af-b7b0372bfa3e	rafael.ibsen@planejamento.gov.br	\N	Licença	Copilot Add-on	CONTB	\N	Rafael Ibsen Souza Silva	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
1766ed00-f7f5-4650-a1b5-df14e8686460	47959542	01047095010009	Desktop	Daten / DC6A-S	DIORC	\N	Elayne Maria da Silva Batista	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	10.209.178.26	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	01047095010009
94b5dd90-8443-4833-9cb3-106c3b6ca710	12393157	6XSLF83	Monitor	Dell / P2419Hc	COGEP	\N	Elayne Maria da Silva Batista	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	ME	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	6XSLF83
1cff299a-d618-43c9-892e-caddfe15500d	12393170	9NBLF83	Monitor	Dell / P2419Hc	COGEP	\N	Elayne Maria da Silva Batista	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	ME	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	9NBLF83
945711f0-6940-4438-9288-ed9c0db5e42c	749069	GNSJ2XA000157	Monitor	AOC / 24P1U	CGTCO	\N	Gustavo Andrade Bruzzeguez	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MF	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSJ2XA000157
7346cb8b-644c-44de-8678-a86c9145527e	749078	GNSJ2XA003321	Monitor	AOC / 24P1U	CGTCO	\N	Gustavo Andrade Bruzzeguez	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MF	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSJ2XA003321
0ae6d470-3a1b-4b6b-a67f-66daad3753b1	749079	GNSJ2XA000687	Monitor	AOC / 24P1U	CGTCO	\N	Gustavo Andrade Bruzzeguez	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MF	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSJ2XA000687
56998d0c-d35c-4ae7-b8e8-0efc46eb8d62	47959669	01047510010031	Desktop	Daten / DC6A-S	CGTCO	\N	Gustavo Andrade Bruzzeguez	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	10.209.178.45	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	01047510010031
c07b803e-7116-489c-aa38-3128e2e1f2a8	47959541	01047095010008	Desktop	Daten / DC6A-S	CGEST	\N	Ricardo de Assis Teixeira	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	10.209.178.24	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	01047095010008
0fb5b650-e2dc-4751-a740-26cdd7b36a09	12392329	DW0LF83	Monitor	Dell / P2419Hc	CGEST	\N	Ricardo de Assis Teixeira	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	ME	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	DW0LF83
dc38a3f1-fb85-43ca-80cd-63ba26897052	12392330	DX1LF83	Monitor	Dell / P2419Hc	CGEST	\N	Ricardo de Assis Teixeira	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	ME	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	DX1LF83
e5b1a8f6-1837-494a-a83c-2a66247bbd58	12392379	J1CLF83	Monitor	Dell / P2419Hc	CGEST	\N	Ricardo de Assis Teixeira	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	ME	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	J1CLF83
fd867a5e-d19a-44aa-8a69-ec98e38c93a6	47959589	GNSO8XA008982	Monitor	AOC / 24P1U	CONTB	\N	Debora Lopes Ferreira Saldanha / Eveilton Souza de Oliveira	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSO8XA008982
a67388c3-ce01-45b5-a5a7-82f96675c8ea	47959595	GNSO8XA008988	Monitor	AOC / 24P1U	CONTB	\N	Debora Lopes Ferreira Saldanha / Eveilton Souza de Oliveira	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSO8XA008988
cf34f17e-9791-43e5-82a4-96eab70fd8d2	47959660	01047510010016	Desktop	Daten / DC6A-S	CONTB	\N	Debora Lopes Ferreira Saldanha / Eveilton Souza de Oliveira	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	10.209.178.41	feito	\N	\N	\N	2026-05-28 13:53:30.584859+00	01047510010016
5688af9a-e264-489b-bc6b-e4f3d5cd4bcd	47959715	GNSO9XA014166	Monitor	AOC / 24P1U	CONTB	\N	Rafael Ibsen Souza Silva	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSO9XA014166
75bc7db3-a95b-4711-93cb-6b4d54236a86	47959718	GNSO9XA014169	Monitor	AOC / 24P1U	CONTB	\N	Rafael Ibsen Souza Silva	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSO9XA014169
9048112f-19c0-4abd-a764-0da3d3310e9c	47959534	01047095010001	Desktop	Daten / DC6A-S	CONTB	\N	Rafael Ibsen Souza Silva	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	10.209.178.42	feito	\N	\N	\N	2026-05-28 13:53:30.584859+00	01047095010001
18407230-cf1a-40d5-9da8-ca9636866e49	47959591	GNSO8XA008984	Monitor	AOC / 24P1U	COTIC	\N	Jorge Toufic Arbex	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSO8XA008984
eaa64ac2-1182-4998-8a77-22c9893fe349	47959730	GNSOAXA001192	Monitor	AOC / 24P1U	COTIC	\N	Jorge Toufic Arbex	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSOAXA001192
2e35b69d-cae8-4399-980b-58c85e4119dd	47959639	01047510010019	Desktop	Daten / DC6A-S	DIORC	\N	Lucas Matheus Castro de Oliveira	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	10.209.178.38	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	01047510010019
14c76b00-8833-42ae-b480-ebd665e41e16	47959666	01047510010042	Desktop	Daten / DC6A-S	COTIC	\N	Leonardo Della Justina do Nascimento	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	10.209.178.11	feito	\N	\N	\N	2026-05-28 13:53:30.584859+00	01047510010042
96872580-05b8-4c5b-936b-29b38adbc3cf	12392511	FQDLF83	Monitor	Dell / P2419Hc	COTIC	\N	Leonardo Della Justina do Nascimento	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	ME	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	FQDLF83
f84a91f2-99b5-409f-868d-3743d7860df4	12392521	FNNLF83	Monitor	Dell / P2419Hc	COTIC	\N	Leonardo Della Justina do Nascimento	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	ME	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	FNNLF83
29f7430b-5a1e-4386-b2ae-05ccb493f64d	47959648	01047510010039	Desktop	Daten / DC6A-S	CONTB	\N	Paulo Henrique da Rocha Leite	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	10.209.178.55	feito	\N	\N	\N	2026-05-28 13:53:30.584859+00	01047510010039
a509af60-166d-4037-b35b-9d90ea1b9ffc	12392506	01047510010022	Monitor	Dell / P2419Hc	CONTB	\N	Paulo Henrique da Rocha Leite	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	ME	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	01047510010022
9c40c2d6-2b34-4933-b2bb-e83a1b9c1ed9	12392531	9Q8LF83	Monitor	Dell / P2419Hc	CONTB	\N	Paulo Henrique da Rocha Leite	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	ME	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	9Q8LF83
6769459d-0860-4a61-b6db-11be03581f30	12392767	GG7LF83	Monitor	Dell / P2419Hc	CONTB	\N	Paulo Henrique da Rocha Leite	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	ME	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GG7LF83
742a5ab9-3a32-418a-a735-f71dc239b85e	47959586	57GLF83	Monitor	Dell / P2419Hc	COTIC	\N	Dienny Rocha Meira dos Santos	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	ME	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	57GLF83
00788aa4-0bc5-47aa-8652-8740543839bf	47959613	GNSO8XA007148	Monitor	AOC / 24P1U	COTIC	\N	Dienny Rocha Meira dos Santos	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSO8XA007148
3a110422-6310-499f-acd4-5a9a86c070cf	47959620	GNSO8XA009419	Monitor	AOC / 24P1U	COTIC	\N	Dienny Rocha Meira dos Santos	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSO8XA009419
8ade8193-4839-4801-bb0a-3dc331ff28e6	47959645	GNSO8XA009431	Monitor	AOC / 24P1U	COTIC	\N	Dienny Rocha Meira dos Santos	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSO8XA009431
7114040c-9e6c-4f44-9eb0-e11cdf561243	47959627	GNSO8XA009661	Monitor	AOC / 24P1U	COTIC	\N	Álvaro José de Andrade Carneiro / Henrique Eiti Otaguiri Nagazawa	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-09 14:45:08.844+00	GNSO8XA009661
7c5d5beb-cc69-493a-8210-9dd7d2961e54	47959726	GNSO9XA014156	Monitor	AOC / 24P1U	COTIC	\N	Álvaro José de Andrade Carneiro / Henrique Eiti Otaguiri Nagazawa	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-09 14:45:30.564+00	GNSO9XA014156
cfaf4f54-c0fe-4c9f-8819-adb47633157e	47959610	GNSO8XA009021	Monitor	AOC / 24P1U	COTIC	\N	Álvaro José de Andrade Carneiro / Henrique Eiti Otaguiri Nagazawa	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-09 14:45:47.95+00	GNSO8XA009021
42890c82-6e22-4e66-b4a8-18c47993fa8b	47959578	01047095010045	Desktop	Daten / DC6A-S	COLOG	\N	Patrícia Daniele Oliveira de Alarcão	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Desktop	10.209.178.25	\N	\N	\N	\N	2026-06-10 12:48:27.804+00	01047095010045
0ca2b36e-6d15-4b59-a67b-6d42a5d762e4	12392332	D1WLF83	Monitor	Dell / P2419Hc	COLOG	\N	Patrícia Daniele Oliveira de Alarcão	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-10 12:48:45.265+00	D1WLF83
3fda45cc-bf5b-49f8-94f8-120123c8861c	12392522	FPDLF83	Monitor	Dell / P2419Hc	COLOG	\N	Patrícia Daniele Oliveira de Alarcão	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-10 12:48:53.017+00	FPDLF83
73b5e419-dd51-4693-aabd-61d45764fc84	bruzzeguezgustavo.bruzzeguez@planejamento.gov.br	\N	Licença	CDAO Executive Team Leader	\N	\N	Gustavo Bruzzeguez	\N	\N	Ativa	\N	2026-07-01 14:54:12.125761+00	\N	SW	\N	\N	CDAO Executive Team Leader atribuída	\N	\N	2026-07-01 14:54:12.125761+00	\N
5d9d8a52-3b20-43ff-8b79-dc1ae6189679	costadaniel.r.costa@planejamento.gov.br	\N	Licença	CDAO Executive Team Member	\N	\N	Everton Ramos	\N	\N	Ativa	\N	2026-07-01 14:54:12.125761+00	\N	SW	\N	\N	CDAO Executive Team Member atribuída	\N	\N	2026-07-01 14:54:12.125761+00	\N
e3e811e1-5d81-4547-8569-96afddfd10df	47959501	01047095010038	Desktop	Daten / DC6A-S	COTIC	\N	Eduardo do Nascimento Stuani	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	10.209.178.53	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	01047095010038
e751c846-0df1-4500-a9d3-488512f38f64	12392501	9QFLF83	Monitor	Dell / P2419Hc	COTIC	\N	Arthur Miguel Oliveira Almeida Aros / Matheus Gomes de Lima	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	ME	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	9QFLF83
250b90e3-9c41-44a2-9e47-516f92301b78	12392529	9RJLF83	Monitor	Dell / P2419Hc	COTIC	\N	Arthur Miguel Oliveira Almeida Aros / Matheus Gomes de Lima	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	ME	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	9RJLF83
28f7ac86-afb5-417f-a75e-7ddd66163afc	12392882	5GBLF83	Monitor	Dell / P2419Hc	COTIC	\N	Arthur Miguel Oliveira Almeida Aros / Matheus Gomes de Lima	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	ME	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	5GBLF83
414d253d-e621-474e-9960-4b366fde637c	47959566	01047095010033	Desktop	Daten / DC6A-S	COTIC	\N	Vinicius Soares Jovito	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	10.209.178.43	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	01047095010033
65bbf158-58c0-444c-b4ee-ff68454fc9dd	12392525	9R7LF83	Monitor	Dell / P2419Hc	COTIC	\N	Vinicius Soares Jovito / Eduardo do Nascimento Stuani	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	ME	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	9R7LF83
341b733b-e3e1-41cc-bd80-a4e3f2c62239	12392527	9PFLF83	Monitor	Dell / P2419Hc	COTIC	\N	Vinicius Soares Jovito / Eduardo do Nascimento Stuani	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	ME	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	9PFLF83
7f089ea9-84c6-4f53-a4c9-c3c1f5fe5550	12392530	GBPLF83	Monitor	Dell / P2419Hc	COTIC	\N	Vinicius Soares Jovito / Eduardo do Nascimento Stuani	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	ME	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GBPLF83
634aa0fa-9ae6-4b23-9b47-66c5a583d8c0	carneiroalvaro.carneiro@planejamento.gov.br	\N	Licença	Gartner for Technical Professionals Team Leader	\N	\N	Álvaro José de Andrade Carneiro	\N	\N	Ativa	\N	2026-07-01 14:54:12.125761+00	\N	SW	\N	\N	Gartner for Technical Professionals Team Leader atribuída	\N	\N	2026-07-01 14:54:12.125761+00	\N
ea93c587-1203-4a29-b6f7-1c3114665aab	fonsecamarcos.fonseca@planejamento.gov.br	\N	Licença	Gartner for Technical Professionals Team Member	\N	\N	Marcos Alsina	\N	\N	Ativa	\N	2026-07-01 14:54:12.125761+00	\N	SW	\N	\N	Gartner for Technical Professionals Team Member atribuída	\N	\N	2026-07-01 14:54:12.125761+00	\N
25cca43c-bc3b-4be0-935c-06bba270bc2a	47959744	01047511010008	Desktop	Daten / DC6A-S	COEFI	\N	Jorge Toufic Arbex	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	10.209.178.39	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	01047511010008
f42b69d8-5478-4867-9f8a-23069d5a1e10	12392532	GB1LF83	Monitor	Dell / P2419Hc	DIORC	\N	Lucas Matheus Castro de Oliveira	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	ME	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GB1LF83
37b227a2-17c0-4be2-b9d6-4dbaf9cdd411	12392883	5JSLF83	Monitor	Dell / P2419Hc	DIORC	\N	Lucas Matheus Castro de Oliveira	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	ME	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	5JSLF83
9ac27267-8c7b-4110-a953-91825603dfb3	12402683	401AZSP4N926	Monitor	Positivo / 24BL550J	DIORC	\N	Lucas Matheus Castro de Oliveira	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MGI	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	401AZSP4N926
7c45c3f0-24eb-4581-a90e-80d0f35e9d67	47959545	01047095010012	Desktop	Daten / DC6A-S	COEFI	\N	Carluska de Oliveira Paz Silva	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	10.209.178.36	feito	\N	\N	\N	2026-05-28 13:53:30.584859+00	01047095010012
f3a19f4d-bdd2-42e7-9306-007e6144563f	12392507	9PHLF83	Monitor	Dell / P2419Hc	COEFI	\N	Carluska de Oliveira Paz Silva	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	ME	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	9PHLF83
8941570a-eda7-4807-883a-047920c1e1d9	12392526	9S1LF83	Monitor	Dell / P2419Hc	COEFI	\N	Carluska de Oliveira Paz Silva	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	ME	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	9S1LF83
ee1505bb-4695-47c8-9dd4-79e34e2e70d8	47959704	GNSO9XA014139	Monitor	AOC / 24P1U	COEFI	\N	Rafael Saldanha Ferraz Gangana	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSO9XA014139
06b0afa6-d566-4d4b-a1ae-345fb1133272	47959714	GNSOAXA001109	Monitor	AOC / 24P1U	COEFI	\N	Rafael Saldanha Ferraz Gangana	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSOAXA001109
00d85ed1-1191-42c4-b484-7bad2cdc2a14	47959723	GNSOAXA001857	Monitor	AOC / 24P1U	COEFI	\N	Rafael Saldanha Ferraz Gangana	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSOAXA001857
7f78284a-697e-49db-8298-c1e84840d111	47959568	01047095010035	Desktop	Daten / DC6A-S	COEFI	\N	Rafael Saldanha Ferraz Gangana	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	10.209.178.49	feito	\N	\N	\N	2026-05-28 13:53:30.584859+00	01047095010035
9084c022-9a76-4da0-819e-9e169ccb0704	47959623	GNSO9XA009434	Monitor	AOC / 24P1U	COEFI	\N	Diego Paulino Galhardo	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSO9XA009434
f984bb85-fd2f-4d0b-baef-b1f6a713bb2f	47959626	GNSO8XA009656	Monitor	AOC / 24P1U	COEFI	\N	Diego Paulino Galhardo	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSO8XA009656
f11b29b3-c177-4f70-908f-a98155f9981c	47959577	01047095010044	Desktop	Daten / DC6A-S	COEFI	\N	Diego Paulino Galhardo	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	10.209.178.37	feito	\N	\N	\N	2026-05-28 13:53:30.584859+00	01047095010044
287fd7fa-fc26-4e82-bcf3-220e7ce4450f	47959604	GNSO8XA008999	Monitor	AOC / 24P1U	DIORC	\N	Oscar Zweiter Neto	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSO8XA008999
3ca18a83-3c0a-436b-b32e-0db956d36c4f	47959698	GNSO9XA015300	Monitor	AOC / 24P1U	DIORC	\N	Oscar Zweiter Neto	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSO9XA015300
d5dbd222-bf37-4928-ad00-36d26358bc37	47959720	GNSO9XA014168	Monitor	AOC / 24P1U	DIORC	\N	Oscar Zweiter Neto	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSO9XA014168
e8da463b-e13a-4c9b-9436-09a914eadd40	47959573	01047095010040	Desktop	Daten / DC6A-S	DIORC	\N	Oscar Zweiter Neto	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	10.209.178.34	feito	\N	\N	\N	2026-05-28 13:53:30.584859+00	01047095010040
81963adc-2f57-49d0-8193-13f14d68bf6f	47959696	GNSO9XA014161	Monitor	AOC / 24P1U	COLOG	\N	Carla Maria Pinto Nunes de Souza	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSO9XA014161
652a1ed8-fc6c-495a-b5cf-4b9caf2146b7	47959697	GNSOAXA001298	Monitor	AOC / 24P1U	COLOG	\N	Carla Maria Pinto Nunes de Souza	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSOAXA001298
ea62cfc5-bb61-4be4-9d6c-0a0dbddf1abf	47959665	01047510010048	Desktop	Daten / DC6A-S	COLOG	\N	Carla Maria Pinto Nunes de Souza	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	10.209.178.54	feito	\N	\N	\N	2026-05-28 13:53:30.584859+00	01047510010048
f79f24aa-af14-487e-8b07-2d6a0ff548e0	47959644	01047510010013	Desktop	Daten / DC6A-S	COLOG	\N	Fabiana Oda	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	10.209.178.10	feito	\N	\N	\N	2026-05-28 13:53:30.584859+00	01047510010013
c4045c3d-247b-4522-8a6b-fbe86b1a4604	12402592	312AZNK88807	Monitor	Positivo / 24BL550J	COLOG	\N	Fabiana Oda	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MGI	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	312AZNK88807
75b612bc-dac7-4d1e-9a87-f50492d3a39c	12402609	312AZUJ8R846	Monitor	Positivo / 24BL550J	COLOG	\N	Fabiana Oda	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MGI	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	312AZUJ8R846
58e7e9c0-00a2-405e-908c-91fb78268e75	47959672	01047510010028	Desktop	Daten / DC6A-S	COLOG	\N	Divanildo Dantas De Lima	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	10.209.178.29	feito	\N	\N	\N	2026-05-28 13:53:30.584859+00	01047510010028
fc7ad82e-7f59-4798-b7a4-7b9b5e912c7c	12392887	5JCLF83	Monitor	Dell / P2419Hc	COLOG	\N	Divanildo Dantas De Lima	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	ME	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	5JCLF83
f8ae116c-182d-4137-86e3-e02a46feaa1f	12393171	5WKLF83	Monitor	Dell / P2419Hc	COLOG	\N	Divanildo Dantas De Lima	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	ME	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	5WKLF83
129d0188-aead-4962-b910-edd254e629d0	47959712	GNSO9XA014025	Monitor	AOC / 24P1U	COLOG	\N	Luiz Felipe Vendramini Gomes	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSO9XA014025
24261dc6-7df3-4bb6-94fa-0161d9c423f1	47959719	GNSOAXA002184	Monitor	AOC / 24P1U	COLOG	\N	Luiz Felipe Vendramini Gomes	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSOAXA002184
10c3b131-1ea8-40f7-b18b-f478a7f1bda2	47959634	01047510010014	Desktop	Daten / DC6A-S	COEFI	\N	Bruno Henrique Bernardes Inocencio	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Desktop	10.209.178.50	feito	\N	\N	\N	2026-06-10 12:59:18.3+00	01047510010014
18da12d3-843e-442a-92bd-154f13ed8ab5	47959607	GNSO8XA009008	Monitor	AOC / 24P1U	COEFI	\N	Bruno Henrique Bernardes Inocencio	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-10 12:59:27.422+00	GNSO8XA009008
b31ce96f-e5e5-4564-98b7-00accd46950b	47959702	GNSO9XA014172	Monitor	AOC / 24P1U	COEFI	\N	Bruno Henrique Bernardes Inocencio	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-10 12:59:33.747+00	GNSO9XA014172
ae80fc0b-0b80-4c2b-b36b-b55b5859b76b	47959733	GNSOAXA002183	Monitor	AOC / 24P1U	COLOG	\N	Luiz Felipe Vendramini Gomes	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSOAXA002183
351eea11-56e7-425b-998a-2c54054e95de	47959673	01047510010035	Desktop	Daten / DC6A-S	COLOG	\N	Luiz Felipe Vendramini Gomes	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	10.209.178.28	feito	\N	\N	\N	2026-05-28 13:53:30.584859+00	01047510010035
f3d0311b-c105-4ae7-b396-55950a7c4dec	12402595	312AZRDBR878	Monitor	Positivo / 24BL550J	COLOG	\N	Alisson Rafael Rodrigues Alves	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MGI	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	312AZRDBR878
48353866-4b4a-4ebb-9044-029442f80d57	12402663	312AZAL4P200	Monitor	Positivo / 24BL550J	COLOG	\N	Alisson Rafael Rodrigues Alves	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MGI	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	312AZAL4P200
ee83ed0f-a276-4a20-9895-87cfd838717f	12402687	312AZVN3M143	Monitor	Positivo / 24BL550J	COLOG	\N	Alisson Rafael Rodrigues Alves	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MGI	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	312AZVN3M143
aefaa084-a49c-4703-9e2e-18fcf7a79023	eduardo.m.araujo@planejamento.gov.br	\N	Licença	Power BI Pro	\N	\N	Eduardo Moreira Araújo	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	Licença	\N	\N	Power BI Pro atribu├¡da	\N	\N	2026-06-24 13:35:28.845+00	
8cc46f80-a5ef-4aac-be47-20b694bd0b91	liraleandro.lira@planejamento.gov.br	\N	Licença	Gartner for Technical Professionals Team Member	\N	\N	Leandro Lira	\N	\N	Ativa	\N	2026-07-01 14:54:12.125761+00	\N	SW	\N	\N	Gartner for Technical Professionals Team Member atribuída	\N	\N	2026-07-01 14:54:12.125761+00	\N
bc48888c-c87a-4e63-9035-2ec3c8635e11	grimaldidaniel.grimaldi@planejamento.gov.br	\N	Licença	Gartner for Technical Professionals Team Member	\N	\N	Wertiz Dantas da Silva Junior	\N	\N	Ativa	\N	2026-07-01 14:54:12.125761+00	\N	SW	\N	\N	Gartner for Technical Professionals Team Member atribuída	\N	\N	2026-07-01 14:54:12.125761+00	\N
d9301537-64e5-4ac0-80c8-54b536f9bc5f	dantasana.dantas@planejamento.gov.br	\N	Licença	Gartner for Technical Professionals Team Member	\N	\N	Monade Rassa Souza Costa	\N	\N	Ativa	\N	2026-07-01 14:54:12.125761+00	\N	SW	\N	\N	Gartner for Technical Professionals Team Member atribuída	\N	\N	2026-07-01 14:54:12.125761+00	\N
075cf384-a299-4b35-9e4a-10f234810451	47959679	01047510010037	Desktop	Daten / DC6A-S	COLOG	\N	Joao Pedro Mendes de Souza	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	10.209.178.13	feito	\N	\N	\N	2026-05-28 13:53:30.584859+00	01047510010037
c474cbdd-2944-4a1d-80cd-74622d31f05c	47959618	GNSO9XA427	Monitor	AOC / 24P1U	CGEST	\N	Carla Cristina Araujo	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSO9XA427
37d301a7-4dbf-40b2-88a6-116a2e8a55e3	47959630	GNSO8XA010451	Monitor	AOC / 24P1U	CGEST	\N	Carla Cristina Araujo	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSO8XA010451
e4bb75a0-cf00-43e5-b4e9-6461b079145e	47959701	GNSO9XA015301	Monitor	AOC / 24P1U	CGEST	\N	Carla Cristina Araujo	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSO9XA015301
64e4a27d-e009-479d-b813-314df9ee808f	47959540	01047095010007	Desktop	Daten / DC6A-S	CGEST	\N	Carla Cristina Araujo	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	10.209.178.21	feito	\N	\N	\N	2026-05-28 13:53:30.584859+00	01047095010007
c09ffc26-8a1a-48b1-86f2-1b35184fd5cf	47959548	01047095010015	Desktop	Daten / DC6A-S	CGEST	\N	Eduardo Moura da Silva	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	10.209.178.23	feito	\N	\N	\N	2026-05-28 13:53:30.584859+00	01047095010015
96c57328-bb41-427f-9d93-7663700b4607	12399126	301AZWS9R961	Monitor	Positivo / 24BL550J	CGEST	\N	Eduardo Moura da Silva	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MGI	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	301AZWS9R961
de4a6712-aa0b-47d6-b89a-a5b915d3441b	12402593	401AZDB0H658	Monitor	Positivo / 24BL550J	CGEST	\N	Eduardo Moura da Silva	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MGI	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	401AZDB0H658
9bb72ed1-a0d8-4d60-bcfb-9fea0d46c98a	12402693	312AZJT3M044	Monitor	Positivo / 24BL550J	CGEST	\N	Eduardo Moura da Silva	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MGI	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	312AZJT3M044
e3d27c67-c85b-4278-aa36-5dc7904e3617	47959567	01047095010034	Desktop	Daten / DC6A-S	CGEST	\N	Lilian Chaves Maluf Fauda	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	10.209.178.20	feito	\N	\N	\N	2026-05-28 13:53:30.584859+00	01047095010034
788c5ac4-ef39-4371-9353-d4e2c8b916de	12392381	8PSLF83	Monitor	Dell / P2419Hc	CGEST	\N	Lilian Chaves Maluf Fauda	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	ME	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	8PSLF83
6e8bc1c6-4136-4c55-9559-94c374973a81	12392756	FSHLF83	Monitor	Dell / P2419Hc	CGEST	\N	Lilian Chaves Maluf Fauda	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	ME	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	FSHLF83
43989d5d-ce7f-4db9-975d-24b0aee782c8	12392880	5HTLF83	Monitor	Dell / P2419Hc	CGEST	\N	Lilian Chaves Maluf Fauda	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	ME	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	5HTLF83
752579b8-db48-4d58-95f8-4925abcb54f1	47959622	GNSO8XA009433	Monitor	AOC / 24P1U	COGEP	\N	Carolina Menna Soares Pinto / Luciane de Sousa Piccini Lopes	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	GNSO8XA009433
e6326930-73d2-47e0-9ae8-f6ce3d783fa3	melloleonardo.c.mello@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	Leonardo Mello	\N	\N	Ativa	\N	2026-07-01 14:54:12.125761+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-07-01 14:54:12.125761+00	\N
178a8225-2702-4b07-81d1-ac948e2978dd	cassio.faria@planejamento.gov.br	\N	Licença	Power BI Pro	\N	\N	Cassio Lucas de Faria	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Power BI Pro atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
9adf34b5-e35a-467f-ada3-e2938e621d39	47959556	01047095010023	Desktop	Daten / DC6A-S	DIORC	\N	Sem usuário alocado	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Desktop	10.209.178.39	feito	\N	\N	\N	2026-06-10 11:30:11.396+00	01047095010023
d3ff71cd-0b64-49db-b7b2-b299fff81786	santosbasemate.santos@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	Rodolfo Vaz Oliveira Aguiar	\N	\N	Ativa	\N	2026-07-01 14:54:12.125761+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-07-01 14:54:12.125761+00	\N
3a11934c-5749-4615-aae6-fcbc1e419543	clayton.silva@planejamento.gov.br	\N	Licença	Power BI Pro	\N	\N	Clayton Rodrigues Da Silva	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Power BI Pro atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
1e12db5c-5c31-4968-809e-e27f3c44ed3b	daniel.r.costa@planejamento.gov.br	\N	Licença	Power BI Pro	\N	\N	Daniel Ramos Costa	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Power BI Pro atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
1d0d4433-658a-4f92-8d5c-94e564d5feeb	danielle.mota@planejamento.gov.br	\N	Licença	Power BI Pro	\N	\N	Danielle Cavagnolle Mota	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Power BI Pro atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
40ec3fda-bd91-46b9-be14-f50cd0a47483	diego.fernandes@planejamento.gov.br	\N	Licença	Power BI Pro	\N	\N	Diego dos Santos Fernandes	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Power BI Pro atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
d9b5cda6-af11-4987-ae08-444e5fbd6cd5	12402661	401AZPU4N968	Monitor	Positivo / 24BL550J	COLOG	\N	André Luiz Rodrigues	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-10 11:34:28.686+00	401AZPU4N968
175f1260-3cda-47d4-a0de-f9d1d383784e	47959565	01047095010032	Desktop	Daten / DC6A-S	COGEP	\N	Carolina Menna Soares Pinto / Luciane de Sousa Piccini Lopes	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	10.209.178.18	feito	\N	\N	\N	2026-05-28 13:53:30.584859+00	01047095010032
cebba16a-5ea0-4fef-a6a6-7221b29158bd	12402583	312AZKA85349	Monitor	Positivo / 24BL550J	DIORC	\N	Lea Mendonça Nobrega	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-10 11:34:54.493+00	312AZKA85349
a6a42859-971a-410e-8afe-d4022d521bd7	12402598	401AZMG0J835	Monitor	Positivo / 24BL550J	DIORC	\N	Lea Mendonça Nobrega	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-10 11:35:06.415+00	401AZMG0J835
f7699b94-4672-4464-aa5d-a7c8cc443bf3	ana.custodio@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Ana Laura Sousa e Custodio	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
1c2cf4b7-487c-4085-9d63-464757ad3b74	gabriel-s.lima@planejamento.gov.br	\N	Licença	Power BI Pro	\N	\N	Gabriel Silva Lima	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Power BI Pro atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
3dcf5958-57e8-406d-8835-cadb07093c13	lorena.pompeu@planejamento.gov.br		Licença	Acrobat Pro DC			Lorena Ferrer Cavalcanti Randal Pompeu	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Acrobat Pro DC atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
a0540e62-fac4-429b-8e02-c82979d57fc6	daniel.reiss@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Daniel Gersten Reiss	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
61cf92e0-b683-4acc-85a0-ad2329c5175e	raquel.sampaio@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Raquel Braga Barreto Sampaio	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
712f9095-e798-481a-8cc5-f8cb405ba2dc	luciano.pacheco@planejamento.gov.br		Licença	Power BI Pro			Luciano da Silva Pacheco	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Power BI Pro atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
2ef9c3a4-dd20-401e-a9fa-c4182c897403	allex.martins@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Allex Carneiro Martins	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
26e5786b-a600-4bfe-9f30-2486bd8c3e4a	fabiano.chaves@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Fabiano Chaves da Silva	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
cbd72084-e28b-4ad8-9e4f-c8f098f758bf	marcelo.shinkoda@planejamento.gov.br		Licença	Power BI Pro			Marcelo Shinkoda	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Power BI Pro atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
5b408474-81c5-4abd-90e2-309c41e470ca	daniel.reiss@planejamento.gov.br		Licença	Copilot Studio			Daniel Gersten Reiss	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Studio atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
d18fc698-6c6d-4266-8419-c72f048c089b	leonardo.c.mello@planejamento.gov.br		Licença	Acrobat Pro DC			Leonardo Mello	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Acrobat Pro DC atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
4abbdbf6-b6d0-47a0-9304-8d4bbe0f623d	nanahira.rabelo@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Nanahira de Rabelo e SantAnna	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
bd1884f0-4ace-4112-8728-9e1cbd9ad09a	claudio.navarro@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Cláudio Alexandre de Area Leão Navarro	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
a7fbdced-2f13-4736-84ab-f5d0bd54d497	everton.ramos@planejamento.gov.br		Licença	Power BI Pro			Everton Batista Ramos	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Power BI Pro atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
514d28a7-1b09-4268-a53a-9e5e8932b39c	rodolfo.aguiar@planejamento.gov.br		Licença	Adobe Creative Cloud - All Apps			Rodolfo Vaz Oliveira Aguiar	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Adobe Creative Cloud - All Apps atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
985b78d2-7d33-4ca2-990d-3d640f92489a	adrieny.guterres@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Adrieny Azeredo Guterres	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
f77be2d7-bd4d-45ca-a3ac-540e4d1ae849	gustavo.bruzzeguez@planejamento.gov.br		Licença	Power BI Pro			Gustavo Andrade Bruzzeguez	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Power BI Pro atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
adc0478a-a70b-4b3c-bb42-c6d53df8e959	mario.valverde@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Mario dos Santos Morais Valverde Neto	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
11b44df5-3e12-49dd-9767-0fe4817a2815	leandro.lira@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Leandro de Lima Lira	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
bcd48b3b-1bc0-4063-a24a-928d003d7aa0	anael.jacob@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Anael Aymore Jacob	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
2053b1da-1892-450f-8e59-5473c89e3a27	edimilson.oliveira@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Edimilson Torres de Oliveira Neto	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
f5ded205-b4ea-4a20-bfd0-7356a38e95df	thomaz.fronzaglia@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Thomaz Fronzaglia	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
fe2591bc-adb9-4734-b951-6d04a0200271	claudio.monteiro@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Cláudio Martins Neiva Monteiro	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
3946a5b6-16ca-49a2-b46f-21f2450c0d7f	claudia.canedo@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Claudia Regina Tavares Canedo	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
c795afe5-7f54-4aef-b78d-3662ebcf812c	ana.lessa@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Ana Vitória Santos Lessa	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
36e3f837-40a0-4c07-8bf6-1511fd12fbe1	antonio.s.filho@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Antônio Sabino da Costa Filho	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
7153e3c9-8c6f-4728-ac7f-76375efe3394	matheus.pereira@planejamento.gov.br	\N	Licença	Copilot Studio	CGEST	\N	Matheus Maurício Rodrigues Pereira	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Copilot Studio atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
6a060075-d14b-4bd1-b7c4-d91272c4b4c8	joao.g.barreto@planejamento.gov.br	\N	Licença	Power BI Pro	\N	\N	João Carlos Gonçalves Barreto	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	Licença	\N	\N	Power BI Pro atribu├¡da	\N	\N	2026-06-01 12:42:54.078+00	\N
54abc0ce-b695-44e5-82f2-a67b8ab1bb0c	mario.valverde@planejamento.gov.br		Licença	Copilot Studio			Mário dos Santos Morais Valverde Neto	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Studio atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
194b9c53-4579-4994-b456-69b14872233a	rafael.gangana@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Rafael Saldanha Ferraz Gangana	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
b217179b-fd4e-4a84-91be-5932d403567f	hermann.mirindiba@planejamento.gov.br		Licença	Power BI Pro			Hermann Moraes Mirindiba	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Power BI Pro atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
51af13f7-62de-4d47-8898-208393aa63cc	elisangela.aguiar@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Elisângela Maria de Aguiar	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
f1fb8d72-0fee-4398-98c3-e2e49e5967df	italo.soares@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Ítalo Nogueira Soares	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
68e588df-a95c-43b1-b732-cf04f1e914f7	vinicius.a.santos@planejamento.gov.br		Licença	Copilot Studio			Vinícius Araújo dos Santos	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Studio atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
b046cb93-31cc-4236-ac6a-0c21ecdd10c2	alvaro.carneiro@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Álvaro José de Andrade Carneiro	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
237fbb43-2afa-4fb2-89f0-1550af5c2bf5	jorge.arbex@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Jorge Toufic Arbex	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
4fb7df17-34fa-4f4c-902d-436975c6a464	luciano.pacheco@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Luciano da Silva Pacheco	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
d1bea5ed-2490-429e-9fef-21bff7151253	oscar.zveiter@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Oscar Zveiter Neto	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
234a09c4-cea8-4c0c-87ff-355d19e2385f	cristiane.carvalho@planejamento.gov.br		Licença	Copilot Studio			Cristiane Gonzaga Chaves de Carvalho	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Studio atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
6abaa986-59bb-435d-8d52-8d5abf23ff5c	hermann.mirindiba@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Hermann Moraes Mirindiba	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
78e17347-d897-441a-b32a-508e13b5dee6	jeaner.silva@planejamento.gov.br		Licença	Copilot Studio			Jeaner Luis de Paula Silva	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Studio atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
3843e596-997f-4e3f-8442-66e145e1c9a3	paulo-r.leite@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Paulo Henrique da Rocha Leite	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
29c45001-43d5-48ca-bd10-0e2df94d2826	waldeck.araujo@planejamento.gov.br		Licença	Acrobat Pro DC			Waldeck Pinto de Araujo Junior	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Acrobat Pro DC atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
1356dc08-802c-4eec-bb62-b5afb9c16b36	deborah.arbex@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Deborah Ferreira Arbex	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
bdc3358b-7901-48d8-a85e-d0f569698853	edimilson.oliveira@planejamento.gov.br		Licença	Power BI Pro			Edimilson Torres de Oliveira Neto	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Power BI Pro atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
445bd9d9-9a9a-496b-92b2-a2e2b84b0f0d	felipe.caixeta@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Felipe Caixeta Carvalho	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
26147154-f61f-4ab2-8043-30b95a2282de	priscilla.pimentel@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Priscilla Rosa Pimentel Sganzerla	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
5009283d-2a67-4222-9947-5cd039a3fcad	eduardo.stuani@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Eduardo do Nascimento Stuani	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
6789ca7f-718b-4b09-8e22-2f93086c12c6	gustavo.bruzzeguez@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Gustavo Andrade Bruzzeguez	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
8fce0828-21bf-4d4e-b6de-d07d6c4b65f4	rodrigo.c.silva@planejamento.gov.br		Licença	Power BI Pro			Rodrigo Cardoso Da Silva	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Power BI Pro atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
e896eb7b-69a0-4b2c-9b01-b7e763c5b5f5	dilso.marques@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Dilso Marvell Marques	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
14aebbb8-c313-436f-8012-bf7665fc7ef4	karlei.rodrigues@planejamento.gov.br	\N	Licença	Power BI Pro	\N	\N	Karlei Scardua Rodrigues	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Power BI Pro atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
1894ba58-8c16-41dc-9438-674df27391e1	filipe.duarte@planejamento.gov.br	\N	Licença	Copilot Studio	\N	\N	Filipe Tomaz Figueiredo Duarte	\N	\N	ativa	\N	2026-06-23 14:27:11.402547+00	\N	SW	\N	\N	Copilot Studio atribuída	\N	\N	2026-06-23 14:27:11.402547+00	\N
3fdf2f47-e224-4989-9815-df27d35c78b8	karina.martins@planejamento.gov.br	\N	Licença	Adobe Creative Cloud - All Apps	\N	\N	Karina Rocha Martins	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	Licença	\N	\N	Adobe Creative Cloud - All Apps atribu├¡da	\N	\N	2026-06-24 13:30:35.923+00	
57913a3e-8dce-4fce-83cc-588e74f25283	karine.costa@planejamento.gov.br	\N	Licença	Adobe Creative Cloud - All Apps	\N	\N	Karine Patrício Costa	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	Licença	\N	\N	Adobe Creative Cloud - All Apps atribu├¡da	\N	\N	2026-06-24 13:30:45.231+00	
ce7162f6-127f-423d-83ae-b31a45393a5b	silvafelipe.csilva@planejamento.gov.br	\N	Licença	Gartner CDAO Executive Team Member	SOF	\N	Felipe Cesar Araujo Da Silva	\N	\N	ativa	\N	2026-06-23 14:45:15.033838+00	\N	Licença	\N	\N	Licença Gartner - Technical Professionals Team Member atribuída	\N	\N	2026-06-24 13:34:56.839+00	
cb03770e-1713-46ff-8c56-9ab8e0a4439f	fabiano.chaves@planejamento.gov.br		Licença	Planner Plan			Fabiano Chaves da Silva	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Planner Plan atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
986d1476-e922-44ec-9c5c-a3b1fe461faa	raquel.sampaio@planejamento.gov.br		Licença	Planner Plan			Raquel Braga Barreto Sampaio	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Planner Plan atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
c5e2fbcb-784c-490a-9f3b-bcc50b81bec2	cristiane.carvalho@planejamento.gov.br		Licença	Acrobat Pro DC			Cristiane Gonzaga Chaves de Carvalho	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Acrobat Pro DC atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
2f817e89-6462-4a35-a3da-089df5bdb49f	cesar.mascarenhas@planejamento.gov.br		Licença	Power BI Pro			Cesar Augusto Assis Mascarenhas De Oliveira	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Power BI Pro atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
6f57f7ce-0100-4671-8da5-7ec5012f3218	alvaro.carneiro@planejamento.gov.br		Licença	Acrobat Pro DC			Álvaro José de Andrade Carneiro	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Acrobat Pro DC atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
41b059d1-6bb5-4228-b757-0e03c4fa9e37	henrique.nagazawa@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Henrique Eiti Otaguiri Nagazawa	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
00df6d71-630a-4799-b16a-009b2446e5fb	adrieny.guterres@planejamento.gov.br	\N	Licença	Adobe Creative Cloud - All Apps	\N	\N	Adrieny Azeredo Guterres	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Adobe Creative Cloud - All Apps atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
3c09a9c8-3e11-4691-ac43-5d1a26545812	ana.dantas@planejamento.gov.br	\N	Licença	Adobe Creative Cloud - All Apps	\N	\N	Ana Carolina de Souza Dantas	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Adobe Creative Cloud - All Apps atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
963c0c42-7f89-47f3-9a43-d6bc783ddfc0	vinicius.jovito@planejamento.gov.br		Licença	Copilot Studio			Vinícius Soares Jovito	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Studio atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
2d08434d-2f9f-40d8-a41d-0b5494a472be	waldeck.araujo@planejamento.gov.br		Licença	Copilot Studio			Waldeck Pinto de Araujo Junior	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Studio atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
8563275b-8b6b-4b7d-8990-bddc85dcb7a7	bandarrinhadaniel.bandarrinha@planejamento.gov.br	\N	Licença	Gartner for Technical Professionals Team Member	SOF	\N	Daniel de Figueiredo Bandarrinha	\N	\N	ativa	\N	2026-06-23 14:45:15.033838+00	\N	SW	\N	\N	Licença Gartner - Technical Professionals Team Member atribuída	\N	\N	2026-06-23 14:45:15.033838+00	\N
95193ae0-f1b4-4611-9e51-87be818cd626	ricardo.teixeira@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Ricardo de Assis Teixeira	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
cba2fa39-d699-4482-8c82-f92132ee3e2b	denise.gontijo@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Denise Herminio Gontijo	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
180757e4-37b2-4ab3-ac67-a32207851aeb	daniel.rezende@planejamento.gov.br	\N	Licença	Adobe Creative Cloud - All Apps	\N	\N	Daniel Oliveira De Rezende	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Adobe Creative Cloud - All Apps atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
fc70cdd8-f3d1-47cd-8587-2b387f93e37d	flavio.scorza@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Flavio Augusto Trevisan Scorza	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
b499b17e-3e59-49d7-bb5b-9d191cd4faf2	maristella.salgado@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Maristella Alves do Nascimento Salgado	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
ae5b41dc-79ff-4160-a2a9-26f3f8b45d3f	felipe.csilva@planejamento.gov.br	\N	Licença	Adobe Creative Cloud - All Apps	\N	\N	Felipe Cesar Araujo da Silva	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Adobe Creative Cloud - All Apps atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
0c36fd1b-ebc8-498e-aab9-706854c8f544	ferreiraadalberto.ferreira@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	Adalberto Rodrigues Ferreira	\N	\N	ativa	\N	2026-06-23 14:45:15.033838+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-23 14:45:15.033838+00	\N
58770bf4-49ae-415f-affb-1b5059df5754	gabriela.gomes@planejamento.gov.br	\N	Licença	Adobe Creative Cloud - All Apps	\N	\N	Gabriela Pires Gomes de Sousa Costa	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Adobe Creative Cloud - All Apps atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
35423cd8-7e02-4211-ab2c-778c18e4e231	ivan.stemler@planejamento.gov.br	\N	Licença	Adobe Creative Cloud - All Apps	\N	\N	Ivan Sasha Viana Stemler	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Adobe Creative Cloud - All Apps atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
3c5c2dd1-ad2b-4c46-8824-f4fabb9d63fc	jose.mascarenhas@planejamento.gov.br	\N	Licença	Adobe Creative Cloud - All Apps	\N	\N	Jose Paulo de Araujo Mascarenhas	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Adobe Creative Cloud - All Apps atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
ee736a95-4db7-4cb6-bd94-0cd9c194bd68	guterresadrieny.guterres@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	Adrieny Azeredo Guterres	\N	\N	ativa	\N	2026-06-23 14:45:15.033838+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-23 14:45:15.033838+00	\N
76095be9-05a5-42f8-ad2e-ed656645813d	martinsallex.martins@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	Allex Carneiro Martins	\N	\N	ativa	\N	2026-06-23 14:45:15.033838+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-23 14:45:15.033838+00	\N
79ca7936-2b52-40dc-8665-e7ba6045e922	custodioana.custodio@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	Ana Laura Sousa e Custodio	\N	\N	ativa	\N	2026-06-23 14:45:15.033838+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-23 14:45:15.033838+00	\N
d08c8652-4c65-4f3d-aae0-e15980821bf3	lessaana.lessa@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	Ana Vitória Santos Lessa	\N	\N	ativa	\N	2026-06-23 14:45:15.033838+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-23 14:45:15.033838+00	\N
5e8c4f31-85c0-4839-ad47-f033b249f007	filhoantonio.s.filho@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	Antônio Sabino da Costa Filho	\N	\N	ativa	\N	2026-06-23 14:45:15.033838+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-23 14:45:15.033838+00	\N
a0e50ff0-4ee5-494f-93fd-b4a86757a325	santosclaudia.avila@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	Claudia Campos de Ávila Santos	\N	\N	ativa	\N	2026-06-23 14:45:15.033838+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-23 14:45:15.033838+00	\N
26aede4c-a245-4309-91ea-13f3e8f95483	lilian.faula@planejamento.gov.br	\N	Licença	Adobe Creative Cloud - All Apps	SE/SAGE/CGEST	\N	Lilian Chaves Maluf Faula	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Adobe Creative Cloud - All Apps atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
a7ce4670-155e-4097-a9c8-24d1b380902d	nayla.gomes@planejamento.gov.br	\N	Licença	Adobe Creative Cloud - All Apps	\N	\N	Nayla Cunha Gomes	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Adobe Creative Cloud - All Apps atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
02a2f783-c04e-4a0d-a0f6-40a937d09a3f	viviane.barros@planejamento.gov.br	\N	Licença	Adobe Creative Cloud - All Apps	\N	\N	Viviane Gomes De Barros Nóbrega	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	Licença	\N	\N	Adobe Creative Cloud - All Apps atribu├¡da	\N	\N	2026-06-24 13:30:55.663+00	
85487d1d-841b-4346-842b-466d9676ca4c	samantha.cavadinha@planejamento.gov.br	\N	Licença	Adobe Creative Cloud - All Apps	\N	\N	Samantha Lemos Turte Cavadinha	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Adobe Creative Cloud - All Apps atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
4f881bf0-f7c3-4446-8ab9-11767fa4c5e0	canedoclaudia.canedo@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	Claudia Regina Tavares Canedo	\N	\N	ativa	\N	2026-06-23 14:45:15.033838+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-23 14:45:15.033838+00	\N
5a40248a-3392-4423-8d2f-10bf2cc403c3	joao.figuereido@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			João Gabriel Dias Figuereido	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
90087ee7-c381-4357-948c-d3bde9f470fd	monteiroclaudio.monteiro@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	Cláudio Martins Neiva Monteiro	\N	\N	ativa	\N	2026-06-23 14:45:15.033838+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-23 14:45:15.033838+00	\N
ead96cef-6b6d-4f0b-b381-3067fde90b44	arbexdeborah.arbex@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	Deborah Ferreira Arbex	\N	\N	ativa	\N	2026-06-23 14:45:15.033838+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-23 14:45:15.033838+00	\N
4f5fc6ef-eaf5-4884-9dc6-2965d26e360a	adalberto.ferreira@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Adalberto Rodrigues Ferreira	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
9e9c40e0-e4fe-49f1-9ddc-c2536756e487	mariana.rodrigues@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Mariana Cunha Eleutério Rodrigues	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
3d1eb5f5-1cc8-4569-bcc3-aa747378fbb0	luiz.a.neto@planejamento.gov.br		Licença	Power BI Pro			Luiz Alves Antonio Neto	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Power BI Pro atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
bd13b332-8eca-4a11-9b58-afd2b1693090	daniel.s.coelho@planejamento.gov.br		Licença	Power BI Pro			Daniel Souza Coelho	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Power BI Pro atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
53c5119c-3d52-4a71-9aaa-ebb64169484d	pamela.lemos@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Pamela Vanessa Knoup Siqueira Lemos	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
197eb2dd-f85d-458d-ae06-6e12b74245f8	vinicius.jovito@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Vinícius Soares Jovito	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
fa2a79d5-9c07-4ceb-b862-e1ea047547a9	david.meister@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			David Meister	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
40f10da8-8161-4bdb-8347-13359c5ec68f	claudia.avila@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Claudia Campos de Ávila Santos	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
af28b3d1-7140-4070-a1df-cd0a5ce34a4e	paulo-n.rocha@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Paulo Eduardo Nunes de Moura Rocha	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
5dad1637-4c40-4645-bc04-d2043e661639	leonardo.c.mello@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Leonardo Mello	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
279ef3f5-b81d-47ba-abb0-7e0601e6e45a	cesar.mascarenhas@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			César Augusto Assis Mascarenhas de Oliveira	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
7b643a4b-f7ac-4bcb-8124-7f57b9468543	rodolfo.marques@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Rodolfo Marques Santos	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
edf501f9-51d5-4231-b0cc-cb3efa0a78ac	matheus.mauricio@planejamento.gov.br		Licença	Copilot Studio			Matheus Maurício Rodrigues Pereira	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Studio atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
089583ed-3109-428b-9d05-6ad52b29e064	felipe.caixeta@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	Felipe Caixeta Carvalho	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Copilot Add-on atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
6cfd07cc-bd50-412e-bc90-e920530cc014	henrique.nagazawa@planejamento.gov.br	\N	Licença	Copilot Add-on	SE/SAGE/CGTOP/COTIC	\N	Henrique Eiti Otaguiri Nagazawa	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Copilot Add-on atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
38fc8cd5-6676-4054-9087-5ebe1eecfc3a	luiz.h.moreira@planejamento.gov.br		Licença	Power BI Pro			Luiz Henrique Moreira	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Power BI Pro atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
a58a874b-4276-4a9e-87ea-2830b5147cf0	pedro.aguiar@planejamento.gov.br		Licença	Power BI Pro			Pedro De Souza Aguiar	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Power BI Pro atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
237c845c-d377-456d-a5e6-92d1f9cc99a6	lorena.pompeu@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Lorena Ferrer Cavalcanti Randal Pompeu	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
5a46bfe9-abad-450e-aa0b-3d74d9fb25dd	pamela.lemos@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	Pamela Vanessa Knoup Siqueira Lemos	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Copilot Add-on atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
3671e3a7-b755-41a9-a150-0b24aedce28f	paulo-r.leite@planejamento.gov.br	\N	Licença	Copilot Add-on	CONTB	\N	Paulo Henrique da Rocha Leite	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Copilot Add-on atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
451e1f17-7291-4504-8018-f786f2194020	rafael.gangana@planejamento.gov.br	\N	Licença	Copilot Add-on	COEFI	\N	Rafael Saldanha Ferraz Gangana	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Copilot Add-on atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
dfac86c2-0897-4f46-b710-fba5813f58f3	guilherme.oliveira@planejamento.gov.br	\N	Licença	Copilot Studio	\N	\N	Guilherme Resende Oliveira	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Copilot Studio atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
825593b9-f99a-43db-b305-47cff77d8126	marquesdilso.marques@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	Dilso Marvell Marques	\N	\N	ativa	\N	2026-06-23 14:45:15.033838+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-23 14:45:15.033838+00	\N
6d6440a0-37d5-4cd6-892c-a15926b5c0c5	andre.monteiro@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	André do Nascimento Monteiro	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	Licença	\N	\N	Acrobat Pro DC atribu├¡da	\N	\N	2026-06-24 13:24:27.054+00	
b17a0e0f-b0ba-4680-ae0f-69515a2efb3b	carlene.souza@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Carlene Guimarães de Souza	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	Licença	\N	\N	Acrobat Pro DC atribu├¡da	\N	\N	2026-06-24 13:24:49.42+00	
5e8e8f34-eb65-4a3a-b7cc-0dde46c41216	raphael.amaro@planejamento.gov.br	\N	Licença	Copilot Studio	\N	\N	Raphael Silveira Amaro	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Copilot Studio atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
7173f0c0-61a7-4bc6-a9cc-6df68283a227	geraldo.francisco@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Geraldo Francisco da Silva Júnior	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	Licença	\N	\N	Acrobat Pro DC atribu├¡da	\N	\N	2026-06-24 13:25:14.573+00	
ad936944-304e-4acf-85b8-e6b48218823b	jessica.orion@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Jessica Ellen Azevedo Orion Lopes	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	Licença	\N	\N	Acrobat Pro DC atribu├¡da	\N	\N	2026-06-24 13:25:58.031+00	
911a659c-445d-4e7a-b6ef-66546934b221	amarildo.lima@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	José Amarildo Nunes de Lima	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	Licença	\N	\N	Acrobat Pro DC atribu├¡da	\N	\N	2026-06-24 13:26:08.745+00	
a03b3591-fdb4-494d-bff0-ac846a224da1	vinicius.araujo@planejamento.gov.br	\N	Licença	Copilot Studio	\N	\N	Vinícius Araújo dos Santos	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	Licença	\N	\N	Copilot Studio atribu├¡da	\N	\N	2026-06-24 13:31:52.372+00	
2c7f0586-c9fe-4b2a-8100-8a39e2ba4e37	leonardo.c.mello@planejamento.gov.br		Licença	Copilot Studio			Leonardo Mello	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Studio atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
b321bc98-d9f3-4421-a22b-98aa35349532	maira.costa@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Maíra Murrieta Costa	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
6f6cf4e6-ecbe-471f-8846-afa272ccc9f4	ricardo.almeida@planejamento.gov.br		Licença	Power BI Pro			Ricardo Almeida Carvalho	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Power BI Pro atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
6e35b050-9ad4-45c4-9164-868a221a3a31	rodolfo.aguiar@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Rodolfo Vaz Oliveira Aguiar	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
eb9f4f51-b715-4766-9783-9d85718335c9	daniel.s.coelho@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Daniel Souza Coelho	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
0046fa8d-a164-48fe-9a04-5bd7509c91cf	jonatas.santos@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Jônatas D'Alma Costa Santos	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
195c346d-2393-4b03-bd28-388e8dd0d93d	bruno.sousa@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Bruno Sousa de Oliveira	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Acrobat Pro DC atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
9e596209-f534-45a5-98bb-c13e3cfaa835	joao.figuereido@planejamento.gov.br		Licença	Power BI Pro			João Gabriel Dias Figuereido	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Power BI Pro atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
72a9fcb1-268f-4d5c-9758-e8161b17310c	pedro.barbosa@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Pedro Barbosa da Silva	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
788cc220-13c9-4dfc-80c1-ef32ee6c20ea	carlos.renato@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Carlos Renato de Melo Castro	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Acrobat Pro DC atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
a8da8510-3224-4540-8946-d8b70de80970	denise.gontijo@planejamento.gov.br		Licença	Power BI Pro			Denise Herminio Gontijo	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Power BI Pro atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
1df88034-0b2a-47d1-8e02-21e934f73f92	rafael.neto@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Rafael Martins Neto	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
021229d7-7ddb-46a8-ae5c-9d1a7162d43f	daniel.grimaldi@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Daniel da Silva Grimaldi	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Acrobat Pro DC atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
27fe9f09-ed8f-4b00-955d-216569210b2a	daniela.farias@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Daniela Mesquita de Farias	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Acrobat Pro DC atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
206f8f24-ffa9-4b87-b12a-b83b6be3beff	denise.dias@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Denise Galana Gomes Dias	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Acrobat Pro DC atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
12d484ce-64a4-4738-8bf8-202ae1c58c6f	dilso.marques@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Dilso Marvell Marques	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Acrobat Pro DC atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
764b567f-a259-4612-a994-02a891e7ed06	emily.damasceno@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Emily Silva Damasceno	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Acrobat Pro DC atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
6772d53d-81c5-434a-b02c-dc1c087a59c3	flavia.pereira@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Flavia Pedrosa Pereira	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Acrobat Pro DC atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
ae251c4d-2b8f-44fc-9b33-2cdcd8c6204a	iara.tillmann@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Iara Marina de Oliveira Tillmann	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Acrobat Pro DC atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
0b0c3730-c1db-4cb8-9625-65d7956b9ea2	keliane.cavalcante@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Keliane de Oliveira Cavalcante	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Acrobat Pro DC atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
254a8319-6de8-4d4f-b958-4c698beedc6c	larissa.vieira@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Larissa Martins Vieira	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Acrobat Pro DC atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
09e7bdd4-c2e9-47e7-89ea-24d2f125e78b	laurinei.martins@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Laurinei Pimentel Martins	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	Licença	\N	\N	Acrobat Pro DC atribu├¡da	\N	\N	2026-06-24 13:26:44.564+00	
9a135b45-5cb2-4093-aec2-3a7ec7f71715	mirian.fiuza@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Mirian de Fátima Fiuza de Oliveira	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	Licença	\N	\N	Acrobat Pro DC atribu├¡da	\N	\N	2026-06-24 13:28:36.041+00	
3c95b027-810e-47a2-920b-133b77064193	tatiane.oliveira@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Tatiane Braz De Oliveira	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	Licença	\N	\N	Acrobat Pro DC atribu├¡da	\N	\N	2026-06-24 13:29:24.777+00	
9cebfca3-6717-43a5-8e6b-53b8ce8ed77b	aguiarelisangela.aguiar@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	Elisângela Maria de Aguiar	\N	\N	ativa	\N	2026-06-23 14:45:15.033838+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-23 14:45:15.033838+00	\N
673e86c1-980f-4819-866e-7a27bf624696	vinicius.andrade@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Vinícius Pereira Andrade	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	Licença	\N	\N	Acrobat Pro DC atribu├¡da	\N	\N	2026-06-24 13:29:57.698+00	
9dc0d4e1-ce0e-4d68-8072-232a2f846496	marilia.lima@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Marília Oliveira Barbosa Lima	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	Licença	\N	\N	Acrobat Pro DC atribu├¡da	\N	\N	2026-06-24 14:18:55.504+00	
218553ca-2860-4ac6-9d44-2e47319a3aff	moises.s.carvalho@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Moisés dos Santos Carvalho	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	Licença	\N	\N	Acrobat Pro DC atribu├¡da	\N	\N	2026-06-24 14:20:30.514+00	
aa0f21d2-abe7-4457-912e-ebe4b5434745	gustavo.guimaraes@planejamento.gov.br		Licença	Acrobat Pro DC			Gustavo José de Guimarães e Souza	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Acrobat Pro DC atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
f4e10313-dbb7-4f8a-a64b-c60fcdd3c5f7	julio.leite@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Júlio Vinícius Alves Leite	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
950a1ff4-05ba-450f-9d60-6011630967d8	rafael.ibsen@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Rafael Ibsen Souza Silva	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
6ff46ce8-56af-48bb-90b2-a7038ca50477	mara.sousa@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Mara Helena Sousa	\N		Ativa	\N	2026-07-02 12:08:56.03887+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-02 12:08:56.03887+00	\N
1806d27a-7475-43b8-9cd4-0fe363da6fb6	roberta.vieira@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Roberta da Silva Vieira	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Acrobat Pro DC atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
b201d7c0-0b77-4dbe-bd77-3759c5dc1619	roberto.celestino@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Roberto Marconne Celestino De Souza	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Acrobat Pro DC atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
cbf7aa91-0661-4504-8583-17634695a09a	rubiane.araujo@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Rubiane Rios Ferreira Araujo	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Acrobat Pro DC atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
52ef5c38-fda4-4fff-81cf-76c8f159eb3e	silvana.silva@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Silvana Ribeiro da Silva	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Acrobat Pro DC atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
114ebd4f-591b-4df7-8264-4c795f110e79	ubiratan.lucena@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Ubiratan Nunes de Lucena	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Acrobat Pro DC atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
abfdeec1-681c-463c-a609-4abeceb9a215	willian.bueno@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Willian Bueno e Silva	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Acrobat Pro DC atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
391e1292-0156-4f24-b5a3-d28614448017	zaqueu.silva@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Zaqueu Batista da Silva	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Acrobat Pro DC atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
2c41accb-bcb9-4407-9634-582bd6710cea	emanele.queiros@planejamento.gov.br	\N	Licença	Adobe Creative Cloud - All Apps	\N	\N	Emanuele dos Santos Queiros	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Adobe Creative Cloud - All Apps atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
cbcc84b3-60f7-46c9-a7a5-31cd98ff9477	guilherme.resende@planejamento.gov.br	\N	Licença	Copilot Studio	\N	\N	Guilherme Resende Oliveira	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	SW	\N	\N	Copilot Studio atribu├¡da	\N	\N	2026-05-28 13:53:30.584859+00	\N
6a8689a7-3102-4177-831a-492b453838eb	marcus.brandao@planejamento.gov.br	\N	Licença	Acrobat Pro DC	\N	\N	Marcus Vinicius Pereira Brandão	\N	\N	Ativa	\N	2026-05-28 11:47:12.678551+00	\N	Licença	\N	\N	Acrobat Pro DC atribu├¡da	\N	\N	2026-06-01 12:54:17.01+00	\N
f3c80c2f-d7fe-48d3-aaf9-7e7dd5b6d760	anderson.guedes@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Anderson Guedes Francisco	\N		Ativa	\N	2026-07-08 12:14:03.587049+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-08 12:14:03.587049+00	\N
f0da6282-994a-491a-ba28-897a581d3f5f	cristiane.ikawa@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Cristiane Ribeiro Ikawa	\N		Ativa	\N	2026-07-08 12:14:03.587049+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-08 12:14:03.587049+00	\N
d591251a-aa71-4087-b3b8-a2cab9e829fc	elaine.lopes@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Elaine Ferreira Lopes	\N		Ativa	\N	2026-07-08 12:14:03.587049+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-08 12:14:03.587049+00	\N
a6f5137d-c2f1-4fe5-adb4-f8d786c50b65	fernanda.marciano@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Fernanda Rodrigues Marciano	\N		Ativa	\N	2026-07-08 12:14:03.587049+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-08 12:14:03.587049+00	\N
a60ea0a6-c7a2-415e-9f25-650f9f78331b	gabriel.prata@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Gabriel Prata Ferreira	\N		Ativa	\N	2026-07-08 12:14:03.587049+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-08 12:14:03.587049+00	\N
4d67d64f-1d2d-41e2-80e5-a42b33b59c40	gustavo.souza@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Gustavo Rita de Souza	\N		Ativa	\N	2026-07-08 12:14:03.587049+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-08 12:14:03.587049+00	\N
adff9116-fde3-467e-9d20-b839b1df3248	isabelle.picelli@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Isabelle Alline Lopes Picell	\N		Ativa	\N	2026-07-08 12:14:03.587049+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-08 12:14:03.587049+00	\N
f0e7e4bd-b0a0-44de-87c7-1cba85a26dca	47959713	GNSOAXA002180	Monitor	AOC / 24P1U	\N	\N	Sem usuário alocado	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-09 14:48:45.996+00	GNSOAXA002180
c8e11a65-a067-46a0-9bd3-1f590932cf0f	47959682	01047510010021	Desktop	Daten / DC6A-S	COLOG	\N	Andrine Gonçalves Soares / Hilquias Rosa de Oliveira	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Desktop	10.209.178.12	feito	\N	\N	\N	2026-06-09 14:56:25.37+00	01047510010021
55a78dd5-5730-4e31-aa91-e29f80d4fd38	lorenzo.fernandes@planejamento.gov.br		Licença	Copilot Add-on (Microsoft 365 Copilot)			Lorenzo de Souza Fernandes	\N		Ativa	\N	2026-07-08 12:14:03.587049+00	\N	SW		\N	Copilot Add-on (Microsoft 365 Copilot) atribuída	\N	\N	2026-07-08 12:14:03.587049+00	\N
e99174b2-8fcc-4fb6-8e12-6767adaea742	47959551	01047095010018	Desktop	Daten / DC6A-S	COGEP	\N	Thais Luna Magnago / Geovana Sena Aguiar	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	10.209.178.17	feito	\N	\N	\N	2026-05-28 13:53:30.584859+00	01047095010018
590db8b1-50ae-4156-b3db-717f40270982	12399202	301AZGFC5311	Monitor	Positivo / 24BL550J	COGEP	\N	Thais Luna Magnago / Geovana Sena Aguiar	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MGI	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	301AZGFC5311
3f18a5bb-f0d4-4977-85ca-349b993f496e	12402587	312AZVN8R807	Monitor	Positivo / 24BL550J	COGEP	\N	Thais Luna Magnago / Geovana Sena Aguiar	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MGI	\N	\N	\N	\N	\N	2026-05-28 13:53:30.584859+00	312AZVN8R807
55e5b7a3-18f3-4f9f-b88c-3a45a39cb871	47959650	01047510010033	Desktop	Daten / DC6A-S	\N	\N	Livre	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	10.209.178.61	feito	\N	\N	\N	2026-05-28 13:53:30.584859+00	01047510010033
cb2ea570-f90d-4709-bdc5-31d59bd4037e	47959762	01047511010026	Desktop	Daten / DC6A-S	COTIC	\N	Marcos Sebastian Alsina	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	10.209.178.37	feito	\N	\N	\N	2026-05-28 13:53:30.584859+00	01047511010026
b2db60e1-a599-453a-a28d-964f287f4d2a	47959750	01047511010014	Desktop	Daten / DC6A-S	COTIC	\N	Vinicius Veronezze dos Reis Costa	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	MPO	10.209.178.51	feito	\N	\N	\N	2026-05-28 13:53:30.584859+00	01047511010014
e013891a-6072-44ba-a4fe-db574ffab22f	147959608	GNSO8XA009013	Monitor	AOC / 24P1U	COLOG	\N	Andrine Gonçalves Soares / Hilquias Rosa de Oliveira	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-09 14:56:56.093+00	GNSO8XA009013
a2f82825-f413-465c-9782-9702de06ba1d	47959605	GNSO8XA009001	Monitor	AOC / 24P1U	COLOG	\N	Andrine Gonçalves Soares / Hilquias Rosa de Oliveira	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-09 14:57:04.042+00	GNSO8XA009001
a9c7a34e-d01a-4609-9fdd-f993f328b4c2	47959631	GNSO8XA010454	Monitor	AOC / 24P1U	COLOG	\N	Andrine Gonçalves Soares / Hilquias Rosa de Oliveira	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-09 14:57:13.857+00	GNSO8XA010454
083afc10-6e47-46f5-ba3c-6e4da83d474d	47959614	GNSO8XA009422	Monitor	AOC / 24P1U	CGEST	\N	Matheus Maurício Rodrigues Pereira	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-09 14:57:48.107+00	GNSO8XA009422
83c0d285-15df-4e43-9dd9-741fd1531a32	47959724	GNSO9XA014157	Monitor	AOC / 24P1U	CGEST	\N	Matheus Maurício Rodrigues Pereira	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-09 14:57:59.612+00	GNSO9XA014157
2e35b9eb-6a4d-41ee-ba28-3f899f0f6d8a	47959619	GNSO8XA009430	Monitor	AOC / 24P1U	CGEST	\N	Matheus Maurício Rodrigues Pereira	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-09 14:58:15.661+00	GNSO8XA009430
f8803afb-a3c3-48b4-8957-d4ebb820920a	47959629	GNSO8XA009668	Monitor	AOC / 24P1U	COGEP	\N	Maristella Alves do Nascimento Salgado / João Remisson Teixeira Figueiredo	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-09 14:58:38.938+00	GNSO8XA009668
652617f6-2ff0-4df5-bb25-b403b36b37f9	47959588	GNSO8XA008981	Monitor	AOC / 24P1U	COGEP	\N	Maristella Alves do Nascimento Salgado / João Remisson Teixeira Figueiredo	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-09 14:58:59.765+00	GNSO8XA008981
7690d3e0-bd6f-4224-b05f-9206cd37f76e	47959624	GNSO8XA009651	Monitor	AOC / 24P1U	COGEP	\N	Maristella Alves do Nascimento Salgado / João Remisson Teixeira Figueiredo	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-09 14:59:10.472+00	GNSO8XA009651
f1589124-c522-442a-8b8c-9173536e494f	47959651	01047510010003	Desktop	Daten / DC6A-S	COTIC	\N	Matheus Maurício Rodrigues Pereira	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Desktop	10.209.178.56	feito	\N	\N	\N	2026-06-10 11:28:44.059+00	01047510010003
936364ab-d48c-4ae4-bcf6-fa4ad2b15279	12402586	312AZWS8R873	Monitor	Positivo / 24BL550J	COGEP	\N	Franciellen Euzébio Silva dos Santos	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-10 11:33:25.759+00	312AZWS8R873
a560ad65-5226-4b74-b2b6-775df84dc315	12402692	312AZKA3F829	Monitor	Positivo / 24BL550J	COGEP	\N	Franciellen Euzébio Silva dos Santos	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-10 11:33:35.768+00	312AZKA3F829
803f5bf4-5b8c-4fc0-bcc6-3cab977e2d6f	12402696	312AZBZ3M117	Monitor	Positivo / 24BL550J	COLOG	\N	André Luiz Rodrigues	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-10 11:34:35.6+00	312AZBZ3M117
c1ebc045-3e6b-4168-8db0-04db9ddbb376	12399200	301AZXC9R962	Monitor	Positivo / 24BL550J	\N	\N	Sem usuário alocado	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-10 11:35:26.841+00	301AZXC9R962
b24d9a20-e997-4700-aca6-d865f34964e0	12402594	312AZHY7S497	Monitor	Positivo / 24BL550J	\N	\N	Sem usuário alocado	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Monitor	\N	\N	\N	\N	\N	2026-06-10 11:35:34.046+00	312AZHY7S497
92190674-da74-402f-9f04-911cc16e1502	47959583	01047095010050	Desktop	Daten / DC6A-S	COGEP	\N	Franciellen Euzébio Silva dos Santos	\N	\N	\N	\N	2026-05-28 11:47:12.678551+00	\N	Desktop	10.209.178.62	feito	\N	\N	\N	2026-06-10 11:45:28.031+00	01047095010050
71ed6e08-203c-416f-b114-d93eabd2b675	santosjonatas.santos@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	Jônatas D'Alma Costa Santos	\N	\N	ativa	\N	2026-06-23 14:45:15.033838+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-23 14:45:15.033838+00	\N
3ed36596-6249-4a53-a0ab-ef10a7646823	leitejulio.leite@planejamento.gov.br	\N	Licença	Copilot Add-on	\N	\N	Júlio Vinícius Alves Leite	\N	\N	ativa	\N	2026-06-23 14:45:15.033838+00	\N	SW	\N	\N	Copilot Add-on atribuída	\N	\N	2026-06-23 14:45:15.033838+00	\N
\.


--
-- Data for Name: levantamento_ativos; Type: TABLE DATA; Schema: public; Owner: horus_admin
--

COPY public.levantamento_ativos (id, created_at, updated_at, secretaria, unidade_responsavel, tipo_ativo, nome_ativo, sigla, finalidade, responsavel_negocio, responsavel_tecnico, status_ativo, uso_ativo, tecnologia_armazenamento, backup, volume_dados, frequencia_atualizacao, crescimento_por_atualizacao, linguagem_programacao, nivel_sigilo, natureza_dados, nivel_acesso, norma_especifica, risco_percebido, termo_responsabilidade, observacao_juridica, tipo_api, como_extracao, dificuldade_extracao, integracao_automatizada, potencial_reuso, possiveis_interessados, curador_dados, substituto_curador, data_inventario, periodicidade_revisao, secretaria_id, unidade_responsavel_id, responsavel_negocio_id, responsavel_tecnico_id, curador_dados_id, substituto_curador_id, criado_por) FROM stdin;
\.


--
-- Data for Name: license_files; Type: TABLE DATA; Schema: public; Owner: horus_admin
--

COPY public.license_files (id, license_id, file_url, file_name, file_type, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: modules; Type: TABLE DATA; Schema: public; Owner: horus_admin
--

COPY public.modules (id, name, created_at) FROM stdin;
a6d187eb-9ce5-4697-b664-5c428eafb62f	painel	2026-05-20 12:44:40.760577+00
f23ab4d4-4b5d-41c5-9664-a69dd52a6ae2	sistemas	2026-05-20 12:44:40.760577+00
4a0e08f4-b54c-4933-9825-ae7b65413802	inventario	2026-05-20 12:44:40.760577+00
5a3feab4-ec67-4ef2-95ee-791100428a88	registros	2026-05-20 12:44:40.760577+00
2bc790a4-fe6b-4cd3-bbc9-6621cfbd6b66	notificacoes	2026-05-20 12:44:40.760577+00
e5f5022b-5946-4519-8606-1bf53d8000cf	areas	2026-05-20 12:44:40.760577+00
e1188626-f2bf-4adf-9c96-f92e47d35e15	fontes_dados	2026-05-20 12:44:40.760577+00
\.


--
-- Data for Name: modulos; Type: TABLE DATA; Schema: public; Owner: horus_admin
--

COPY public.modulos (id, nome, descricao, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: notificacoes; Type: TABLE DATA; Schema: public; Owner: horus_admin
--

COPY public.notificacoes (id, tipo, mensagem, lida, created_at) FROM stdin;
a90d5667-8618-41d5-ad10-c7c50d5e55ea	cadastro	teste 2 cadastrou "aaaaaaaaaaaaaa" em BI Munis	t	2026-05-05 11:10:03.735722+00
182129c6-fab9-4f32-830c-3a8666d661f4	exclusao	Victor excluiu "aaaaaaaaaaaaaa"	t	2026-05-05 11:11:21.36064+00
c2625a2e-885e-4f04-a314-fd92a040f0fd	edicao	Victor editou "Comissões da Câmara " em Congresso/Senado/Câmara	t	2026-05-06 13:03:48.967146+00
62b7b425-9b1a-4dce-825e-8a6a38002a03	edicao	Victor editou "Nota informativa IDEB 2023" em BI Munis	t	2026-05-06 13:32:39.776513+00
edb29ac9-df03-4c3a-afa1-1b74166c0a7c	edicao	Victor editou "Divulgação anos iniciais municípios 2023" em BI Munis	t	2026-05-06 13:33:36.16673+00
5aeb9ae6-894b-4407-9fe3-70c59f6696d2	edicao	Victor editou "Divulgação anos finais municípios 2023" em BI Munis	t	2026-05-06 13:33:49.509877+00
1c44726f-6a84-4372-8b04-5928cc076647	edicao	Victor editou "Nota técnica taxas transição 2007 a 2016" em BI Munis	t	2026-05-06 13:33:56.491686+00
2bcfbd37-e173-48b2-8f2b-9c5c9c122d78	edicao	Victor editou "Tela BI Gestão Pessoas" em Pessoas	t	2026-05-06 14:37:06.270781+00
4e041888-12ba-4527-abd7-3ecf95000713	edicao	Victor editou "Pessoas atualizado 2026" em Pessoas	t	2026-05-06 14:37:17.442187+00
4ec8b913-ef44-48d3-bccb-ebad72264672	edicao	Victor editou "Pessoas atualizado 2025" em Pessoas	t	2026-05-06 14:38:35.361288+00
d1c94912-aecb-472a-afda-ddbfd57e5f3d	edicao	Victor editou "Pessoas" em Pessoas	t	2026-05-06 14:38:46.486122+00
b1c9e42d-b09f-4739-8247-bb82f441bfbb	edicao	Victor editou "Qualidade de Vida novo versão 2" em Pessoas	t	2026-05-07 11:33:27.941029+00
a474b7db-bd20-4ceb-bcac-c26b53381e06	edicao	Victor editou "Qualidade de Vida novo versão1" em Pessoas	t	2026-05-07 11:33:33.039743+00
6228f54f-7672-4b95-896f-43e39ca71d0c	edicao	Victor editou "Qualidade de Vida novo" em Pessoas	t	2026-05-07 11:33:37.214656+00
36b64eb5-9b9c-43b4-afec-633dd6dfb6f0	edicao	Victor editou "Qualidade de Vida" em Pessoas	t	2026-05-07 11:33:41.671617+00
ca7a3c60-a2f7-47c0-b949-f65276bb4a68	edicao	Victor editou "Painel Qualidade de Vida e Desenvolvimento" em Pessoas	t	2026-05-07 11:33:47.136861+00
f9024dac-953a-43bc-aba4-e10a182636ba	edicao	Victor editou "Pessoas atualizado 2025 ant" em Pessoas	t	2026-05-07 11:38:04.837564+00
b6403c30-594e-4b8f-b116-cf516325198a	edicao	Victor editou "Pessoas atualizado" em Pessoas	t	2026-05-07 11:39:06.831237+00
b3962646-a3f6-43d2-b861-41917381e9ef	edicao	Victor editou "Relatório da Gestão Orçamentária e Financeira 1º trimestre 2025" em Orçamento e Finanças	t	2026-05-07 11:41:25.000792+00
c22d39b3-71c7-42dd-be52-4700055ec119	cadastro	Victor cadastrou "Relatório da Gestão Orçamentária e Financeira 1º trimestre 2026" em Orçamento e Finanças	t	2026-05-07 11:57:46.431473+00
cb61861c-f792-4cdc-be69-3809cb97050f	edicao	Victor editou "Nota informativa IDEB 2023" em BI Munis	t	2026-05-07 12:26:00.224631+00
7a90f1e9-5f8b-4891-9c4e-26c30ce36a55	edicao	Victor editou "Nota técnica taxas transição 2007 a 2016" em BI Munis	t	2026-05-07 12:26:07.39561+00
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: horus_admin
--

COPY public.password_reset_tokens (id, user_id, token, expires_at, used, created_at) FROM stdin;
b07574b9-558c-40ba-9014-a24916bc33bd	32fa09a3-ba6d-4a75-ab60-95804c18b232	491d43d8-254b-41ae-ac71-ecae8be1f137	2026-07-16 13:34:32.655497+00	f	2026-07-16 12:34:32.655497+00
ede76e4a-e939-46e0-8c3f-213906d7cb4d	32fa09a3-ba6d-4a75-ab60-95804c18b232	cc1d17b5-5e03-4928-995f-215cafc3c700	2026-07-16 13:39:00.588545+00	f	2026-07-16 12:39:00.588545+00
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: horus_admin
--

COPY public.profiles (id, email, display_name, role, created_at, password_hash, must_reset_password, password_updated_at) FROM stdin;
6b87a7ee-889d-487e-b643-27f250661830	stuani255@gmail.com	Eduardo Stuani	admin	2026-06-17 15:22:21.28597+00	\N	t	\N
32fa09a3-ba6d-4a75-ab60-95804c18b232	victorodrigues.cc@gmail.com	Victor	admin	2026-04-28 11:31:52.43401+00	$2b$10$yS00o3tkhN5KWlypnrOZJe0IVVf.weX0jEiATRH/YlGDkkT0Blcoq	t	\N
682335d9-e33a-4f99-a302-26a81f68f588	victor.rf@sempreceub.com	Victor	viewer	2026-07-17 12:03:56.50737+00	$2b$10$3Ar7kZ.r8lhdtUdrrSwBouF/t0y4iYVYCs7SxWZ6LTCEN7zG8axXG	f	\N
8ada9593-b7d8-4127-a579-510646b10bf5	teste@gmail.com	teste	viewer	2026-07-20 12:11:22.923199+00	$2b$10$rFR4iNZdTND2AmgXKdR0x.CYga9v1ZPiSVx/5C2D2k0hvJNvdkOde	f	\N
\.


--
-- Data for Name: registros; Type: TABLE DATA; Schema: public; Owner: horus_admin
--

COPY public.registros (id, nome, categoria, link, descricao, criado_por, created_at, updated_at, arquivo_path, tipo_acesso, responsavel, desenvolvedor, fonte_dados, dados_sensiveis, secretaria, preview_path) FROM stdin;
a981804a-4bcb-4a65-97f4-9b0e981fba5d	Comissões do Senado	Congresso/Senado/Câmara	\N	Comissões do Senado	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 12:22:13.630806+00	2026-04-28 12:22:13.630806+00	1777378950609_Comissoes_do_Senado.pbix	publico	\N	\N	\N	f	\N	\N
ded533e8-2ee2-41d7-8f00-6ddc6dc797db	Palavras chave LEA	Congresso/Senado/Câmara	\N	Palavras chave LEA	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 12:22:41.011416+00	2026-04-28 12:22:41.011416+00	1777378978283_Palavras_chave_LEA.docx	publico	\N	\N	\N	f	\N	\N
8ed63ba0-859d-4a08-b2b9-da9cff64e440	Palavra chave Waldeck	Congresso/Senado/Câmara	\N	Palavra chave Waldeck	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 12:26:35.384648+00	2026-04-28 12:26:35.384648+00	1777379211757_Palavra_chave_Waldeck.docx	publico	\N	\N	\N	f	\N	\N
0b833465-3a6e-4783-88f6-e40316befc15	SP_2015-2016 export  e import	BI Munis	\N	SP_2015-2016 export  e import	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:08:43.212903+00	2026-04-30 12:44:30.375+00	1777381739918_SP_2015_2016_export__e_import.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
77b3caac-1bbe-46f4-81ef-f8f1f5230a54	Mercado de trabalho 2017 - 6449	BI Munis	\N	Mercado de trabalho 2017 - 6449	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 12:54:18.247839+00	2026-04-30 12:44:33.632+00	1777380872820_Mercado_de_trabalho_2017___6449.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
7f93dbab-b5a0-41c4-aa67-71541a32b0e8	SP_2010 export e import	BI Munis	\N	SP_2010 export e import	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:07:04.246121+00	2026-04-30 12:44:39.824+00	1777381641175_SP_2010_export_e_import.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
68dd8ede-1230-4e04-b3cd-f94744492f32	Mercado de trabalho 2007 - 6449	BI Munis	\N	Mercado de trabalho 2007 - 6449	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 12:53:43.935764+00	2026-04-30 12:44:45+00	1777380838585_Mercado_de_trabalho_2007___6449.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
11ac6df2-d551-48a2-9668-4b993276e017	MG_2017-2024_export e import	BI Munis	\N	MG_2017-2024_export e import	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:05:09.760641+00	2026-04-30 12:44:51.68+00	1777381526598_MG_2017_2024_export_e_import.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
c8de9838-fcdb-4eb0-9a7e-c638dd8ee6c9	SP_2011-2012 export e import	BI Munis	\N	SP_2011-2012 export e import	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:07:14.560088+00	2026-04-30 12:44:56.457+00	1777381651184_SP_2011_2012_export_e_import.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
32f196db-256a-4afb-8cbf-02e7c6852809	Conta para arquivos públicos 	BI Munis	\N	Conta para arquivos públicos 	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 12:38:38.832212+00	2026-04-30 12:45:45.34+00	1777379936196_Conta_para_arquivos_publicos_.txt	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
98df38aa-e044-4a9a-a8a4-d964c18ab235	Composição RMs IBGE	BI Munis	\N	Composição RMs IBGE	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 12:43:10.512223+00	2026-04-30 12:45:48.612+00	1777380207369_Composicao_RMs_IBGE.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
42ac9a87-552f-4f4d-a428-854897f028b1	Acidente de trânsito (óbito) total 2022	BI Munis	\N	Acidente de trânsito (óbito) total 2022	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 12:45:39.698351+00	2026-04-30 12:45:54.724+00	1777380356317_Acidente_de_transito__obito__total_2022.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
abe5bdbb-009a-4c8d-8ea8-6df95cc50c68	Estrutura Municipal - PRF	BI Munis	\N	Estrutura Municipal - PRF	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 12:45:52.546856+00	2026-04-30 12:46:02.709+00	1777380369582_Estrutura_Municipal___PRF.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
f8fd46b9-1c1b-43dd-8ac7-303be306bdbe	N de homicídios do sexo M - IPEA	BI Munis	\N	N de homicídios do sexo M - IPEA	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 12:47:07.759264+00	2026-04-30 12:46:05.941+00	1777380444788_N_de_homicidios_do_sexo_M___IPEA.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
1bb662a9-7f33-4023-9e84-b3ef23aaca4e	EXTRATO DOS LEITOS 2025;05	BI Munis	\N	EXTRATO DOS LEITOS 2025;05	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 12:50:32.062284+00	2026-04-30 12:46:12.181+00	1777380648611_EXTRATO_DOS_LEITOS_2025_05.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
67f6f26c-09bc-472d-855f-a883d25884a9	Mercado de trabalho 2022 - 9418	BI Munis	\N	Mercado de trabalho 2022 - 9418	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 12:53:09.772643+00	2026-04-30 12:46:15.126+00	1777380803951_Mercado_de_trabalho_2022___9418.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
92c31da5-93e3-467c-8ee6-eb18262c2376	SP_2019-2020 export e import	BI Munis	\N	SP_2019-2020 export e import	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:09:14.632932+00	2026-04-30 12:47:10.937+00	1777381770857_SP_2019_2020_export_e_import.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
911cf539-339a-4d3a-ac19-480f425ddf32	SP_2013-2014 export e import	BI Munis	\N	SP_2013-2014 export e import	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:07:25.921369+00	2026-04-30 12:47:33.146+00	1777381662592_SP_2013_2014_export_e_import.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
2cb55169-46ff-4af8-b93b-965a0ad89218	Código das seções - Comex Stat - 2010 a 2024	BI Munis	\N	Código das seções - Comex Stat - 2010 a 2024	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 12:59:46.79336+00	2026-04-30 12:47:39.915+00	1777381201757_Codigo_das_secoes___Comex_Stat___2010_a_2024.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
67575147-d523-47a7-91c0-d8ef0584d576	Ocupação 2022 - 10268	BI Munis	\N	Ocupação 2022 - 10268	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 12:53:21.98455+00	2026-04-30 12:47:46.988+00	1777380816440_Ocupacao_2022___10268.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
78516540-655d-4ee0-b3e1-657ca19af6d4	CNES maio - 2025	BI Munis	\N	CNES maio - 2025	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 12:50:07.610209+00	2026-04-30 12:47:53.612+00	1777380623913_CNES_maio___2025.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
8955e156-1bdc-458c-85d5-58b68a33c0ae	Acidente de trânsito (óbito) M - IPEA	BI Munis	\N	Acidente de trânsito (óbito) M - IPEA	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 12:43:58.523281+00	2026-04-30 12:47:59.3+00	1777380255133_Acidente_de_transito__obito__M___IPEA.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
433d6e70-4158-4920-8d8b-0326b6159500	Seleções Municipais	BI Munis	\N	Seleções Municipais	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 12:41:46.245984+00	2026-04-30 12:48:02.82+00	1777380122643_Selecoes_Municipais.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
bb2537b2-3eeb-49c7-a13f-64c40cdcd11a	Municípios por rota 	BI Munis	\N	Municípios por rota 	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 12:37:28.722085+00	2026-04-30 12:48:06.14+00	1777379864647_Municipios_por_rota_.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
ecbd570f-3b12-49f2-8db6-13cf07dfa142	Apresentação aspar 	Congresso/Senado/Câmara	\N	Apresentação aspar 	\N	2026-04-28 11:04:45.279136+00	2026-04-28 11:04:45.279136+00	1777374300684_Apresentacao_aspar_.pptx	publico	\N	\N	\N	f	\N	\N
cb277357-6abd-419f-abe6-617228172f84	Lavoura Temporária - 2014	BI Munis	\N	Lavoura Temporária - 2014	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:45:37.581809+00	2026-04-30 12:42:31.287+00	1777383954312_Lavoura_Temporaria___2014.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
7cfe3f56-2e00-41f5-b68b-e52b4fb447b4	Lavoura Temporária - 2013	BI Munis	\N	Lavoura Temporária - 2013	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:45:25.735862+00	2026-04-30 12:42:34.848+00	1777383942271_Lavoura_Temporaria___2013.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
bca17c50-2eca-4815-bbf3-aacc2b6e9fae	Produção da aquicultura - 2015	BI Munis	\N	Produção da aquicultura - 2015	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:46:29.191695+00	2026-04-30 12:42:44.456+00	1777384006196_Producao_da_aquicultura___2015.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
f04c8e10-a8db-44d5-b6fc-0925c9f17746	Produção da aquicultura - 2014	BI Munis	\N	Produção da aquicultura - 2014	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:46:19.947638+00	2026-04-30 12:42:47.576+00	1777383997019_Producao_da_aquicultura___2014.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
6d458076-e0d4-46f6-b7cd-58103ec637e3	Lavoura Temporária - 2020	BI Munis	\N	Lavoura Temporária - 2020	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:44:35.781247+00	2026-04-30 12:42:53.681+00	1777383892419_Lavoura_Temporaria___2020.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
66b6288b-20bc-4c4b-8e5d-336544479c5e	Lavoura Temporária - 2021	BI Munis	\N	Lavoura Temporária - 2021	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:44:44.126703+00	2026-04-30 12:42:56.538+00	1777383900756_Lavoura_Temporaria___2021.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
380a3ef5-7a96-405c-bff1-1bcdda801f66	CadÚnico faixa de renda familiar	BI Munis	\N	CadÚnico faixa de renda familiar	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:43:23.748881+00	2026-04-30 12:43:34.179+00	1777383820230_CadUnico_faixa_de_renda_familiar.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
db84238a-5f20-4747-9842-e7d9160ed79f	Lavoura Temporária - 2017	BI Munis	\N	Lavoura Temporária - 2017	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:44:09.828556+00	2026-04-30 12:43:37.572+00	1777383866289_Lavoura_Temporaria___2017.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
3fff6946-b930-49e9-9253-7174d62bd442	Lavoura Temporária - 2018	BI Munis	\N	Lavoura Temporária - 2018	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:44:17.600545+00	2026-04-30 12:43:45.66+00	1777383874386_Lavoura_Temporaria___2018.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
70d6822c-7a16-413b-9b21-93759b1e81f2	Lavoura Temporária - 2016	BI Munis	\N	Lavoura Temporária - 2016	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:43:58.978521+00	2026-04-30 12:43:48.7+00	1777383855704_Lavoura_Temporaria___2016.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
2d9f0da3-ebb3-4f2c-92c4-0ccd234fe031	BPC - beneficíarios por sexo	BI Munis	\N	BPC - beneficíarios por sexo	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:43:02.883747+00	2026-04-30 12:43:55.645+00	1777383799708_BPC___beneficiarios_por_sexo.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
e19d5be1-ffee-4159-8ea1-c7a0f339ba79	beneficíarios no PBF	BI Munis	\N	beneficíarios no PBF	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:42:48.882744+00	2026-04-30 12:43:59.373+00	1777383785683_beneficiarios_no_PBF.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
1df0aa20-9135-4d91-9d69-b48c6782f0c4	Norte_exp e imp_2010-2024	BI Munis	\N	Norte_exp e imp_2010-2024	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:37:20.149644+00	2026-04-30 12:44:05.485+00	1777383456948_Norte_exp_e_imp_2010_2024.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
2e8802ba-f15e-41cf-8c81-bd152af620ec	SC_2010-2017-export e import	BI Munis	\N	SC_2010-2017-export e import	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:34:16.806992+00	2026-04-30 12:44:12.046+00	1777383273628_SC_2010_2017_export_e_import.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
50c11cd2-6653-41e1-83b5-c6bd986275fc	RS_2010-2016_export e import	BI Munis	\N	RS_2010-2016_export e import	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:10:51.807399+00	2026-04-30 12:44:15.582+00	1777381868409_RS_2010_2016_export_e_import.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
199af13c-1cd2-4d08-a7c9-f5b6a35e10b4	ES_2010-2024_export e impor	BI Munis	\N	ES_2010-2024_export e impor	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:10:11.342235+00	2026-04-30 12:44:20.551+00	1777381828086_ES_2010_2024_export_e_impor.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
17d43351-931c-4727-9b61-1e3cbae6a381	PR_2010-2016_export e import	BI Munis	\N	PR_2010-2016_export e import	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:10:27.584723+00	2026-04-30 12:45:11.41+00	1777381844431_PR_2010_2016_export_e_import.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
f1f4cb19-2c20-4785-9e34-bce645b04691	SC_2018-2024-export e import	BI Munis	\N	SC_2018-2024-export e import	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:35:24.037074+00	2026-04-30 12:45:18.154+00	1777383340225_SC_2018_2024_export_e_import.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
d61e231b-6783-4c44-ba96-bfe7f367ce48	PE,AL-Exp e Imp-2010 a 2024	BI Munis	\N	PE,AL-Exp e Imp-2010 a 2024	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:36:59.412666+00	2026-04-30 12:45:22.298+00	1777383436320_PE_AL_Exp_e_Imp_2010_a_2024.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
4398b93b-3770-4b14-a9f3-6593f6a92825	Total de pessoas (GPTE) no cadastro único	BI Munis	\N	Total de pessoas (GPTE) no cadastro único	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:42:07.46442+00	2026-04-30 12:45:30.315+00	1777383741823_Total_de_pessoas__GPTE__no_cadastro_unico.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
56d377c5-9a0d-4265-a3bd-f112f9872dd0	Total de pessoas inscritas do CadÚnico	BI Munis	\N	Total de pessoas inscritas do CadÚnico	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:42:22.395258+00	2026-04-30 12:46:43.503+00	1777383757601_Total_de_pessoas_inscritas_do_CadUnico.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
0203bd19-2a03-41e8-8e6e-774ba43ccfe8	SE,BA-Exp e Imp-2010 a 2024	BI Munis	\N	SE,BA-Exp e Imp-2010 a 2024	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:37:07.992665+00	2026-04-30 12:46:49.392+00	1777383445002_SE_BA_Exp_e_Imp_2010_a_2024.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
c0a096cf-eb99-44b2-b31f-70deca791958	CentroO-Exp e Imp-2010 a 2024	BI Munis	\N	CentroO-Exp e Imp-2010 a 2024	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:35:49.468053+00	2026-04-30 12:46:52.104+00	1777383366043_CentroO_Exp_e_Imp_2010_a_2024.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
bfb678f9-070c-464e-8f45-41f8050d30d9	RS_2023-2024_export e import	BI Munis	\N	RS_2023-2024_export e import	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:11:17.438605+00	2026-04-30 12:46:55.952+00	1777381894410_RS_2023_2024_export_e_import.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
84029f76-0344-4ab0-a70c-5ca9ef790c25	SP_2024 export e import	BI Munis	\N	SP_2024 export e import	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:09:55.412699+00	2026-04-30 12:47:03.009+00	1777381812388_SP_2024_export_e_import.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
c816909f-becd-457c-8dd6-11b9cd81be8c	Lavoura Permanente - 2019	BI Munis	\N	Lavoura Permanente - 2019	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:50:33.257737+00	2026-04-30 12:40:35.872+00	1777384249358_Lavoura_Permanente___2019.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
a4a90de9-285d-4cd9-8b14-05f9a6e4dc6a	Produção da aquicultura - 2020	BI Munis	\N	Produção da aquicultura - 2020	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:47:10.792847+00	2026-04-30 12:41:24.003+00	1777384047631_Producao_da_aquicultura___2020.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
40e99b8c-c20f-46a1-afef-acf101e04c9a	Produção da aquicultura - 2023	BI Munis	\N	Produção da aquicultura - 2023	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:47:40.679557+00	2026-04-30 12:41:02.586+00	1777384077673_Producao_da_aquicultura___2023.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
84980fae-0d73-4961-b7ed-ec3ebb439a46	Área municípios	BI Munis	\N	Área municípios	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:54:22.441468+00	2026-04-30 12:35:29.789+00	1777384479600_Area_municipios.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
89f63419-6b28-49a4-8381-e0a23f32c77f	População indígena 2022	BI Munis	\N	População indígena 2022	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:01:04.803552+00	2026-04-30 12:35:02.611+00	1777384881622_Populacao_indigena_2022.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
ee838b8b-6082-4335-bca1-0800540d3179	Migração Líquida 2010 - 3182	BI Munis	\N	Migração Líquida 2010 - 3182	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:00:31.773166+00	2026-04-30 12:35:07.084+00	1777384847277_Migracao_Liquida_2010___3182.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
8ef631c3-403e-491f-b94d-1807e04812f6	População censitária 1970 a 2022	BI Munis	\N	População censitária 1970 a 2022	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:00:54.281107+00	2026-04-30 12:35:17.012+00	1777384871446_Populacao_censitaria_1970_a_2022.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
70d34918-cbd6-4f13-9c1b-7133bbd5a320	Estimativa Pop 2025	BI Munis	\N	Estimativa Pop 2025	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:00:06.925652+00	2026-04-30 12:35:19.541+00	1777384822922_Estimativa_Pop_2025.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
dea5e047-0032-4a82-b650-67053f4bba25	Rota 4 sul	BI Munis	\N	Rota 4 sul	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:53:13.581131+00	2026-04-30 12:35:23.02+00	1777384411082_rota_4_sul.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
dec37904-da3a-4a3a-98e6-16c7b85663c0	Rota 4 Norte	BI Munis	\N	Rota 4 Norte	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:53:21.69307+00	2026-04-30 12:39:11.955+00	1777384419131_Rota_4_Norte.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
7363ab17-0f73-4a0b-a5ae-1104518c2059	Municípios - Rota 4	BI Munis	\N	Municípios - Rota 4	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:53:01.509776+00	2026-04-30 12:39:18.027+00	1777384398978_Municipios___Rota_4.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
198570b5-7692-4d1c-b93a-6c556afa6f86	Rota 2	BI Munis	\N	Rota 2	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:52:44.801003+00	2026-04-30 12:39:25.524+00	1777384382232_Rota_2.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
54d70a83-8db0-41be-8861-3d905052a90a	Lat e long brasil	BI Munis	\N	Lat e long brasil	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:52:04.108444+00	2026-04-30 12:39:31.732+00	1777384340821_Lat_e_long_brasil.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
b34f1b57-6a18-4580-90a8-355283a8d284	Rota 1	BI Munis	\N	Rota 1	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:52:36.398907+00	2026-04-30 12:39:34.332+00	1777384373664_Rota_1.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
15d037bd-71ed-4914-a28d-def1fbd8d3fe	Lavoura Permanente - 2022	BI Munis	\N	Lavoura Permanente - 2022	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:50:59.010203+00	2026-04-30 12:39:40.061+00	1777384275664_Lavoura_Permanente___2022.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
9d072c82-552e-4fbe-8a18-7b1c21fa25dc	Lavoura Permanente - 2020	BI Munis	\N	Lavoura Permanente - 2020	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:50:42.695842+00	2026-04-30 12:40:21.807+00	1777384258895_Lavoura_Permanente___2020.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
9c7b474e-2a30-490b-87b4-b359a4b345bf	Lavoura Permanente - 2015	BI Munis	\N	Lavoura Permanente - 2015	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:49:54.245131+00	2026-04-30 12:40:25.423+00	1777384210811_Lavoura_Permanente___2015.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
6efb09ba-7998-4192-bbf6-5b29817561a2	Efetivo e tipo de rebanho (2013 a 2014)	BI Munis	\N	Efetivo e tipo de rebanho (2013 a 2014)	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:47:53.40545+00	2026-04-30 12:40:32.088+00	1777384090378_efetivo_e_tipo_de_rebanho__2013_a_2014__.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
81317b9e-9dec-4d4c-b1f0-6f30aa2c16ae	Lavoura Permanente - 2016	BI Munis	\N	Lavoura Permanente - 2016	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:50:04.494641+00	2026-04-30 12:40:44.073+00	1777384221020_Lavoura_Permanente___2016.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
1380b379-65b0-4975-ba22-9868bfc3a3bb	Lavoura Permanente - 2018	BI Munis	\N	Lavoura Permanente - 2018	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:50:23.149264+00	2026-04-30 12:40:49.393+00	1777384239246_Lavoura_Permanente___2018.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
39a8f5dd-201e-4e3a-a00a-ea2f7e0bef9a	Lavoura Permanente - 2014	BI Munis	\N	Lavoura Permanente - 2014	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:49:43.990738+00	2026-04-30 12:40:55.953+00	1777384200562_Lavoura_Permanente___2014.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
7497d511-4466-4189-8344-963313037c07	Produção da aquicultura - 2018	BI Munis	\N	Produção da aquicultura - 2018	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:46:53.089887+00	2026-04-30 12:41:07.098+00	1777384029973_Producao_da_aquicultura___2018.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
714f61f8-97f7-4fdc-92be-8a8735196f11	Produção da aquicultura - 2021	BI Munis	\N	Produção da aquicultura - 2021	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:47:20.77135+00	2026-04-30 12:41:09.907+00	1777384057704_Producao_da_aquicultura___2021.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
6e636dae-f341-47a3-a5b3-3e8f0d82c3ce	Efetivo e tipo de rebanho (2015 a 2017)	BI Munis	\N	Efetivo e tipo de rebanho (2015 a 2017)	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:48:13.572636+00	2026-04-30 12:41:20.947+00	1777384110564_efetivo_e_tipo_de_rebanho__2015_a_2017_.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
1bc7b862-4693-4da5-9fa5-742ce3cc283e	Produção da aquicultura - 2017	BI Munis	\N	Produção da aquicultura - 2017	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:46:44.765661+00	2026-04-30 12:42:17.807+00	1777384021781_Producao_da_aquicultura___2017.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
cc56def9-8f83-4f57-8f4a-0ea6721c2aa6	Produção da aquicultura - 2016	BI Munis	\N	Produção da aquicultura - 2016	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:46:36.816639+00	2026-04-30 12:42:21.127+00	1777384013788_Producao_da_aquicultura___2016.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
23833acf-a195-487b-9359-e7a94fd60fb0	Manual de Gateway Local	Manuais Técnicos	\N	Manual de Gateway Local	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:15:52.250386+00	2026-04-28 14:17:53.909+00	1777385873131_Manual_de_Gateway_Local.docx	publico	\N	\N	\N	f	\N	\N
8ed9c59f-7750-4113-842d-03e550292df0	Manual Formula do Íncide	Manuais Técnicos	\N	Manual Formula do Íncide	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:16:24.445679+00	2026-04-28 14:18:15.066+00	1777385894244_Manual_Formula_do_Incide.png	publico	\N	\N	\N	f	\N	\N
145a788f-b635-4ab6-8a9b-7a1f2515a0d7	Manual Power Automate	Manuais Técnicos	\N	Manual Power Automate	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:16:33.533912+00	2026-04-28 14:18:42.516+00	1777385921766_Manual_Power_Automate.docx	publico	\N	\N	\N	f	\N	\N
f1dae551-e0d2-4dcc-8bb3-66c4e928db4b	Manual atualização Painel Pessoas	Manuais Técnicos	\N	Manual atualização Painel Pessoas	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:16:47.195658+00	2026-04-28 14:18:53.537+00	1777385932743_Manual_atualizacao_Painel_Pessoas.docx	publico	\N	\N	\N	f	\N	\N
f89c66d6-f0c8-491a-a406-8da54aab0b23	Template PFE	PFE	\N	Template PFE	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:19:18.627308+00	2026-04-28 14:20:01.066+00	1777386000292_Template_PFE.pbix	publico	\N	\N	\N	f	\N	\N
da4284ba-9e8c-41a4-b955-5d4303328879	Balancete - Órgão Superior 470000 	Contabilidade	\N	Balancete - Órgão Superior 470000	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:20:03.94073+00	2026-04-28 14:20:03.94073+00	1777386020606_Balancete___Orgao_Superior_470000_.xlsx	publico	\N	\N	\N	f	\N	\N
44f81ec8-ff3f-4d7d-ba65-64510a840e26	Custos por Itens de Custos - por Órgão	Contabilidade	\N	Custos por Itens de Custos - por Órgão	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:20:19.726254+00	2026-04-28 14:20:19.726254+00	1777386037071_Custos_por_Itens_de_Custos___por_Orgao.xlsx	publico	\N	\N	\N	f	\N	\N
cc4d4a7f-5f05-42a8-a2a3-273338a415ac	Dirigentes	Contabilidade	\N	Dirigentes	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:20:30.393522+00	2026-04-28 14:20:30.393522+00	1777386047632_Dirigentes.pbix	publico	\N	\N	\N	f	\N	\N
893de4d6-ecbf-4873-9b23-d36d0fd2fe30	Template	Contabilidade	\N	Template	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:20:46.61324+00	2026-04-28 14:20:46.61324+00	1777386062993_Template.pbix	publico	\N	\N	\N	f	\N	\N
37cdbddd-30df-4381-a793-8ed7b2aa5dc0	Controle demandas layout versão1	Logística e Contratações	\N	Controle demandas layout_vs1	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:21:23.618735+00	2026-04-28 14:21:23.618735+00	1777386100620_Controle_demandas_layout_versao1.pbix	publico	\N	\N	\N	f	\N	\N
f77184d2-e9a4-48c8-b08d-2915b48720c9	Templater cabeçalho Servidores	Pessoas	\N	Templater cabeçalho Servidores	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:22:44.16044+00	2026-04-28 14:22:44.16044+00	1777386181306_Templater_cabecalho_Servidores.xlsx	publico	\N	\N	\N	f	\N	\N
2d33db98-6345-4adb-9592-88861f3b6b50	Geral Servidores até Jun2024	Pessoas	\N	Geral Servidores até Jun2024	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:23:06.178946+00	2026-04-28 14:23:06.178946+00	1777386203316_Geral_Servidores_ate_Jun2024.xlsx	publico	\N	\N	\N	f	\N	\N
6375a80f-561c-443f-9582-964a9ffc2b23	Servidores 202407	Pessoas	\N	Servidores 202407	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:23:18.82464+00	2026-04-28 14:23:18.82464+00	1777386216133_Servidores_202407.xlsx	publico	\N	\N	\N	f	\N	\N
64c8ec5b-ddae-4da5-bc88-e7d41f4fcd00	Servidores 202408	Pessoas	\N	Servidores 202408	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:23:32.98196+00	2026-04-28 14:23:32.98196+00	1777386230166_Servidores_202408.xlsx	publico	\N	\N	\N	f	\N	\N
89f2ce5a-05d3-4bda-8ab4-5c826e9fb786	Pessoas atualizado 2025 ant	Pessoas		Pessoas atualizado 2025 ant	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:24:54.651881+00	2026-05-07 11:38:03.678+00	1777386311205_Pessoas_atualizado_2025_ant.pbix	publico			https://app.powerbi.com/view?r=eyJrIjoiZTA4YjZmNjItYjU3NS00ZWNiLTgyOTYtYTNmMGNiODAyMGE4IiwidCI6IjQ1NjIxM2NmLTcwNzMtNDdjNi1iZjQ5LTQxYjY1NGFkNDQ5YiJ9	f		\N
8eed0b9f-77e4-48eb-a76e-b52308743b50	Pessoas atualizado 2025	Pessoas		Pessoas atualizado 2025	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:24:37.684392+00	2026-05-06 14:38:34.631+00	1777386294579_Pessoas_atualizado_2025.pbix	publico			https://app.powerbi.com/view?r=eyJrIjoiZTA4YjZmNjItYjU3NS00ZWNiLTgyOTYtYTNmMGNiODAyMGE4IiwidCI6IjQ1NjIxM2NmLTcwNzMtNDdjNi1iZjQ5LTQxYjY1NGFkNDQ5YiJ9	f		\N
edb92dac-4d51-4b76-bf73-9866975eea17	Pessoas novo	Pessoas	\N	Pessoas novo	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:26:33.642195+00	2026-04-28 14:26:33.642195+00	1777386410459_Pessoas_novo.pbix	publico	\N	\N	\N	f	\N	\N
4871552c-fbde-4807-9264-92eb722b386f	Pessoas novo versão1	Pessoas	\N	Pessoas novo vs1	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:27:16.685047+00	2026-04-28 14:27:16.685047+00	1777386452599_Pessoas_novo_versao1.pbix	publico	\N	\N	\N	f	\N	\N
6e6eb3a6-e34f-4323-ad6a-129faf096b32	Pessoas novo versão2	Pessoas	\N	Pessoas novo vs2	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:27:38.008445+00	2026-04-28 14:27:38.008445+00	1777386475265_Pessoas_novo_versao2.pbix	publico	\N	\N	\N	f	\N	\N
3b7de656-8192-40bb-9856-d6c432a76719	Tela BI Gestão Pessoas	Pessoas		Tela BI Gestão Pessoas 2024	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:22:07.921245+00	2026-05-06 14:37:05.531+00	1777386145159_Tela_BI_Gestao_Pessoas.PNG	publico				f		\N
b22e601a-4bd3-4cbd-a1bc-6c09d54c3a35	Pessoas atualizado 2026	Pessoas		Pessoas atualizado 2026	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:25:17.00071+00	2026-05-06 14:37:16.619+00	1777386391394_Pessoas_atualizado_2026.pbix	publico			https://app.powerbi.com/view?r=eyJrIjoiZTA4YjZmNjItYjU3NS00ZWNiLTgyOTYtYTNmMGNiODAyMGE4IiwidCI6IjQ1NjIxM2NmLTcwNzMtNDdjNi1iZjQ5LTQxYjY1NGFkNDQ5YiJ9	f		\N
cdc04e6c-5c9c-448f-b24c-82627f21e8a2	Matrícula de Alunos	BI Munis		Matrícula de Alunos	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:04:09.585878+00	2026-05-07 13:51:19.086+00	1777385066653_Matricula_de_Alunos.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		1778161878119_Matricula_de_Alunos_preview.png
34d47b5b-5ca5-48a9-84d7-f9415da72e49	Quantitativo de Professores	BI Munis	\N	Quantitativo de Professores	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:04:34.914236+00	2026-04-30 12:33:50.559+00	1777385091014_Quantitativo_de_Professores.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
bfd0ec22-8c6a-4e51-8040-a99b37abbb0a	Alunos no ensino superior	BI Munis		Alunos no ensino superior	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:04:00.960164+00	2026-05-07 13:51:28.896+00	1777385057836_Alunos_no_ensino_superior.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		1778161888080_Alunos_no_ensino_superior_preview.png
27595fba-c727-4d3f-8868-b7fa1a250d0c	Pirâmide etária IBGE 1991	BI Munis	\N	Pirâmide etária IBGE 1991	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:02:14.481871+00	2026-04-30 12:34:29.393+00	1777384951268_Piramide_etaria_IBGE_1991.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
ca95697d-5590-4da4-a45b-8c58c7874843	Pirâmide etária IBGE 2010	BI Munis	\N	Pirâmide etária IBGE 2010	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:01:54.640544+00	2026-04-30 12:34:40.258+00	1777384931338_Piramide_etaria_IBGE_2010.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
bcdeddf6-211f-43a7-a638-577a1ad10d64	Pessoas	Pessoas		Pessoas	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:24:04.222061+00	2026-05-06 14:38:45.432+00	1777386381169_Pessoas.pbix	publico			https://app.powerbi.com/view?r=eyJrIjoiZTA4YjZmNjItYjU3NS00ZWNiLTgyOTYtYTNmMGNiODAyMGE4IiwidCI6IjQ1NjIxM2NmLTcwNzMtNDdjNi1iZjQ5LTQxYjY1NGFkNDQ5YiJ9	f		\N
f4a453b4-4b08-4fd1-95dd-de646f2642c6	TDI MUNICIPIOS 2025	BI Munis		TDI MUNICIPIOS 2025	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:11:40.601658+00	2026-05-07 13:50:59.637+00	1777385515919_TDI_MUNICIPIOS_2025.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		1778161858665_TDI_MUNICIPIOS_2025_preview.png
620c5056-cfe4-4a2c-a8da-4ac2ef0d52d6	Pessoas novo versão 3	Pessoas	\N	Pessoas novo vrs 3	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:28:04.813221+00	2026-04-28 14:28:04.813221+00	1777386501779_Pessoas_novo_versao_3.pbix	publico	\N	\N	\N	f	\N	\N
4cd6c884-b1c8-4fc2-9c30-d45d9cd4fd19	Pessoas novo versão 4	Pessoas	\N	Pessoas novo vs4	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:28:30.024641+00	2026-04-28 14:28:30.024641+00	1777386527037_Pessoas_novo_versao_4.pbix	publico	\N	\N	\N	f	\N	\N
6c540f27-01f5-43d6-985a-af334e322144	Pessoas versão 4 old	Pessoas	\N	Pessoas vs4 old	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:29:02.251964+00	2026-04-28 14:29:02.251964+00	1777386559447_Pessoas_versao_4_old.pbix	publico	\N	\N	\N	f	\N	\N
4d255498-292c-45e3-8b2d-5a78d4b90616	Pessoas versão 4 teste	Pessoas	\N	Pessoas versão 4 teste	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:29:21.433473+00	2026-04-28 14:29:21.433473+00	1777386578648_Pessoas_versao_4_teste.pbix	publico	\N	\N	\N	f	\N	\N
b2e805b8-edb5-44e2-ab92-c5c89847ca8e	PGD MPO	Pessoas	\N	PGD MPO	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:29:37.705236+00	2026-04-28 14:29:37.705236+00	1777386595042_PGD_MPO.pbix	publico	\N	\N	\N	f	\N	\N
04f68261-9907-4ae1-a047-6fa3c9257e9d	PGD MPO 251205	Pessoas	\N	PGD MPO 251205	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:29:51.278168+00	2026-04-28 14:29:51.278168+00	1777386608603_PGD_MPO_251205.pbix	publico	\N	\N	\N	f	\N	\N
6f6f391b-93ac-4f57-9b1e-4cba58ed7b6e	PGD MPO versão 1.0	Pessoas	\N	PGD MPO_vs1.0	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:30:20.423444+00	2026-04-28 14:30:20.423444+00	1777386637621_PGD_MPO_versao_1_0.pbix	publico	\N	\N	\N	f	\N	\N
92ec29e5-8701-40d0-85ee-012f7c7b8622	PGD MPO versão 1.2	Pessoas	\N	PGD MPO vs1.2	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:30:52.543332+00	2026-04-28 14:30:52.543332+00	1777386669807_PGD_MPO_versao_1_2.pbix	publico	\N	\N	\N	f	\N	\N
3bb34a27-41dc-4df3-abed-4551991780f3	Controle de servidores em PGD - out 2024	Pessoas	\N	Controle de servidores em PGD - out 2024	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:31:05.054532+00	2026-04-28 14:31:05.054532+00	1777386682425_Controle_de_servidores_em_PGD___out_2024.xlsx	publico	\N	\N	\N	f	\N	\N
f0e44ac3-d371-41ab-8f6a-7d3723e3698b	Controle servidores em PGD - ago 2024	Pessoas	\N	Controle servidores em PGD - ago 2024	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:31:14.240264+00	2026-04-28 14:31:14.240264+00	1777386691601_Controle_servidores_em_PGD___ago_2024.xlsx	publico	\N	\N	\N	f	\N	\N
c0e1fe83-ea4c-4228-b382-37c3c28da2ce	PGD MPO versão 1.1	Pessoas	\N	PGD MPO versão 1.1	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:30:30.269739+00	2026-04-28 14:31:50.734+00	1777386709834_PGD_MPO_versao_1_1.pbix	publico	\N	\N	\N	f	\N	\N
b43f3a90-c517-45ac-a2af-d05016880d31	Planilha PGD SECRETARIAS MPO - Junho 2025	Pessoas	\N	Planilha PGD SECRETARIAS MPO - Junho 2025	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:31:56.354438+00	2026-04-28 14:32:26.419+00	1777386745717_Planilha_PGD_SECRETARIAS_MPO___Junho_2025.xlsx	publico	\N	\N	\N	f	\N	\N
b6b7dbc1-79cb-4fe8-9ac3-3892fb4e8f51	Planilha PGD SECRETARIAS MPO - Outubro 2025	Pessoas	\N	Planilha PGD SECRETARIAS MPO - Outubro 2025	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:32:26.104257+00	2026-04-28 14:32:26.104257+00	1777386763431_Planilha_PGD_SECRETARIAS_MPO___Outubro_2025.xlsx	publico	\N	\N	\N	f	\N	\N
ada0c2b4-4038-4e1d-bc3b-5b73e027d33b	Painel Qualidade de Vida e Desenvolvimento - antigo	Pessoas	\N	Painel Qualidade de Vida e Desenvolvimento - antigo	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:32:42.208548+00	2026-04-28 14:32:42.208548+00	1777386779336_Painel_Qualidade_de_Vida_e_Desenvolvimento___antigo.pbix	publico	\N	\N	\N	f	\N	\N
bf2de4bd-c279-4bff-a108-ba0132d25b25	Qualidade de Vida	Pessoas		Qualidade de Vida	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:33:09.614685+00	2026-05-07 11:33:41.311+00	1777386806994_Qualidade_de_Vida.pbix	publico			https://app.powerbi.com/view?r=eyJrIjoiZWNlOWE4OWUtZjc5OS00MDJlLWE1ODgtZjNhZmQ4ZGFjMzY5IiwidCI6IjQ1NjIxM2NmLTcwNzMtNDdjNi1iZjQ5LTQxYjY1NGFkNDQ5YiJ9	f		\N
65eb7f6b-5056-4bf7-9d5b-a7f5b2c8f1a9	Relatório da Gestão Orçamentária e Financeira 1º trimestre 2025	Orçamento e Finanças		Relatório 1º trimestre da Gestão Orçamentária e Financeira 	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:42:41.012885+00	2026-05-07 11:41:24.434+00	1777387377837_Relatorio_1__trimestre_.pbix	publico				f		\N
be416de1-bfd5-49cd-922e-4f48d8ff1b96	Relatório Gestão 2025 (Planilha BASE)	Orçamento e Finanças	\N	Relatório Gestão 2025 (Planilha BASE)	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:41:12.435414+00	2026-04-28 14:41:43.61+00	1777387302144_Relatorio_Gestao_2025__Planilha_BASE_.xlsx	publico	\N	\N	\N	f	\N	\N
881a462a-b82c-4a5d-b02b-17d8c6c38956	Qualidade de Vida novo versão1	Pessoas		Qualidade de Vida novo_versão1	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:33:49.413154+00	2026-05-07 11:33:32.671+00	1777386890600_Qualidade_de_Vida_novo_versao1.pbix	publico			https://app.powerbi.com/view?r=eyJrIjoiZWNlOWE4OWUtZjc5OS00MDJlLWE1ODgtZjNhZmQ4ZGFjMzY5IiwidCI6IjQ1NjIxM2NmLTcwNzMtNDdjNi1iZjQ5LTQxYjY1NGFkNDQ5YiJ9	f		\N
62856950-a4a1-48da-bf4e-cb55689faa78	Configuração gateway Painel BI Planner 20241008	TIC	\N	Configuração gateway Painel BI Planner 20241008	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:37:04.128796+00	2026-04-28 14:37:04.128796+00	1777387041676_Configuracao_gateway_Painel_BI_Planner_20241008.PNG	publico	\N	\N	\N	f	\N	\N
3b0173d4-49b1-45b2-862e-eaf1d3790332	Entregas Planner	TIC	\N	Entregas Planner	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:37:35.434166+00	2026-04-28 14:37:35.434166+00	1777387072198_Entregas_Planner.pbix	publico	\N	\N	\N	f	\N	\N
5961bd20-2472-4830-8b53-63d19e0bce90	Entregas Planner versão 1	TIC	\N	Entregas Planner_versão1	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:38:03.146684+00	2026-04-28 14:38:03.146684+00	1777387100504_Entregas_Planner_versao_1.pbix	publico	\N	\N	\N	f	\N	\N
3aed0540-e4a3-4de3-8808-85c19dfc6e06	Entregas Planner versão 3	TIC	\N	Entregas Planner versão 3	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:38:36.85756+00	2026-04-28 14:38:36.85756+00	1777387133715_Entregas_Planner_versao_3.pbix	publico	\N	\N	\N	f	\N	\N
0bf13c10-eb07-40b8-981b-411d19c2f63d	Entregas Planner versão 2	TIC	\N	Entregas Planner versão 2	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:38:19.183496+00	2026-04-28 14:39:03.894+00	1777387142852_Entregas_Planner_versao_2.pbix	publico	\N	\N	\N	f	\N	\N
9dc35659-8b43-4c26-86e8-a83f4914725f	Entregas Planner-AnderDavi	TIC	\N	Entregas Planner-AnderDavi	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:38:59.375063+00	2026-04-28 14:38:59.375063+00	1777387155869_Entregas_Planner_AnderDavi.pbix	publico	\N	\N	\N	f	\N	\N
a2925bc2-1ea9-4cef-8585-bec0cd3f255a	Historico atualização Painel BI Planner 20241008	TIC	\N	Historico atualização Painel BI Planner 20241008	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:39:19.281682+00	2026-04-28 14:39:19.281682+00	1777387176462_Historico_atualizacao_Painel_BI_Planner_20241008.PNG	publico	\N	\N	\N	f	\N	\N
c861c172-5b93-4ec9-82f3-1a6c5d34f0d0	Painel Controle de Demandas COTIC - Planner	TIC	\N	Painel Controle de Demandas COTIC - Planner	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:39:37.25744+00	2026-04-28 14:40:10.783+00	1777387209776_Painel_Controle_de_Demandas_COTIC___Planner.pbix	publico	\N	\N	\N	f	\N	\N
b985203e-fdcb-442a-8b69-5ddb8d1ef4fb	Relatório 2º trimestre 	Orçamento e Finanças	\N	Relatório 2º trimestre 	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:44:24.590809+00	2026-04-28 14:44:24.590809+00	1777387481678_Relatorio_2__trimestre_.pbix	publico	\N	\N	\N	f	\N	\N
ddb6a346-4602-4371-b40a-8cf2c47cc960	Relatório 3º trimestre consolidado 	Orçamento e Finanças	\N	Relatório 3º trimestre consolidado 	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:45:06.059176+00	2026-04-28 14:45:06.059176+00	1777387522744_Relatorio_3__trimestre_consolidado_.pbix	publico	\N	\N	\N	f	\N	\N
3499d123-e961-457f-8eeb-1b3749ba2aaa	Tabelas TG versão 1 	Orçamento e Finanças	\N	Tabelas TG versão1	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:45:22.652032+00	2026-04-28 14:47:33.329+00	1777387652235_Tabelas_TG_versao_1_.pbix	publico	\N	\N	\N	f	\N	\N
ec5c4ea3-b90f-49ae-8def-ce918661384b	Tabelas TG versão 2	Orçamento e Finanças	\N	Tabelas TG versão 2	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:47:30.46356+00	2026-04-28 14:47:30.46356+00	1777387667699_Tabelas_TG_versao_2.pbix	publico	\N	\N	\N	f	\N	\N
3e91f112-46df-43e8-8581-bc5a30a680b7	SCDP SEAID	Orçamento e Finanças	\N	SCDP SEAID	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:47:47.211277+00	2026-04-28 14:47:47.211277+00	1777387684645_SCDP_SEAID.pdf	publico	\N	\N	\N	f	\N	\N
a8356196-06c3-4f27-9a4e-58b086d3d2e3	SCDP SEPLAN	Orçamento e Finanças	\N	SCDP SEPLAN	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:47:54.8404+00	2026-04-28 14:48:21.836+00	1777387701134_SCDP_SEPLAN.pdf	publico	\N	\N	\N	f	\N	\N
ac43e261-12c5-4feb-becb-b465723c860c	SCDP SMA	Orçamento e Finanças	\N	SCDP SMA	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:48:14.306553+00	2026-04-28 14:48:14.306553+00	1777387711711_SCDP_SMA.pdf	publico	\N	\N	\N	f	\N	\N
39f51877-8022-4076-be21-dda353c91c6e	SCDP SOF	Orçamento e Finanças	\N	SCDP SOF	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:48:23.90395+00	2026-04-28 14:48:23.90395+00	1777387721216_SCDP_SOF.pdf	publico	\N	\N	\N	f	\N	\N
bf8a6704-e9d5-4fdc-ba9d-b3a2dd26983a	Portaria DOU	Orçamento e Finanças	\N	Portaria DOU	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:48:35.406725+00	2026-04-28 14:49:02.887+00	1777387742145_Portaria_DOU.pdf	publico	\N	\N	\N	f	\N	\N
46020010-15b8-42aa-84fc-aee1779a6b48	SCDP GM	Orçamento e Finanças	\N	SCDP GM	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:48:55.96206+00	2026-04-28 14:48:55.96206+00	1777387753306_SCDP_GM.pdf	publico	\N	\N	\N	f	\N	\N
f7d539f8-5537-4c5f-9ab8-26f5036dffaf	SCDP SE	Orçamento e Finanças	\N	SCDP SE	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:49:06.256519+00	2026-04-28 14:49:06.256519+00	1777387763667_SCDP_SE.pdf	publico	\N	\N	\N	f	\N	\N
6bd0eeba-0630-48d4-9fd7-7c6d4bba0f23	GOF - backup MAR25TESTE1	Orçamento e Finanças	\N	GOF - backup MAR25TESTE1	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:49:24.571229+00	2026-04-28 14:49:24.571229+00	1777387781388_GOF___backup_MAR25TESTE1.pbix	publico	\N	\N	\N	f	\N	\N
919b8104-7394-45ef-8a62-71f700705dd2	GOF - TG Viagens 2025 - 1º Trimestre 	Orçamento e Finanças	\N	GOF - TG Viagens 2025 - 1º Trimestre 	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:49:49.862791+00	2026-04-28 14:49:49.862791+00	1777387807287_GOF___TG_Viagens_2025___1__Trimestre_.pbix	publico	\N	\N	\N	f	\N	\N
35e50cf7-f7a7-4a6a-80cc-9f90c748d7f8	SCDP SEAI	Orçamento e Finanças	\N	SCDP SEAI	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:49:13.117384+00	2026-04-28 14:50:27.023+00	1777387826384_SCDP_SEAI.pdf	publico	\N	\N	\N	f	\N	\N
cb3105c9-97d3-47ae-80a1-ef0a7cb3d617	Orçamento versão 1	Orçamento e Finanças	\N	Orçamento versão 1	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:52:48.280857+00	2026-04-28 14:52:48.280857+00	1777387985172_Orcamento_versao_1.pbix	publico	\N	\N	\N	f	\N	\N
05541630-6a15-4842-9833-1c80d36ddf84	Orçamento versão 2	Orçamento e Finanças	\N	Orçamento versão 2	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:53:03.058885+00	2026-04-28 14:53:03.058885+00	1777388000413_Orcamento_versao_2.pbix	publico	\N	\N	\N	f	\N	\N
6870b392-ed9c-4e8d-86bb-75ad4e28fb1c	SIOP	Orçamento e Finanças	\N	SIOP	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:53:16.144054+00	2026-04-28 14:53:16.144054+00	1777388013558_SIOP.pbix	publico	\N	\N	\N	f	\N	\N
9eb74ddf-e14c-4072-baa5-ec6074bc5447	Tabelas TG versão old1	Orçamento e Finanças	\N	Tabelas TG versão old1	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:53:39.737897+00	2026-04-28 14:53:39.737897+00	1777388036968_Tabelas_TG_versao_old1.pbix	publico	\N	\N	\N	f	\N	\N
b295f74d-25ba-491a-945c-ae011cca1f7f	Exec Orç e Fin 2025 (BASE)	Orçamento e Finanças	\N	Exec Orç e Fin 2025 (BASE)	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:53:53.047572+00	2026-04-28 14:53:53.047572+00	1777388050289_Exec_Orc_e_Fin_2025__BASE_.xlsx	publico	\N	\N	\N	f	\N	\N
6066509f-b22d-4efd-8e06-c00e83263b67	Execução Orç. e Fin. 2025 MPO - LOA (Dist. Limite) DEFINITIVO	Orçamento e Finanças	\N	Execução Orç. e Fin. 2025 MPO - LOA (Dist. Limite) DEFINITIVO	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:54:09.278259+00	2026-04-28 14:54:09.278259+00	1777388066514_Execucao_Orc__e_Fin__2025_MPO___LOA__Dist__Limite__DEFINITIVO.xlsm	publico	\N	\N	\N	f	\N	\N
544fc229-0f4a-4224-9cfb-5ac4d37042a1	Limite Saque MPO Origem (BASE)	Orçamento e Finanças	\N	Limite Saque MPO Origem (BASE)	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:54:26.06575+00	2026-04-28 14:54:26.06575+00	1777388083731_Limite_Saque_MPO_Origem__BASE_.xlsx	publico	\N	\N	\N	f	\N	\N
5ba5b2a7-0268-42f0-8a50-3c22218c3a8f	Tabela Base TG Orçamento linhas fixas_08042025 	Orçamento e Finanças	\N	Tabela Base TG Orçamento linhas fixas_08042025 	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:54:58.933737+00	2026-04-28 14:55:27.666+00	1777388126727_Tabela_Base_TG_Orcamento_linhas_fixas_08042025_.xlsx	publico	\N	\N	\N	f	\N	\N
2713813a-5c6a-41e4-8420-0cdb9a39ee2f	Painel do Planner CGTCO 	Painel do Planner CGTCO	\N	Painel do Planner CGTCO 	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-30 11:28:36.673874+00	2026-04-30 11:28:36.673874+00	1777548538322_Painel_do_Planner_CGTCO_.xlsx	publico				f		\N
907da38c-3373-4a93-84a5-05b7c677f07d	Relatório 3º trimestre 2025 versão 1	Orçamento e Finanças	\N	Relatório 3º trimestre 2025 versão 1	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:44:38.133858+00	2026-04-30 11:37:19.523+00	1777549037385_Relatorio_3__trimestre_2025_versao_1.pbix	publico				f		\N
4c715494-c024-4fc5-b5ea-657927e0fafe	Relatório 2º trimestre ajustado 	Orçamento e Finanças	\N	Relatório 2º trimestre ajustado 	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-30 11:38:40.466244+00	2026-04-30 11:38:40.466244+00	1777549141928_Relatorio_2__trimestre_ajustado_.pbix	publico				f		\N
dfc6f66f-f1b7-436e-8544-769c367d050d	Congresso Nacional 	Congresso/Senado/Câmara	\N	Congresso Nacional 	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-30 11:48:10.770992+00	2026-04-30 11:48:10.770992+00	1777549712604_Congresso_Nacional_.pbix	publico				f		\N
a250a065-e2a4-4cca-9b43-2a3fe10f76c6	Diário Oficial da União 22/04/2026	Congresso/Senado/Câmara	\N	Diário Oficial da União 22/04/2026	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-30 11:50:34.397964+00	2026-04-30 11:50:34.397964+00	1777549855613_Diario_Oficial_da_Uniao_22_04_2026.pdf	publico				f		\N
01fe4672-d320-419b-8f02-d5b60033c10d	Pop_censo_(1970-2010) p_atualizar	BI Munis	\N	Pop_censo_(1970-2010) p_atualizar	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:01:41.23974+00	2026-04-30 12:34:35.642+00	1777384916673_Pop_censo__1970_2010__p_atualizar.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
48f011e8-d575-4399-bcca-242ad5e09b7c	Pop_censo_(2022) p_atualizar	BI Munis	\N	Pop_censo_(2022) p_atualizar	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:01:31.016429+00	2026-04-30 12:34:49.523+00	1777384907673_Pop_censo__2022__p_atualizar.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
2b6f7847-991a-474b-a7df-bac59c7372a3	Quilombolas por município 2022	BI Munis	\N	Quilombolas por município 2022	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:01:12.593433+00	2026-04-30 12:34:56.587+00	1777384889735_Quilombolas_por_municipio_2022.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
392eac02-08ae-4f27-90a6-129dd637a5a0	Migração Líquida 2022 - 3182	BI Munis	\N	Migração Líquida 2022 - 3182	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:00:43.779715+00	2026-04-30 12:35:12.676+00	1777384859230_Migracao_Liquida_2022___3182.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
c37a8237-4b90-45a2-ab6a-08089a4f4937	Pessoas com nível superior 2022	BI Munis	\N	Pessoas com nível superior 2022	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:54:12.88069+00	2026-04-30 12:35:26.013+00	1777384469239_Pessoas_com_nivel_superior_2022.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
fd572b22-79e5-4827-9c98-fa742f5d2bb3	Rota 5	BI Munis	\N	Rota 5	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:53:39.958451+00	2026-04-30 12:39:14.691+00	1777384437428_Rota_5.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
d9dd3328-6174-489b-87a1-aefb6f4b8567	Rota 3	BI Munis	\N	Rota 3	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:52:53.521779+00	2026-04-30 12:39:22.54+00	1777384390921_Rota_3.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
a2e2e877-a5c6-4468-932a-6bd443933e7b	Quantitativo de Escolas	BI Munis		Quantitativo de Escolas	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:04:25.817218+00	2026-05-07 13:49:24.826+00	1777385082862_Quantitativo_de_Escolas.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		1778161763590_Quantitativo_de_Escolas_preview.png
69b5457f-dd3a-42ee-838c-58e427d5450e	H Pirâmide etária IBGE 2022	BI Munis		H Pirâmide etária IBGE 2022	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:03:15.238363+00	2026-05-07 13:51:11.4+00	1777385011801_H_Piramide_etaria_IBGE_2022.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		1778161870592_H_Piramide_etaria_IBGE_2022_preview.png
e737907e-5775-4d52-bcc4-a50c165a25dc	DOU	Congresso/Senado/Câmara	\N	DOU \n	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-30 11:47:40.012476+00	2026-05-27 14:20:39.58+00	1777549681778_DOU.docx	publico				f		\N
d8406b04-05cf-4c37-8e55-f956c1c571dd	Sedes IBGE	BI Munis	\N	Sedes IBGE	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:51:54.254798+00	2026-04-30 12:39:28.308+00	1777384330445_Sedes_IBGE.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
b2cd78d7-bf9c-460e-8fcb-998808276534	Lavoura Permanente - 2021	BI Munis	\N	Lavoura Permanente - 2021	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:50:51.361558+00	2026-04-30 12:39:37.444+00	1777384267640_Lavoura_Permanente___2021.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
f53baff6-7752-4ce6-a2ab-acf068f5c62b	Lavoura Permanente - 2023	BI Munis	\N	Lavoura Permanente - 2023	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:51:07.803811+00	2026-04-30 12:39:43.429+00	1777384284385_Lavoura_Permanente___2023.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
4a2b1923-45ad-4edb-ae59-3e8b1be6e0cd	Efetivo e tipo de rebanho (2021 a 2023)	BI Munis	\N	Efetivo e tipo de rebanho (2021 a 2023)	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:49:19.240019+00	2026-04-30 12:40:28.856+00	1777384176265_Efetivo_e_tipo_de_rebanho__2021_a_2023_.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
d068fd44-0965-4584-84f1-225e118523ea	Lavoura Permanente - 2017	BI Munis	\N	Lavoura Permanente - 2017	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:50:13.171404+00	2026-04-30 12:40:39.945+00	1777384229773_Lavoura_Permanente___2017.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
2ded4485-f541-4407-85c7-24c6d561df5a	Lavoura Permanente - 2013	BI Munis	\N	Lavoura Permanente - 2013	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:49:36.086897+00	2026-04-30 12:40:52.553+00	1777384192730_Lavoura_Permanente___2013.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
4d98e0e4-cf5b-4c77-aa3d-35f99e22e0ac	Efetivo e tipo de rebanho (2018 a 2020)	BI Munis	\N	Efetivo e tipo de rebanho (2018 a 2020)	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:48:23.786238+00	2026-04-30 12:40:59.298+00	1777384120388_efetivo_e_tipo_de_rebanho__2018_a_2020_.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
b5843a18-61a2-4ed5-942b-3fe4642e967c	Produção da aquicultura - 2022	BI Munis	\N	Produção da aquicultura - 2022	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:47:29.968699+00	2026-04-30 12:41:14.027+00	1777384066504_Producao_da_aquicultura___2022.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
41616ef5-9745-4489-8dc7-c7678b7a0d51	Produção da aquicultura - 2019	BI Munis	\N	Produção da aquicultura - 2019	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:47:02.207756+00	2026-04-30 12:42:10.246+00	1777384038806_Producao_da_aquicultura___2019.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
0bbd43f8-c2d0-46a2-b045-3dbd248a9c8f	P. de origem animal	BI Munis	\N	P. de origem animal	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:45:50.419805+00	2026-04-30 12:42:24.391+00	1777383966833_P__de_origem_animal.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
e767f69d-1cd5-4129-890b-03e9c623ee05	Lavoura Temporária - 2023	BI Munis	\N	Lavoura Temporária - 2023	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:45:02.487141+00	2026-04-30 12:42:28.551+00	1777383918765_Lavoura_Temporaria___2023.xlsb	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
592846ef-085b-4fb6-957f-bf5c271b5cd6	Produção da aquicultura - 2013	BI Munis	\N	Produção da aquicultura - 2013	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:46:10.904245+00	2026-04-30 12:42:40.408+00	1777383987890_Producao_da_aquicultura___2013.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
59409574-cab1-478b-87d7-72608f22c73b	Lavoura Temporária - 2022	BI Munis	\N	Lavoura Temporária - 2022	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:44:53.322129+00	2026-04-30 12:42:50.913+00	1777383909716_Lavoura_Temporaria___2022.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
9f05bba3-de8a-45e8-8f62-5d08a538b684	Lavoura Temporária - 2019	BI Munis	\N	Lavoura Temporária - 2019	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:44:26.965904+00	2026-04-30 12:43:30.187+00	1777383883466_Lavoura_Temporaria___2019.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
ee17c37b-de6a-44f9-a9c6-b7874c71e553	Lavoura Temporária - 2015	BI Munis	\N	Lavoura Temporária - 2015	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:43:50.988131+00	2026-04-30 12:43:41.604+00	1777383847335_Lavoura_Temporaria___2015.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
c5dc9265-5c01-4911-8146-0a0451a5220f	benefíciarios do Auxílio Brasil	BI Munis	\N	benefíciarios do Auxílio Brasil	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:42:31.391123+00	2026-04-30 12:43:51.988+00	1777383768425_beneficiarios_do_Auxilio_Brasil.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
61451958-77ab-4110-aa0f-efb2755484e3	Pessoas com Deficiência no Cad_única	BI Munis	\N	Pessoas com Deficiência no Cad_única	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:41:44.934103+00	2026-04-30 12:44:02.558+00	1777383720094_Pessoas_com_Deficiencia_no_Cad_unica.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
24d8ae9e-6bf0-4612-94d4-fad18e2225ac	MA,PI,CE,RN,PB-Exp e Imp-2010 a 2024	BI Munis	\N	MA,PI,CE,RN,PB-Exp e Imp-2010 a 2024	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:36:01.177676+00	2026-04-30 12:44:08.806+00	1777383378156_MA_PI_CE_RN_PB_Exp_e_Imp_2010_a_2024.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
dc28116f-63fa-4280-88da-421cdd6dae87	SP_2021-2022 export e import	BI Munis	\N	SP_2021-2022 export e import	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:09:25.552984+00	2026-04-30 12:44:25.031+00	1777381781874_SP_2021_2022_export_e_import.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
837cb9f4-99d2-4a06-a3dd-00800819f7b7	MG_2010-2016_export e import	BI Munis	\N	MG_2010-2016_export e import	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:04:44.528085+00	2026-04-30 12:44:37.128+00	1777381501149_MG_2010_2016_export_e_import.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
2e43ea30-b358-420e-968f-c456e58744aa	Países e seus BLOCOS	BI Munis	\N	Países e seus BLOCOS	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 12:54:35.39072+00	2026-04-30 12:44:48.672+00	1777380892382_Paises_e_seus_BLOCOS.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
17df154e-37e5-4045-8e09-eb69f83b95df	SP_2017-2018 export e import	BI Munis	\N	SP_2017-2018 export e import	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:09:01.602474+00	2026-04-30 12:45:03.281+00	1777381750095_SP_2017_2018_export_e_import.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
a120f385-3b36-4f23-9189-edfeb4419211	SP_2023 expor e import	BI Munis	\N	SP_2023 expor e import	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:09:38.813081+00	2026-04-30 12:45:07.057+00	1777381795771_SP_2023_expor_e_import.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
c302f863-096b-4efc-98f6-4ccd69c90a73	RS_2017-2022_export e import	BI Munis	\N	RS_2017-2022_export e import	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:11:05.606296+00	2026-04-30 12:45:14.634+00	1777381882233_RS_2017_2022_export_e_import.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
8a87b798-4b2a-4173-90fb-a99aa2dc33a5	PIB dos Municípios - base de dados 2010-2021	BI Munis	\N	PIB dos Municípios - base de dados 2010-2021	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:37:36.700496+00	2026-04-30 12:45:26.386+00	1777383472403_PIB_dos_Municipios___base_de_dados_2010_2021.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
12ea62d2-502b-404f-acf4-26e58d921910	Faixa das Rotas dos Municípios 	BI Munis	\N	Faixa das Rotas dos Municípios 	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 12:38:01.211117+00	2026-04-30 12:45:41.659+00	1777379898265_Faixa_das_Rotas_dos_Municipios_.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
a1d0c90f-8e0a-4a44-9a80-7cacdc23705d	Acidente de trânsito (óbito) F - IPEA	BI Munis	\N	Acidente de trânsito (óbito) F - IPEA	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 12:43:33.981808+00	2026-04-30 12:45:51.812+00	1777380231067_Acidente_de_transito__obito__F___IPEA.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
8ab42022-86d2-4c66-95be-19a1b21e2af0	N de homicídios total 2022	BI Munis	\N	N de homicídios total 2022	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 12:47:57.544458+00	2026-04-30 12:46:09.173+00	1777380494255_N_de_homicidios_total_2022.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
f49a9e1c-f840-4bde-9a77-868bc9801250	Work seção (referência)	BI Munis	\N	Work seção (referência)	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 12:53:32.042011+00	2026-04-30 12:46:21.238+00	1777380829009_Work_secao__referencia_.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
39b1052a-f175-4dfe-8957-9774bde04d4f	PIB dos Municípios de 2010-2023	BI Munis	\N	PIB dos Municípios de 2010-2023	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:39:33.897939+00	2026-04-30 12:46:46.536+00	1777383580267_PIB_dos_Municipios_de_2010_2023.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
d0958c70-2be1-4725-9c7c-3bdb8b47c580	PR_2017-2024_export e import	BI Munis	\N	PR_2017-2024_export e import	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:10:38.190936+00	2026-04-30 12:46:59.368+00	1777381854704_PR_2017_2024_export_e_import.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
c2c32e0f-dcca-4ee1-aaa3-b448c68a42ac	RJ_2010-2024_export e import	BI Munis	\N	RJ_2010-2024_export e import	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 13:06:51.332019+00	2026-04-30 12:47:36.491+00	1777381627694_RJ_2010_2024_export_e_import.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
4ed3aabe-50c8-4c4c-9396-de44b0cd0eba	Mercado de trabalho 2012 - 6449	BI Munis	\N	Mercado de trabalho 2012 - 6449	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 12:53:56.610624+00	2026-04-30 12:47:43.731+00	1777380851042_Mercado_de_trabalho_2012___6449.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
c2810d95-2d82-4c19-ab40-6f2e876a393c	N de homicídios do sexo F - IPEA	BI Munis	\N	N de homicídios do sexo F - IPEA	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 12:46:02.533329+00	2026-04-30 12:47:56.364+00	1777380379287_N_de_homicidios_do_sexo_F___IPEA.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
9837f550-fa7c-418d-83e3-2f88c591d113	Divulgação anos finais municípios 2023	BI Munis		Divulgação anos finais municípios 2023	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:13:19.745266+00	2026-05-07 13:50:41.916+00	1777385615951_Divulgacao_anos_finais_municipios_2023.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		1778161841264_Divulgacao_anos_finais_municipios_2023_preview.png
babb0700-4df4-430f-8b32-6fb74e50cd54	Comissões da Câmara 	Congresso/Senado/Câmara		Comissões da Câmara	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 12:21:49.919816+00	2026-05-06 13:03:47.646+00	1777549657600_Comissoes_do_Camara_.pbix	publico				f		\N
8f42d160-6e81-41fd-abe8-dd1c231056ca	Nota informativa IDEB 2023	BI Munis		Nota informativa IDEB 2023	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:14:14.114524+00	2026-05-07 12:25:59.219+00	1777385670083_Nota_informativa_IDEB_2023.pdf	publico				f		\N
d2dc138b-a8cf-4bd2-9dde-dda1ded86d1d	Divulgação anos iniciais municípios 2023	BI Munis		Divulgação anos iniciais municípios 2023	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:13:42.857737+00	2026-05-07 13:50:50.985+00	1777385639009_Divulgacao_anos_iniciais_municipios_2023.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		1778161850072_Divulgacao_anos_iniciais_municipios_2023_preview.png
2d28d962-e7b0-4c36-98ff-7cff10ca8680	Qualidade de Vida novo versão 2	Pessoas		Qualidade de Vida novo_vs2	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:34:12.894001+00	2026-05-07 11:33:26.302+00	1777387008033_Qualidade_de_Vida_novo_versao_2.pbix	publico			https://app.powerbi.com/view?r=eyJrIjoiZWNlOWE4OWUtZjc5OS00MDJlLWE1ODgtZjNhZmQ4ZGFjMzY5IiwidCI6IjQ1NjIxM2NmLTcwNzMtNDdjNi1iZjQ5LTQxYjY1NGFkNDQ5YiJ9	f		\N
1ad88071-6164-4244-9e06-10cd684a0e8c	Qualidade de Vida novo	Pessoas		Qualidade de Vida novo	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:33:23.744231+00	2026-05-07 11:33:36.871+00	1777386830508_Qualidade_de_Vida_novo.pbix	publico			https://app.powerbi.com/view?r=eyJrIjoiZWNlOWE4OWUtZjc5OS00MDJlLWE1ODgtZjNhZmQ4ZGFjMzY5IiwidCI6IjQ1NjIxM2NmLTcwNzMtNDdjNi1iZjQ5LTQxYjY1NGFkNDQ5YiJ9	f		\N
9dbfa2d5-b7d2-4669-8a2c-a740adb8c893	Painel Qualidade de Vida e Desenvolvimento	Pessoas		Painel Qualidade de Vida e Desenvolvimento	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:32:56.722603+00	2026-05-07 11:33:46.727+00	1777386793913_Painel_Qualidade_de_Vida_e_Desenvolvimento.pbix	publico			https://app.powerbi.com/view?r=eyJrIjoiZWNlOWE4OWUtZjc5OS00MDJlLWE1ODgtZjNhZmQ4ZGFjMzY5IiwidCI6IjQ1NjIxM2NmLTcwNzMtNDdjNi1iZjQ5LTQxYjY1NGFkNDQ5YiJ9	f		\N
cca1f17c-28b6-464f-9db1-92682deb07c3	Pessoas atualizado	Pessoas		Pessoas atualizado	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:24:21.575577+00	2026-05-07 11:39:05.787+00	1777386278522_Pessoas_atualizado.pbix	publico			https://app.powerbi.com/view?r=eyJrIjoiZTA4YjZmNjItYjU3NS00ZWNiLTgyOTYtYTNmMGNiODAyMGE4IiwidCI6IjQ1NjIxM2NmLTcwNzMtNDdjNi1iZjQ5LTQxYjY1NGFkNDQ5YiJ9	f		\N
6db5cf57-4561-4e94-a544-be64c37f5795	Nota técnica taxas transição 2007 a 2016	BI Munis		Nota técnica taxas transição 2007 a 2016	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:12:52.226872+00	2026-05-07 12:26:06.147+00	1777385589365_Nota_tecnica_taxas_transicao_2007_a_2016.pdf	publico				f		\N
0caa371b-d556-4e45-bd16-d89b3c569dca	Pirâmide etária IBGE 2000	BI Munis		Pirâmide etária IBGE 2000	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:02:04.315226+00	2026-05-07 13:51:48.879+00	1777384941171_Piramide_etaria_IBGE_2000.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		1778161908185_Piramide_etaria_IBGE_2000_preview.png
53ea1527-6222-4948-ae8c-dca7b43ee4e6	M Pirâmide etária IBGE 2022	BI Munis	https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	M Pirâmide etária IBGE 2022	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:03:05.870358+00	2026-05-07 13:52:16.465+00	1777385002760_M_Piramide_etaria_IBGE_2022.xlsx	publico			https://colaboragov.sharepoint.com/sites/DAGE-COTIC/Shared%20Documents/Forms/AllItems.aspx?id=%2Fsites%2FDAGE%2DCOTIC%2FShared%20Documents%2FCOTIC%2F06%20%2D%20Sistemas%2FPOWERBI%2FPaineis&viewid=6659a9cb%2D9359%2D4a49%2Da635%2Df254250d4a57&xsdata=MDV8MDJ8fDI4ZDM5YjcwMDc4YzRkNDU1MTg2MDhkZTlhMjM5ZDdhfDQ1NjIxM2NmNzA3MzQ3YzZiZjQ5NDFiNjU0YWQ0NDlifDB8MHw2MzkxMTc2NzQ4ODk3NjQ5Mzl8VW5rbm93bnxWR1ZoYlhOVFpXTjFjbWwwZVZObGNuWnBZMlY4ZXlKRFFTSTZJbFJsWVcxelgwRlVVRk5sY25acFkyVmZVMUJQVEU5R0lpd2lWaUk2SWpBdU1DNHdNREF3SWl3aVVDSTZJbGRwYmpNeUlpd2lRVTRpT2lKUGRHaGxjaUlzSWxkVUlqb3hNWDA9fDF8TDJOb1lYUnpMekU1T2pVd05tVmhORGcwTFdZd09XTXROR1JqTlMwNU9EZ3lMVEU0TlRGa056WXdOVFV4TlY4M1pEaGpZbVJsTWkwM1lURTRMVFE1TjJFdE9UTTVZeTB3WWpkaVlXWmlObVF3WkRGQWRXNXhMbWRpYkM1emNHRmpaWE12YldWemMyRm5aWE12TVRjM05qRTNNRFk0TmpRMU5RPT18ZDhkZDE1YWY4YzMyNDkyZGMxOWQwOGRlOWEyMzlkNzl8ZWE4N2MwNTcyNDdlNGNhMzhiNmY0ZWMwNmEzNmQ2NjE%3D&sdata=TlVweVZGN2VwbkU5V1BMYnlCUVRYMDd4aDlncTZyWUV2WXlhSU9UbkQzRT0%3D&ovuser=456213cf-7073-47c6-bf49-41b654ad449b%2Cvictor.fernandes%40planejamento.gov.br	f		\N
b90b450a-eebc-4575-b181-86cbf0e7b92b	Pirâmide etária IBGE 1970	BI Munis	https://app.powerbi.com/view?r=eyJrIjoiMWQ4NDRlZjItYjEzYi00MzFkLWE4MzItZDA1MmY0NWNjNTY2IiwidCI6IjQ1NjIxM2NmLTcwNzMtNDdjNi1iZjQ5LTQxYjY1NGFkNDQ5YiJ9	Pirâmide etária IBGE 1970	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:02:49.990426+00	2026-05-07 13:53:01.084+00	1777384986863_Piramide_etaria_IBGE_1970.xlsx	publico			https://colaboragov.sharepoint.com/sites/DAGE-COTIC/Shared%20Documents/Forms/AllItems.aspx?id=%2Fsites%2FDAGE%2DCOTIC%2FShared%20Documents%2FCOTIC%2F06%20%2D%20Sistemas%2FPOWERBI%2FPaineis&viewid=6659a9cb%2D9359%2D4a49%2Da635%2Df254250d4a57&xsdata=MDV8MDJ8fDI4ZDM5YjcwMDc4YzRkNDU1MTg2MDhkZTlhMjM5ZDdhfDQ1NjIxM2NmNzA3MzQ3YzZiZjQ5NDFiNjU0YWQ0NDlifDB8MHw2MzkxMTc2NzQ4ODk3NjQ5Mzl8VW5rbm93bnxWR1ZoYlhOVFpXTjFjbWwwZVZObGNuWnBZMlY4ZXlKRFFTSTZJbFJsWVcxelgwRlVVRk5sY25acFkyVmZVMUJQVEU5R0lpd2lWaUk2SWpBdU1DNHdNREF3SWl3aVVDSTZJbGRwYmpNeUlpd2lRVTRpT2lKUGRHaGxjaUlzSWxkVUlqb3hNWDA9fDF8TDJOb1lYUnpMekU1T2pVd05tVmhORGcwTFdZd09XTXROR1JqTlMwNU9EZ3lMVEU0TlRGa056WXdOVFV4TlY4M1pEaGpZbVJsTWkwM1lURTRMVFE1TjJFdE9UTTVZeTB3WWpkaVlXWmlObVF3WkRGQWRXNXhMbWRpYkM1emNHRmpaWE12YldWemMyRm5aWE12TVRjM05qRTNNRFk0TmpRMU5RPT18ZDhkZDE1YWY4YzMyNDkyZGMxOWQwOGRlOWEyMzlkNzl8ZWE4N2MwNTcyNDdlNGNhMzhiNmY0ZWMwNmEzNmQ2NjE%3D&sdata=TlVweVZGN2VwbkU5V1BMYnlCUVRYMDd4aDlncTZyWUV2WXlhSU9UbkQzRT0%3D&ovuser=456213cf-7073-47c6-bf49-41b654ad449b%2Cvictor.fernandes%40planejamento.gov.br	f		1778161916721_Piramide_etaria_IBGE_1970_preview.png
6bbf8f62-fb77-430f-b1a7-bdba1a68fb42	Pirâmide etária IBGE 1980	BI Munis		Pirâmide etária IBGE 1980	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:02:40.490475+00	2026-05-07 13:53:57.518+00	1777384976974_Piramide_etaria_IBGE_1980.xlsx	publico			https://colaboragov.sharepoint.com/sites/DAGE-COTIC/Shared%20Documents/Forms/AllItems.aspx?id=%2Fsites%2FDAGE%2DCOTIC%2FShared%20Documents%2FCOTIC%2F06%20%2D%20Sistemas%2FPOWERBI%2FPaineis&viewid=6659a9cb%2D9359%2D4a49%2Da635%2Df254250d4a57&xsdata=MDV8MDJ8fDI4ZDM5YjcwMDc4YzRkNDU1MTg2MDhkZTlhMjM5ZDdhfDQ1NjIxM2NmNzA3MzQ3YzZiZjQ5NDFiNjU0YWQ0NDlifDB8MHw2MzkxMTc2NzQ4ODk3NjQ5Mzl8VW5rbm93bnxWR1ZoYlhOVFpXTjFjbWwwZVZObGNuWnBZMlY4ZXlKRFFTSTZJbFJsWVcxelgwRlVVRk5sY25acFkyVmZVMUJQVEU5R0lpd2lWaUk2SWpBdU1DNHdNREF3SWl3aVVDSTZJbGRwYmpNeUlpd2lRVTRpT2lKUGRHaGxjaUlzSWxkVUlqb3hNWDA9fDF8TDJOb1lYUnpMekU1T2pVd05tVmhORGcwTFdZd09XTXROR1JqTlMwNU9EZ3lMVEU0TlRGa056WXdOVFV4TlY4M1pEaGpZbVJsTWkwM1lURTRMVFE1TjJFdE9UTTVZeTB3WWpkaVlXWmlObVF3WkRGQWRXNXhMbWRpYkM1emNHRmpaWE12YldWemMyRm5aWE12TVRjM05qRTNNRFk0TmpRMU5RPT18ZDhkZDE1YWY4YzMyNDkyZGMxOWQwOGRlOWEyMzlkNzl8ZWE4N2MwNTcyNDdlNGNhMzhiNmY0ZWMwNmEzNmQ2NjE%3D&sdata=TlVweVZGN2VwbkU5V1BMYnlCUVRYMDd4aDlncTZyWUV2WXlhSU9UbkQzRT0%3D&ovuser=456213cf-7073-47c6-bf49-41b654ad449b%2Cvictor.fernandes%40planejamento.gov.br	f		1778161899784_Piramide_etaria_IBGE_1980_preview.png
85529651-625b-4176-900b-2fa4170526f4	Taxa Transição Municípios 2021 a 2022	BI Munis		Taxa Transição Municípios 2021 a 2022 	32fa09a3-ba6d-4a75-ab60-95804c18b232	2026-04-28 14:12:20.094932+00	2026-05-21 14:23:47.219+00	1777385556531_Taxa_Transicao_Municipios_2021_a_2022.xlsx	publico			https://colaboragov.sharepoint.com/sites/DAGE-COTIC/Shared%20Documents/Forms/AllItems.aspx?id=%2Fsites%2FDAGE%2DCOTIC%2FShared%20Documents%2FCOTIC%2F06%20%2D%20Sistemas%2FPOWERBI%2FPaineis&viewid=6659a9cb%2D9359%2D4a49%2Da635%2Df254250d4a57&xsdata=MDV8MDJ8fDI4ZDM5YjcwMDc4YzRkNDU1MTg2MDhkZTlhMjM5ZDdhfDQ1NjIxM2NmNzA3MzQ3YzZiZjQ5NDFiNjU0YWQ0NDlifDB8MHw2MzkxMTc2NzQ4ODk3NjQ5Mzl8VW5rbm93bnxWR1ZoYlhOVFpXTjFjbWwwZVZObGNuWnBZMlY4ZXlKRFFTSTZJbFJsWVcxelgwRlVVRk5sY25acFkyVmZVMUJQVEU5R0lpd2lWaUk2SWpBdU1DNHdNREF3SWl3aVVDSTZJbGRwYmpNeUlpd2lRVTRpT2lKUGRHaGxjaUlzSWxkVUlqb3hNWDA9fDF8TDJOb1lYUnpMekU1T2pVd05tVmhORGcwTFdZd09XTXROR1JqTlMwNU9EZ3lMVEU0TlRGa056WXdOVFV4TlY4M1pEaGpZbVJsTWkwM1lURTRMVFE1TjJFdE9UTTVZeTB3WWpkaVlXWmlObVF3WkRGQWRXNXhMbWRpYkM1emNHRmpaWE12YldWemMyRm5aWE12TVRjM05qRTNNRFk0TmpRMU5RPT18ZDhkZDE1YWY4YzMyNDkyZGMxOWQwOGRlOWEyMzlkNzl8ZWE4N2MwNTcyNDdlNGNhMzhiNmY0ZWMwNmEzNmQ2NjE%3D&sdata=TlVweVZGN2VwbkU5V1BMYnlCUVRYMDd4aDlncTZyWUV2WXlhSU9UbkQzRT0%3D&ovuser=456213cf-7073-47c6-bf49-41b654ad449b%2Cvictor.fernandes%40planejamento.gov.br	f		1778161779838_Taxa_Transicao_Municipios_2021_a_2022_preview.png
2e292c7f-bfdd-419a-a7ea-b40fb61cb08e	Proposições para o congresso nacional 	Congresso/Senado/Câmara	\N	Proposições para o congresso nacional 	\N	2026-04-28 11:02:55.641767+00	2026-04-28 11:02:55.641767+00	1777374192412_Proposicoes_para_o_congresso_nacional_.pbix	publico	\N	\N	\N	f	\N	\N
146a88aa-ae3d-4d2e-9bd8-4cc75f54f940	Municípios e seus códigos 	BI Munis	\N	Municípios e seus códigos 	\N	2026-04-28 11:09:22.852973+00	2026-04-30 12:45:38.811+00	1777374579114_Municipios_e_seus_codigos_.xlsx	publico			https://www.gov.br/planejamento/pt-br/assuntos/articulacao-institucional/pataforma-munis	f		\N
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: horus_admin
--

COPY public.role_permissions (id, role, module_id, can_view, can_edit, can_delete) FROM stdin;
7f1dc16b-2b08-4f3f-9745-85ddd8d5825c	admin	a6d187eb-9ce5-4697-b664-5c428eafb62f	t	t	t
f72448b1-124a-41a7-9550-b3a11e3b482a	admin	f23ab4d4-4b5d-41c5-9664-a69dd52a6ae2	t	t	t
4ef139b9-fd02-48c3-9a86-53f4f8ef5c19	admin	4a0e08f4-b54c-4933-9825-ae7b65413802	t	t	t
d9292625-a704-4fc9-9fc5-f8933b7c8b44	admin	5a3feab4-ec67-4ef2-95ee-791100428a88	t	t	t
f165918d-01c8-481d-9692-b3f028022f1b	admin	2bc790a4-fe6b-4cd3-bbc9-6621cfbd6b66	t	t	t
37d592e1-46a6-4c38-a292-0c7c8a735c7f	admin	e5f5022b-5946-4519-8606-1bf53d8000cf	t	t	t
fad4cc87-cc85-4ea5-9b43-2edc4580d507	admin	e1188626-f2bf-4adf-9c96-f92e47d35e15	t	t	t
67cdcac9-5ab1-40cc-bb19-2ff62babd520	editor	a6d187eb-9ce5-4697-b664-5c428eafb62f	t	t	f
dbd27d02-9576-464a-b9f0-b31489016a1d	editor	f23ab4d4-4b5d-41c5-9664-a69dd52a6ae2	t	t	f
10180b78-b5f1-4f95-81b8-399678886ff0	editor	4a0e08f4-b54c-4933-9825-ae7b65413802	t	t	f
b367e7ee-ab29-4265-9c64-e9f732f38982	editor	5a3feab4-ec67-4ef2-95ee-791100428a88	t	t	f
04254d3a-9f6c-4d98-be3d-493bbcf0b425	editor	2bc790a4-fe6b-4cd3-bbc9-6621cfbd6b66	t	t	f
19f81f28-2fb1-43f0-8338-858ed6aa796e	editor	e5f5022b-5946-4519-8606-1bf53d8000cf	t	t	f
c66b248c-b9c4-467c-96d9-a124d891551a	editor	e1188626-f2bf-4adf-9c96-f92e47d35e15	t	t	f
22d0e6e8-ce87-443f-9477-58221ef914a3	viewer	a6d187eb-9ce5-4697-b664-5c428eafb62f	t	f	f
53eafdd5-499c-4be8-8fa6-a9bf0f106775	viewer	f23ab4d4-4b5d-41c5-9664-a69dd52a6ae2	t	f	f
344b6b50-483e-4379-be88-711af259a183	viewer	4a0e08f4-b54c-4933-9825-ae7b65413802	t	f	f
12aa75c1-a2b0-40c7-b0d7-afe58c9c6387	viewer	5a3feab4-ec67-4ef2-95ee-791100428a88	t	f	f
16f044cb-d268-4bd1-9326-80662297fcc3	viewer	2bc790a4-fe6b-4cd3-bbc9-6621cfbd6b66	t	f	f
68ddbd69-08c3-42aa-8843-5eb7eae99313	viewer	e5f5022b-5946-4519-8606-1bf53d8000cf	t	f	f
d26e8241-f575-4ba2-b55a-5ad035ef7313	viewer	e1188626-f2bf-4adf-9c96-f92e47d35e15	t	f	f
d7f62c44-6a94-4692-9103-242b667f1e5f	painel_editor	a6d187eb-9ce5-4697-b664-5c428eafb62f	t	t	f
66a3d840-efca-42b5-ac25-b61c6d693278	painel_editor	f23ab4d4-4b5d-41c5-9664-a69dd52a6ae2	t	f	f
d772778a-4d3a-4738-a47a-ea2c4cc3a664	painel_editor	4a0e08f4-b54c-4933-9825-ae7b65413802	t	f	f
e6514620-b374-46c8-aedc-5e1b6fdb9a94	painel_editor	5a3feab4-ec67-4ef2-95ee-791100428a88	t	f	f
f344afb4-92f2-47a4-82e4-600ac93c2594	painel_editor	2bc790a4-fe6b-4cd3-bbc9-6621cfbd6b66	t	f	f
16a1b17a-b9bc-42ef-90c6-bfbbeeb14a46	painel_editor	e5f5022b-5946-4519-8606-1bf53d8000cf	t	f	f
c5d6e3e5-2b4a-41e9-aec0-53946e49eb39	painel_editor	e1188626-f2bf-4adf-9c96-f92e47d35e15	t	f	f
83b5a62f-04ba-4ecb-9025-cfdbc7bda69a	sistema_editor	a6d187eb-9ce5-4697-b664-5c428eafb62f	t	f	f
f3cff03f-3cf4-4ef8-9e13-2fd4e4e16fc7	sistema_editor	f23ab4d4-4b5d-41c5-9664-a69dd52a6ae2	t	t	f
9249e51f-a298-425f-b09b-78925350997f	sistema_editor	4a0e08f4-b54c-4933-9825-ae7b65413802	t	f	f
301e404f-8b3c-4b1d-a976-500360145db2	sistema_editor	5a3feab4-ec67-4ef2-95ee-791100428a88	t	f	f
d09af840-0ef9-43ff-a926-c28e589068ce	sistema_editor	2bc790a4-fe6b-4cd3-bbc9-6621cfbd6b66	t	f	f
28f62d42-5668-4a17-9891-6d00f2f01f4e	sistema_editor	e5f5022b-5946-4519-8606-1bf53d8000cf	t	f	f
2cd31870-5bcf-4339-8228-8f9ae3b36415	sistema_editor	e1188626-f2bf-4adf-9c96-f92e47d35e15	t	f	f
f23a1b0d-8f50-4000-b6b0-059b76a8c421	inventario_editor	a6d187eb-9ce5-4697-b664-5c428eafb62f	t	f	f
fbf0aae1-6715-4865-b02e-2a5d3632800f	inventario_editor	f23ab4d4-4b5d-41c5-9664-a69dd52a6ae2	t	f	f
705bd51b-48be-432f-a5b1-e9213606f372	inventario_editor	4a0e08f4-b54c-4933-9825-ae7b65413802	t	t	f
f00c6772-7e10-417a-98aa-bec180b920e6	inventario_editor	5a3feab4-ec67-4ef2-95ee-791100428a88	t	f	f
5d40787b-c2a2-47ff-a2eb-c72b9d78eb4c	inventario_editor	2bc790a4-fe6b-4cd3-bbc9-6621cfbd6b66	t	f	f
c933081b-08e7-422e-8b0f-2d34bdccba2d	inventario_editor	e5f5022b-5946-4519-8606-1bf53d8000cf	t	f	f
aacf29e1-447f-4dfb-8527-9756c6985a48	inventario_editor	e1188626-f2bf-4adf-9c96-f92e47d35e15	t	f	f
\.


--
-- Data for Name: sistemas; Type: TABLE DATA; Schema: public; Owner: horus_admin
--

COPY public.sistemas (id, sigla, nome, descricao, gestores, sustentacao, url_producao, url_homologacao, gestao_dados, acesso_bd, created_at, updated_at, tipo_acesso) FROM stdin;
9c896a37-4c5b-4bf3-a7fc-3bc5fc35fb3f	PFE	PORTAL DE FINANCIAMENTO EXTERNO	INSTRUMENTO ADMINISTRATIVO ELETRÔNICO QUE INTEGRA AS ATIVIDADES DE REGISTRO, EXAME, AUTORIZAÇÃO E ACOMPANHAMENTO DE PLEITOS DE PREPARAÇÃO DE PROJETOS.	ANTÔNIO SABINO DA COSTA FILHO	FIRST (CONTRATO DO MGI, FISCALIZADO PELA COTIC)	https://pfe.sistema.gov.br/	https://pfe.dth.api.gov.br/	MGI	O acesso é feito através de liberação que o próprio MGI faz para cada usuário	2026-05-11 14:01:38.426222+00	2026-05-11 14:01:38.426222+00	publico
cc9ce106-6160-4d24-be34-a7317c1eee19	MAPP	METODOLOGIA DE AUTOAVALIAÇÃO DE POLÍTICAS PÚBLICAS	A MAPP PRETENDE AMPLIAR A CAPACIDADE DE O GOVERNO FEDERAL AVALIAR SUAS POLÍTICAS E, COM ISSO, AUMENTAR A RELEVÂNCIA, EFETIVIDADE, EFICIÊNCIA E SUSTENTABILIDADE DOS GASTOS PÚBLICOS.	DANIEL DA SILVA GRIMALDI	SYDLE (CONTRATO DO MPO, FISCALIZADO PELA COTIC)	https://mapp.planejamento.gov.br/	https://portal-mapp-hom.sydle.com/home	MPO	Banco de dados gerenciado pela Sydle	2026-05-11 14:01:38.426222+00	2026-05-11 14:01:38.426222+00	publico
5b2195cd-e08d-4616-bacd-63cda17dbaa8	SISTEMA DE COLEGIADOS	SISTEMA DE COLEGIADOS	A MAPP CONSISTE EM UM CHECK LIST ESTRUTURADO QUE BUSCA AVALIAR A PRESENÇA DE BOAS PRÁTICAS DE DESENHO E IMPLEMENTAÇÃO DE POLÍTICA.	PRISCILLA PIMENTEL SGANZERLA	FIRST (CONTRATO DO MGI, FISCALIZADO PELA COTIC)	https://apps.powerapps.com/play/e/4a4facc0-37a1-e55e-96af-5a0b84a48ae2/a/576cf0dd-0c58-4655-ab23-194d1f68140f?tenantId=3ec92969-5a51-4f18-8ac9-ef98fbafa978	https://apps.powerapps.com/play/e/278ac9a0-2c57-e8d7-b9a1-a24fe520e4ed/a/cbec88fd-91a5-4208-8ad2-fff74c04f616?tenantId=3ec92969-5a51-4f18-8ac9-ef98fbafa978	MGI	App conecta-se à fonte de dados SharePoint utilizando conector nativo	2026-05-11 14:01:38.426222+00	2026-05-11 14:01:38.426222+00	publico
e47ec1c1-23ae-4846-b185-afbc5dec3a33	VEREDAS	VEREDAS	O SISTEMA DE COLEGIADO É UTILIZADO PARA GERENCIAR AS REPRESENTAÇÕES DO MINISTÉRIO DO PLANEJAMENTO E ORÇAMENTO EM ÓRGÃOS COLEGIADO.	RICARDO DE ASSIS TEIXEIRA	DESENVOLVIMENTO PRÓPRIO (MPO)	http://veredas.planejamento.gov.br/veredas/		MPO	Os dados estão armazenados em um servidor na SOF, sendo possível acessá-los através do endereço /var/lib/mysql	2026-05-11 14:01:38.426222+00	2026-05-11 14:01:38.426222+00	publico
a841a2cc-2563-459d-a074-c8d38a2b73c0	SCDP	SCDP	O VEREDAS É UMA FERRAMENTA DE MONITORAMENTO DE PROJETOS DO MINISTÉRIO DO PLANEJAMENTO E ORÇAMENTO, DESENVOLVIDA PELA SUBSECRETARIA DE ADMINISTRAÇÃO E GESTÃO ESTRATÉGICA.	TOMAZ MOREIRA FERNANDES DA SILVA	SEGES (MGI)	https://www2.scdp.gov.br/		MGI	Para o MPO, somente através do sistema SCDP	2026-05-11 14:01:38.426222+00	2026-05-11 14:01:38.426222+00	publico
c4f216b3-e64f-411d-9adb-7710fa3bb1b3	BR SUPPLY	ALMOXARIFADO VIRTUAL - BR SUPPLY	SISTEMA UTILIZADO PARA SOLICITAÇÃO DE CONCESSÃO DE DIÁRIAS E EMISSÃO DE PASSAGENS.	FABIANA ODA	SEGES (MGI)	https://www.supplymanager.com.br/manager/Login		MGI	Para o MPO, somente através do sistema Almoxarifado Virtual - Br Supply	2026-05-11 14:01:38.426222+00	2026-05-11 14:01:38.426222+00	publico
a5ea2b6c-3a33-41f8-b34b-3a934dca87ef	MOBGOV	MOBGOV	SISTEMA UTILIZADO PARA SOLICITAÇÃO DE MATERIAIS DE CONSUMO.	FABIANA ODA	SEGES (MGI)	https://mobgov.wexp.com.br/InviteUsers		MGI	Para o MPO, somente através do sistema MOBGov	2026-05-11 14:01:38.426222+00	2026-05-11 14:01:38.426222+00	publico
e379026b-4286-41b6-9510-17359e614c6b	ORBIT	ORBIT	SISTEMA DE AUTOMAÇÃO DE PAGAMENTOS A CONTRATADOS E FORNECEDORES EXTERNOS.	RAFAEL SALDANHA FERRAZ GANGANA	SYDLE (CONTRATO DO MPO, FISCALIZADO PELA COTIC)			MPO	Banco de dados NoSQL, hospedado na AWS. Acesso através de API Rest.	2026-05-11 14:01:38.426222+00	2026-05-11 14:01:38.426222+00	publico
76396a8e-59bc-48cd-b159-69b851f60787	SCONTROL	SISTEMA DE CONTROLE DE ACESSOS	SISTEMA DE CONTROLE DE ACESSOS PARA GERENCIAR PERMISSÕES E ACESSOS.	STUANI	SYDLE (CONTRATO DO MPO, FISCALIZADO PELA COTIC)		https://mpo-hom.sydle.one/atendimento-cofin	MPO	Banco de dados NoSQL, hospedado na AWS. Acesso através de API Rest.	2026-05-11 14:01:38.426222+00	2026-05-11 14:01:38.426222+00	publico
3d4815fe-235f-4faa-acfe-149b5802368b	POPOI	PORTAL DE PAGAMENTOS A ORGANISMOS INTERNACIONAIS	PLATAFORMA DIGITAL UTILIZADA PARA CENTRALIZAR, PADRONIZAR E TORNAR MAIS ÁGIL O PROCESSO DE PAGAMENTO DAS CONTRIBUIÇÕES DO BRASIL A ORGANISMOS INTERNACIONAIS.	MANUELA DE AZEVEDO BEZERRA, VITOR RAMOS	FIRST (CONTRATO DO MGI, FISCALIZADO PELA COTIC)			MGI	MySQL, hospedado na AWS. Não é possível acessar diretamente os dados, somente através de API Rest.	2026-05-11 14:01:38.426222+00	2026-05-11 14:01:38.426222+00	publico
6fd1421d-2ffa-4a34-b160-c9c02ad20258	SIGS	SISTEMA DE GERENCIAMENTO INTEGRADO	SISTEMA ELETRÔNICO COM CERTIFICAÇÃO DIGITAL DESTINADO À GESTÃO, ANÁLISE E ACOMPANHAMENTO DE PROJETOS COM FINANCIAMENTO EXTERNO.	ANTÔNIO SABINO DA COSTA FILHO	FIRST (CONTRATO DO MGI, FISCALIZADO PELA COTIC)	http://www.sigs.planejamento.gov.br		SOF faz gestão da infraestrutura	Os dados estão armazenados em um servidor na SOF - Ambiente SIGS	2026-05-11 14:01:38.426222+00	2026-05-11 14:01:38.426222+00	publico
5f151143-bd59-46d3-b1ea-9959f3c05ce5	COFIN	COFIN	SISTEMA UTILIZADO PARA SOLICITAÇÃO DE TRANSPORTE TERRESTRE DE SERVIDORES E COLABORADORES.	RAFAEL SALDANHA FERRAZ GANGANA	SYDLE (CONTRATO DO MPO, FISCALIZADO PELA COTIC)		https://portal-mpo-hom.sydle.com/	MPO	Banco de dados NoSQL, hospedado na AWS. Acesso através de API Rest.	2026-05-11 14:01:38.426222+00	2026-05-11 14:01:38.426222+00	publico
\.


--
-- Data for Name: user_permissions; Type: TABLE DATA; Schema: public; Owner: horus_admin
--

COPY public.user_permissions (id, user_id, module, can_view, can_edit, can_create, can_delete, module_id) FROM stdin;
cc709ce7-9b65-49ea-82d4-d82a468c1ba1	682335d9-e33a-4f99-a302-26a81f68f588	dashboard	t	f	f	f	\N
1fa8c74f-d129-434d-a4ca-abde025347b1	682335d9-e33a-4f99-a302-26a81f68f588	levantamento	t	f	f	f	\N
526bede2-e914-4872-bd8e-4acff8ff5d3e	682335d9-e33a-4f99-a302-26a81f68f588	sistemas	t	f	f	f	\N
d74085f9-7287-4922-ad53-14d9f24d59a5	682335d9-e33a-4f99-a302-26a81f68f588	inventario	t	f	f	f	\N
7f6f88ac-00b4-40a2-b3f0-6ad7e830bb28	682335d9-e33a-4f99-a302-26a81f68f588	usuarios	f	f	f	f	\N
c8c2a473-ca90-400d-bae3-43c9b41e83f4	682335d9-e33a-4f99-a302-26a81f68f588	notificacoes	f	f	f	f	\N
5afb1654-1cb6-4fa1-89b9-751ccc0fbef8	682335d9-e33a-4f99-a302-26a81f68f588	areas	t	f	f	f	\N
0423f868-6ef7-4799-ae8f-51fe5c7d9469	682335d9-e33a-4f99-a302-26a81f68f588	fontes_dados	t	f	f	f	\N
be657bf6-1f3a-464d-bfec-9638ac0f09a4	682335d9-e33a-4f99-a302-26a81f68f588	registros	f	f	f	f	\N
f92ddb7d-9b95-48e0-b3ab-c94b6689ea9f	8ada9593-b7d8-4127-a579-510646b10bf5	dashboard	t	f	f	f	\N
1b290761-4efe-4238-8c1a-59f2e7324bbd	8ada9593-b7d8-4127-a579-510646b10bf5	levantamento	t	f	f	f	\N
281ac0d4-c88c-4fe0-9a16-ebfefc0cb2cd	8ada9593-b7d8-4127-a579-510646b10bf5	sistemas	t	f	f	f	\N
844b8615-ec78-4ffb-a253-fd5563e876ab	8ada9593-b7d8-4127-a579-510646b10bf5	inventario	t	f	f	f	\N
615c1e7e-5715-434f-9ce9-df37285cffb8	8ada9593-b7d8-4127-a579-510646b10bf5	usuarios	f	f	f	f	\N
67f664da-0e47-4029-9978-02b621227c3d	8ada9593-b7d8-4127-a579-510646b10bf5	notificacoes	f	f	f	f	\N
1a27a757-48c6-4bf0-bfe9-a00602880813	8ada9593-b7d8-4127-a579-510646b10bf5	areas	t	f	f	f	\N
8d82f857-38c6-4b19-b9d1-5d700c4e47b3	8ada9593-b7d8-4127-a579-510646b10bf5	fontes_dados	t	f	f	f	\N
b27ca287-7670-4022-ac11-9c5798e3d172	8ada9593-b7d8-4127-a579-510646b10bf5	registros	f	f	f	f	\N
\.


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: horus_admin
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 298, true);


--
-- Name: equipment_files_id_seq; Type: SEQUENCE SET; Schema: public; Owner: horus_admin
--

SELECT pg_catalog.setval('public.equipment_files_id_seq', 33, true);


--
-- Name: license_files_id_seq; Type: SEQUENCE SET; Schema: public; Owner: horus_admin
--

SELECT pg_catalog.setval('public.license_files_id_seq', 3, true);


--
-- Name: areas areas_nome_key; Type: CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_nome_key UNIQUE (nome);


--
-- Name: areas areas_pkey; Type: CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.areas
    ADD CONSTRAINT areas_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: equipamentos equipamentos_etiqueta_key; Type: CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.equipamentos
    ADD CONSTRAINT equipamentos_etiqueta_key UNIQUE (etiqueta);


--
-- Name: equipamentos equipamentos_pkey; Type: CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.equipamentos
    ADD CONSTRAINT equipamentos_pkey PRIMARY KEY (id);


--
-- Name: equipment_files equipment_files_pkey; Type: CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.equipment_files
    ADD CONSTRAINT equipment_files_pkey PRIMARY KEY (id);


--
-- Name: fontes_dados fontes_dados_nome_key; Type: CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.fontes_dados
    ADD CONSTRAINT fontes_dados_nome_key UNIQUE (nome);


--
-- Name: fontes_dados fontes_dados_pkey; Type: CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.fontes_dados
    ADD CONSTRAINT fontes_dados_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: levantamento_ativos levantamento_ativos_pkey; Type: CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.levantamento_ativos
    ADD CONSTRAINT levantamento_ativos_pkey PRIMARY KEY (id);


--
-- Name: license_files license_files_pkey; Type: CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.license_files
    ADD CONSTRAINT license_files_pkey PRIMARY KEY (id);


--
-- Name: modules modules_name_key; Type: CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_name_key UNIQUE (name);


--
-- Name: modules modules_pkey; Type: CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_pkey PRIMARY KEY (id);


--
-- Name: modulos modulos_nome_key; Type: CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.modulos
    ADD CONSTRAINT modulos_nome_key UNIQUE (nome);


--
-- Name: modulos modulos_pkey; Type: CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.modulos
    ADD CONSTRAINT modulos_pkey PRIMARY KEY (id);


--
-- Name: notificacoes notificacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.notificacoes
    ADD CONSTRAINT notificacoes_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


--
-- Name: profiles profiles_email_unique; Type: CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_unique UNIQUE (email);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: registros registros_pkey; Type: CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.registros
    ADD CONSTRAINT registros_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_role_module_id_key; Type: CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_module_id_key UNIQUE (role, module_id);


--
-- Name: sistemas sistemas_pkey; Type: CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.sistemas
    ADD CONSTRAINT sistemas_pkey PRIMARY KEY (id);


--
-- Name: sistemas sistemas_sigla_key; Type: CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.sistemas
    ADD CONSTRAINT sistemas_sigla_key UNIQUE (sigla);


--
-- Name: user_permissions user_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_pkey PRIMARY KEY (id);


--
-- Name: user_permissions user_permissions_user_id_module_key; Type: CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_user_id_module_key UNIQUE (user_id, module);


--
-- Name: equipamentos_responsavel_legal_idx; Type: INDEX; Schema: public; Owner: horus_admin
--

CREATE INDEX equipamentos_responsavel_legal_idx ON public.equipamentos USING btree (responsavel_legal);


--
-- Name: equipamentos_tipo_idx; Type: INDEX; Schema: public; Owner: horus_admin
--

CREATE INDEX equipamentos_tipo_idx ON public.equipamentos USING btree (tipo);


--
-- Name: equipamentos_usuario_alocado_idx; Type: INDEX; Schema: public; Owner: horus_admin
--

CREATE INDEX equipamentos_usuario_alocado_idx ON public.equipamentos USING btree (usuario_alocado);


--
-- Name: equipment_files_equipment_id_idx; Type: INDEX; Schema: public; Owner: horus_admin
--

CREATE INDEX equipment_files_equipment_id_idx ON public.equipment_files USING btree (equipment_id);


--
-- Name: idx_ativos_nivel_acesso; Type: INDEX; Schema: public; Owner: horus_admin
--

CREATE INDEX idx_ativos_nivel_acesso ON public.levantamento_ativos USING btree (nivel_acesso);


--
-- Name: idx_ativos_nivel_sigilo; Type: INDEX; Schema: public; Owner: horus_admin
--

CREATE INDEX idx_ativos_nivel_sigilo ON public.levantamento_ativos USING btree (nivel_sigilo);


--
-- Name: idx_ativos_secretaria; Type: INDEX; Schema: public; Owner: horus_admin
--

CREATE INDEX idx_ativos_secretaria ON public.levantamento_ativos USING btree (secretaria);


--
-- Name: idx_ativos_status; Type: INDEX; Schema: public; Owner: horus_admin
--

CREATE INDEX idx_ativos_status ON public.levantamento_ativos USING btree (status_ativo);


--
-- Name: idx_la_criado_por; Type: INDEX; Schema: public; Owner: horus_admin
--

CREATE INDEX idx_la_criado_por ON public.levantamento_ativos USING btree (criado_por);


--
-- Name: idx_la_curador_id; Type: INDEX; Schema: public; Owner: horus_admin
--

CREATE INDEX idx_la_curador_id ON public.levantamento_ativos USING btree (curador_dados_id);


--
-- Name: idx_la_responsavel_negocio_id; Type: INDEX; Schema: public; Owner: horus_admin
--

CREATE INDEX idx_la_responsavel_negocio_id ON public.levantamento_ativos USING btree (responsavel_negocio_id);


--
-- Name: idx_la_responsavel_tecnico_id; Type: INDEX; Schema: public; Owner: horus_admin
--

CREATE INDEX idx_la_responsavel_tecnico_id ON public.levantamento_ativos USING btree (responsavel_tecnico_id);


--
-- Name: idx_la_secretaria_id; Type: INDEX; Schema: public; Owner: horus_admin
--

CREATE INDEX idx_la_secretaria_id ON public.levantamento_ativos USING btree (secretaria_id);


--
-- Name: idx_la_unidade_id; Type: INDEX; Schema: public; Owner: horus_admin
--

CREATE INDEX idx_la_unidade_id ON public.levantamento_ativos USING btree (unidade_responsavel_id);


--
-- Name: idx_modulos_nome; Type: INDEX; Schema: public; Owner: horus_admin
--

CREATE INDEX idx_modulos_nome ON public.modulos USING btree (nome);


--
-- Name: idx_sistemas_created_at; Type: INDEX; Schema: public; Owner: horus_admin
--

CREATE INDEX idx_sistemas_created_at ON public.sistemas USING btree (created_at DESC);


--
-- Name: idx_sistemas_sigla; Type: INDEX; Schema: public; Owner: horus_admin
--

CREATE INDEX idx_sistemas_sigla ON public.sistemas USING btree (sigla);


--
-- Name: license_files_license_id_idx; Type: INDEX; Schema: public; Owner: horus_admin
--

CREATE INDEX license_files_license_id_idx ON public.license_files USING btree (license_id);


--
-- Name: password_reset_tokens_token_idx; Type: INDEX; Schema: public; Owner: horus_admin
--

CREATE INDEX password_reset_tokens_token_idx ON public.password_reset_tokens USING btree (token);


--
-- Name: password_reset_tokens_user_id_idx; Type: INDEX; Schema: public; Owner: horus_admin
--

CREATE INDEX password_reset_tokens_user_id_idx ON public.password_reset_tokens USING btree (user_id);


--
-- Name: equipamentos set_atualizado_em; Type: TRIGGER; Schema: public; Owner: horus_admin
--

CREATE TRIGGER set_atualizado_em BEFORE UPDATE ON public.equipamentos FOR EACH ROW EXECUTE FUNCTION public.atualizar_timestamp();


--
-- Name: levantamento_ativos trg_ativos_updated_at; Type: TRIGGER; Schema: public; Owner: horus_admin
--

CREATE TRIGGER trg_ativos_updated_at BEFORE UPDATE ON public.levantamento_ativos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: levantamento_ativos levantamento_ativos_criado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.levantamento_ativos
    ADD CONSTRAINT levantamento_ativos_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: levantamento_ativos levantamento_ativos_curador_dados_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.levantamento_ativos
    ADD CONSTRAINT levantamento_ativos_curador_dados_id_fkey FOREIGN KEY (curador_dados_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: levantamento_ativos levantamento_ativos_responsavel_negocio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.levantamento_ativos
    ADD CONSTRAINT levantamento_ativos_responsavel_negocio_id_fkey FOREIGN KEY (responsavel_negocio_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: levantamento_ativos levantamento_ativos_responsavel_tecnico_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.levantamento_ativos
    ADD CONSTRAINT levantamento_ativos_responsavel_tecnico_id_fkey FOREIGN KEY (responsavel_tecnico_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: levantamento_ativos levantamento_ativos_secretaria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.levantamento_ativos
    ADD CONSTRAINT levantamento_ativos_secretaria_id_fkey FOREIGN KEY (secretaria_id) REFERENCES public.areas(id) ON DELETE SET NULL;


--
-- Name: levantamento_ativos levantamento_ativos_substituto_curador_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.levantamento_ativos
    ADD CONSTRAINT levantamento_ativos_substituto_curador_id_fkey FOREIGN KEY (substituto_curador_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: levantamento_ativos levantamento_ativos_unidade_responsavel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.levantamento_ativos
    ADD CONSTRAINT levantamento_ativos_unidade_responsavel_id_fkey FOREIGN KEY (unidade_responsavel_id) REFERENCES public.areas(id) ON DELETE SET NULL;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE;


--
-- Name: user_permissions user_permissions_module_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE;


--
-- Name: user_permissions user_permissions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: horus_admin
--

ALTER TABLE ONLY public.user_permissions
    ADD CONSTRAINT user_permissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: modulos Allow authenticated create; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY "Allow authenticated create" ON public.modulos FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: modulos Allow authenticated delete; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY "Allow authenticated delete" ON public.modulos FOR DELETE USING ((auth.role() = 'authenticated'::text));


--
-- Name: modulos Allow authenticated update; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY "Allow authenticated update" ON public.modulos FOR UPDATE USING ((auth.role() = 'authenticated'::text));


--
-- Name: modulos Allow public read; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY "Allow public read" ON public.modulos FOR SELECT USING (true);


--
-- Name: levantamento_ativos Edição pelo criador ou admin; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY "Edição pelo criador ou admin" ON public.levantamento_ativos FOR UPDATE TO authenticated USING (((criado_por = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))));


--
-- Name: levantamento_ativos Inserção restrita; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY "Inserção restrita" ON public.levantamento_ativos FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'editor'::text, 'inventario_editor'::text]))))));


--
-- Name: levantamento_ativos Leitura autenticada; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY "Leitura autenticada" ON public.levantamento_ativos FOR SELECT TO authenticated USING (true);


--
-- Name: profiles admin_select_all_profiles; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY admin_select_all_profiles ON public.profiles FOR SELECT USING ((public.get_my_role() = 'admin'::text));


--
-- Name: profiles admin_update_profiles; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY admin_update_profiles ON public.profiles FOR UPDATE USING ((public.get_my_role() = 'admin'::text));


--
-- Name: areas; Type: ROW SECURITY; Schema: public; Owner: horus_admin
--

ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

--
-- Name: areas areas_delete; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY areas_delete ON public.areas FOR DELETE USING (public.can_user('areas'::text, 'delete'::text));


--
-- Name: areas areas_insert; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY areas_insert ON public.areas FOR INSERT WITH CHECK (public.can_user('areas'::text, 'edit'::text));


--
-- Name: areas areas_select; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY areas_select ON public.areas FOR SELECT USING (public.can_user('areas'::text, 'view'::text));


--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: horus_admin
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs audit_logs_admin_select; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY audit_logs_admin_select ON public.audit_logs FOR SELECT USING ((public.get_my_role() = 'admin'::text));


--
-- Name: audit_logs audit_logs_insert; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY audit_logs_insert ON public.audit_logs FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- Name: notificacoes delete_notificacoes; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY delete_notificacoes ON public.notificacoes FOR DELETE USING (public.can_user('notificacoes'::text, 'delete'::text));


--
-- Name: profiles delete_profile; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY delete_profile ON public.profiles FOR DELETE USING ((public.get_my_role() = 'admin'::text));


--
-- Name: registros delete_registros; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY delete_registros ON public.registros FOR DELETE USING (public.can_user('registros'::text, 'delete'::text));


--
-- Name: sistemas delete_sistemas; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY delete_sistemas ON public.sistemas FOR DELETE USING (public.can_user('sistemas'::text, 'delete'::text));


--
-- Name: equipamentos; Type: ROW SECURITY; Schema: public; Owner: horus_admin
--

ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;

--
-- Name: equipment_files; Type: ROW SECURITY; Schema: public; Owner: horus_admin
--

ALTER TABLE public.equipment_files ENABLE ROW LEVEL SECURITY;

--
-- Name: fontes_dados; Type: ROW SECURITY; Schema: public; Owner: horus_admin
--

ALTER TABLE public.fontes_dados ENABLE ROW LEVEL SECURITY;

--
-- Name: fontes_dados fontes_delete; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY fontes_delete ON public.fontes_dados FOR DELETE USING (public.can_user('fontes_dados'::text, 'delete'::text));


--
-- Name: fontes_dados fontes_insert; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY fontes_insert ON public.fontes_dados FOR INSERT WITH CHECK (public.can_user('fontes_dados'::text, 'edit'::text));


--
-- Name: fontes_dados fontes_select; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY fontes_select ON public.fontes_dados FOR SELECT USING (public.can_user('fontes_dados'::text, 'view'::text));


--
-- Name: notificacoes insert_notificacoes; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY insert_notificacoes ON public.notificacoes FOR INSERT WITH CHECK (public.can_user('notificacoes'::text, 'edit'::text));


--
-- Name: profiles insert_own_profile; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY insert_own_profile ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: registros insert_registros; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY insert_registros ON public.registros FOR INSERT WITH CHECK (public.can_user('registros'::text, 'edit'::text));


--
-- Name: sistemas insert_sistemas; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY insert_sistemas ON public.sistemas FOR INSERT WITH CHECK (public.can_user('sistemas'::text, 'edit'::text));


--
-- Name: levantamento_ativos; Type: ROW SECURITY; Schema: public; Owner: horus_admin
--

ALTER TABLE public.levantamento_ativos ENABLE ROW LEVEL SECURITY;

--
-- Name: license_files; Type: ROW SECURITY; Schema: public; Owner: horus_admin
--

ALTER TABLE public.license_files ENABLE ROW LEVEL SECURITY;

--
-- Name: modules; Type: ROW SECURITY; Schema: public; Owner: horus_admin
--

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

--
-- Name: modulos; Type: ROW SECURITY; Schema: public; Owner: horus_admin
--

ALTER TABLE public.modulos ENABLE ROW LEVEL SECURITY;

--
-- Name: notificacoes; Type: ROW SECURITY; Schema: public; Owner: horus_admin
--

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: horus_admin
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: registros; Type: ROW SECURITY; Schema: public; Owner: horus_admin
--

ALTER TABLE public.registros ENABLE ROW LEVEL SECURITY;

--
-- Name: role_permissions; Type: ROW SECURITY; Schema: public; Owner: horus_admin
--

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: role_permissions role_permissions_admin_manage; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY role_permissions_admin_manage ON public.role_permissions USING ((public.get_my_role() = 'admin'::text));


--
-- Name: role_permissions role_permissions_select; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY role_permissions_select ON public.role_permissions FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: notificacoes select_notificacoes; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY select_notificacoes ON public.notificacoes FOR SELECT USING (public.can_user('notificacoes'::text, 'view'::text));


--
-- Name: profiles select_own_profile; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY select_own_profile ON public.profiles FOR SELECT USING (((auth.uid() = id) OR (public.get_my_role() = 'admin'::text)));


--
-- Name: registros select_registros; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY select_registros ON public.registros FOR SELECT USING (public.can_user('registros'::text, 'view'::text));


--
-- Name: sistemas select_sistemas; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY select_sistemas ON public.sistemas FOR SELECT USING (public.can_user('sistemas'::text, 'view'::text));


--
-- Name: sistemas; Type: ROW SECURITY; Schema: public; Owner: horus_admin
--

ALTER TABLE public.sistemas ENABLE ROW LEVEL SECURITY;

--
-- Name: notificacoes update_notificacoes; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY update_notificacoes ON public.notificacoes FOR UPDATE USING (public.can_user('notificacoes'::text, 'edit'::text));


--
-- Name: profiles update_own_profile; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY update_own_profile ON public.profiles FOR UPDATE USING (((auth.uid() = id) OR (public.get_my_role() = 'admin'::text)));


--
-- Name: registros update_registros; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY update_registros ON public.registros FOR UPDATE USING (public.can_user('registros'::text, 'edit'::text));


--
-- Name: sistemas update_sistemas; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY update_sistemas ON public.sistemas FOR UPDATE USING (public.can_user('sistemas'::text, 'edit'::text));


--
-- Name: user_permissions; Type: ROW SECURITY; Schema: public; Owner: horus_admin
--

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_permissions user_permissions_admin; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY user_permissions_admin ON public.user_permissions USING ((public.get_my_role() = 'admin'::text));


--
-- Name: user_permissions user_permissions_own_select; Type: POLICY; Schema: public; Owner: horus_admin
--

CREATE POLICY user_permissions_own_select ON public.user_permissions FOR SELECT USING ((user_id = auth.uid()));


--
-- PostgreSQL database dump complete
--

\unrestrict 3xxakW5Yb56614NftoXZFvdH0UL1eg71aofdK75slV42BF6XvDF9cO0vhOfjSu0

