--
-- PostgreSQL database dump
--

\restrict 60huVhkaad7I4fMeBydMZfBaPVl3UsGD3UDDuaCsQpS4dB6RARIwbkP23bRzMKs

-- Dumped from database version 17.6
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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: sistemas; Type: TABLE; Schema: public; Owner: -
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


--
-- Data for Name: sistemas; Type: TABLE DATA; Schema: public; Owner: -
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
-- Name: sistemas sistemas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sistemas
    ADD CONSTRAINT sistemas_pkey PRIMARY KEY (id);


--
-- Name: sistemas sistemas_sigla_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sistemas
    ADD CONSTRAINT sistemas_sigla_key UNIQUE (sigla);


--
-- Name: idx_sistemas_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sistemas_created_at ON public.sistemas USING btree (created_at DESC);


--
-- Name: idx_sistemas_sigla; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sistemas_sigla ON public.sistemas USING btree (sigla);


--
-- Name: sistemas delete_sistemas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY delete_sistemas ON public.sistemas FOR DELETE USING (public.can_user('sistemas'::text, 'delete'::text));


--
-- Name: sistemas insert_sistemas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY insert_sistemas ON public.sistemas FOR INSERT WITH CHECK (public.can_user('sistemas'::text, 'edit'::text));


--
-- Name: sistemas select_sistemas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY select_sistemas ON public.sistemas FOR SELECT USING (public.can_user('sistemas'::text, 'view'::text));


--
-- Name: sistemas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sistemas ENABLE ROW LEVEL SECURITY;

--
-- Name: sistemas update_sistemas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY update_sistemas ON public.sistemas FOR UPDATE USING (public.can_user('sistemas'::text, 'edit'::text));


--
-- PostgreSQL database dump complete
--

\unrestrict 60huVhkaad7I4fMeBydMZfBaPVl3UsGD3UDDuaCsQpS4dB6RARIwbkP23bRzMKs

