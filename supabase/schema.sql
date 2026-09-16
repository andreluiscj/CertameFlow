-- =====================================================================
-- CertameFlow - Schema do banco (Concursos + Provas + Contratos)
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Função utilitária de updated_at
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================================
-- 1) USUÁRIOS / PERFIL (sincronizado com auth.users)
-- =====================================================================
create table if not exists public.usuarios (
  id uuid primary key,                       -- mesmo id de auth.users
  nome text,
  email text not null,
  setor text,
  -- 4 = administrador: todos os módulos e a Administração.
  -- 0 = usuário comum: acessa só os módulos marcados em "modulos".
  nivel_acesso integer not null default 0 check (nivel_acesso in (0, 4)),
  modulos text[] not null default '{}'
    check (modulos <@ array['contratos', 'concursos', 'provas']),
  receber_notificacoes boolean not null default true,  -- resumo diário de atrasos por e-mail
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- O usuário lê o próprio perfil e só pode alterar nome e setor: nível e
-- módulos ficam fora do grant para que ninguém se dê acesso sozinho.
grant select on public.usuarios to authenticated;
grant update (nome, setor) on public.usuarios to authenticated;
grant all on public.usuarios to service_role;
revoke all on public.usuarios from anon;
alter table public.usuarios enable row level security;

create policy "usuarios_select_self" on public.usuarios
  for select to authenticated using (id = auth.uid());
create policy "usuarios_update_self" on public.usuarios
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create trigger set_updated_at_usuarios before update on public.usuarios
  for each row execute function public.set_updated_at();

-- Cria o perfil automaticamente a cada novo cadastro no Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Nasce sem acesso: o administrador escolhe os módulos na Administração.
  insert into public.usuarios (id, nome, email, nivel_acesso, modulos)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.raw_user_meta_data->>'full_name'),
    new.email,
    0,
    '{}'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- 2) MÓDULO CONCURSOS
-- =====================================================================
create table if not exists public.concurso_tipos (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.concurso_status (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.concurso_cadastros (
  id uuid primary key default gen_random_uuid(),
  concurso_id text not null,                 -- código/nº do concurso
  nome text not null,
  tipo text not null,
  uf text not null,
  cidade text not null,
  cor text not null default '#3B82F6',
  status text not null default 'Em andamento',
  observacoes text,
  nota_titulo boolean not null default false,
  cod_projeto text,                          -- código usado pelo módulo Provas
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_concurso_cadastros_status on public.concurso_cadastros(status);

create table if not exists public.concurso_eventos (
  id uuid primary key default gen_random_uuid(),
  concurso_id uuid references public.concurso_cadastros(id) on delete cascade,
  titulo text not null,
  data date not null,
  hora time,
  cor text,
  concluido boolean not null default false,
  -- quem concluiu e quando (limpos ao desmarcar); o nome é copiado no momento
  concluido_por uuid references public.usuarios(id) on delete set null,
  concluido_por_nome text,
  concluido_em timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_concurso_eventos_concurso on public.concurso_eventos(concurso_id);
create index if not exists idx_concurso_eventos_data on public.concurso_eventos(data);

create table if not exists public.concurso_observacoes (
  id uuid primary key default gen_random_uuid(),
  ano integer not null,
  mes integer not null,
  conteudo text,
  usuario_id uuid references public.usuarios(id) on delete set null,
  usuario_nome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_concurso_observacoes_ano_mes
  on public.concurso_observacoes(ano, mes, created_at);

create table if not exists public.concurso_notas_titulos (
  id uuid primary key default gen_random_uuid(),
  concurso_id uuid not null references public.concurso_cadastros(id) on delete cascade,
  junto_inscricoes boolean not null default false,
  data_inicio date,
  data_termino date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (concurso_id)
);

create trigger set_updated_at_concurso_cadastros before update on public.concurso_cadastros
  for each row execute function public.set_updated_at();
create trigger set_updated_at_concurso_observacoes before update on public.concurso_observacoes
  for each row execute function public.set_updated_at();
create trigger set_updated_at_concurso_notas_titulos before update on public.concurso_notas_titulos
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 3) MÓDULO PROVAS
-- =====================================================================
create table if not exists public.provas_elaboradores_sexo (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.provas_bancos (
  id uuid primary key default gen_random_uuid(),
  numero integer not null unique,
  nome text not null,
  created_at timestamptz not null default now()
);

create sequence if not exists public.provas_areas_atuacao_codigo_seq;
create table if not exists public.provas_areas_atuacao (
  id uuid primary key default gen_random_uuid(),
  codigo integer not null default nextval('public.provas_areas_atuacao_codigo_seq') unique,
  descricao text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists public.provas_elaboradores_codigo_seq;
create table if not exists public.provas_elaboradores (
  id uuid primary key default gen_random_uuid(),
  codigo integer not null default nextval('public.provas_elaboradores_codigo_seq') unique,
  nome text not null,
  email text,
  celular text,
  cpf text,
  data_nascimento date,
  pis text,
  sexo_id uuid references public.provas_elaboradores_sexo(id) on delete set null,
  banco_id uuid references public.provas_bancos(id) on delete set null,
  tipo_conta text,                            -- Conta Corrente / Poupança / Salário / Pagamento
  agencia text,
  conta text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.provas_elaborador_areas (
  elaborador_id uuid not null references public.provas_elaboradores(id) on delete cascade,
  area_id uuid not null references public.provas_areas_atuacao(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (elaborador_id, area_id)
);

create sequence if not exists public.provas_niveis_codigo_seq;
create table if not exists public.provas_niveis (
  id uuid primary key default gen_random_uuid(),
  codigo integer not null default nextval('public.provas_niveis_codigo_seq') unique,
  descricao text not null,
  valor_questao numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists public.provas_status_codigo_seq;
create table if not exists public.provas_status (
  id uuid primary key default gen_random_uuid(),
  codigo integer not null default nextval('public.provas_status_codigo_seq') unique,
  descricao text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Prova (caderno) de um concurso
create table if not exists public.provas_cadastro (
  id uuid primary key default gen_random_uuid(),
  concurso_id uuid not null references public.concurso_cadastros(id) on delete cascade,
  codigo integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (concurso_id, codigo)
);

create sequence if not exists public.provas_cargos_codigo_seq;
create table if not exists public.provas_cargos (
  id uuid primary key default gen_random_uuid(),
  codigo integer not null default nextval('public.provas_cargos_codigo_seq'),
  descricao text not null,
  concurso_id uuid references public.concurso_cadastros(id) on delete cascade,
  prova_id uuid references public.provas_cadastro(id) on delete cascade,
  nivel_id uuid references public.provas_niveis(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_provas_cargos_prova on public.provas_cargos(prova_id);

-- Disciplinas pertencem à PROVA (todos os cargos da prova compartilham o conteúdo)
create table if not exists public.provas_disciplinas (
  id uuid primary key default gen_random_uuid(),
  prova_id uuid not null references public.provas_cadastro(id) on delete cascade,
  disciplina text not null,
  tipo text,
  questoes integer not null default 0,
  total_questoes_prova integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_provas_disciplinas_prova on public.provas_disciplinas(prova_id);

-- Nível/elaboração por disciplina (base dos pedidos de questões e do financeiro)
create table if not exists public.provas_disciplina_niveis (
  id uuid primary key default gen_random_uuid(),
  disciplina_id uuid not null references public.provas_disciplinas(id) on delete cascade,
  nivel_id uuid references public.provas_niveis(id) on delete set null,
  qtd integer not null default 0,
  elaborador_id uuid references public.provas_elaboradores(id) on delete set null,
  status_id uuid references public.provas_status(id) on delete set null,
  contrato_status_id uuid,                    -- status do contrato/RPA (opcional)
  contabilizar boolean not null default true,
  prazo_entrega date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_provas_disc_niveis_disciplina on public.provas_disciplina_niveis(disciplina_id);

-- Encerramento manual do concurso no módulo Provas
create table if not exists public.provas_concurso_encerramentos (
  concurso_id uuid primary key references public.concurso_cadastros(id) on delete cascade,
  encerrado_em timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create trigger set_updated_at_provas_areas before update on public.provas_areas_atuacao
  for each row execute function public.set_updated_at();
create trigger set_updated_at_provas_elaboradores before update on public.provas_elaboradores
  for each row execute function public.set_updated_at();
create trigger set_updated_at_provas_niveis before update on public.provas_niveis
  for each row execute function public.set_updated_at();
create trigger set_updated_at_provas_status before update on public.provas_status
  for each row execute function public.set_updated_at();
create trigger set_updated_at_provas_cadastro before update on public.provas_cadastro
  for each row execute function public.set_updated_at();
create trigger set_updated_at_provas_cargos before update on public.provas_cargos
  for each row execute function public.set_updated_at();
create trigger set_updated_at_provas_disciplinas before update on public.provas_disciplinas
  for each row execute function public.set_updated_at();
create trigger set_updated_at_provas_disc_niveis before update on public.provas_disciplina_niveis
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 4) MÓDULO CONTRATOS
-- =====================================================================
create table if not exists public.contrato_cliente_tipo (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.contrato_clientes (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  cidade text not null,
  uf text not null,
  tipo_id uuid not null references public.contrato_cliente_tipo(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contrato_responsaveis (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.contrato_clientes(id) on delete cascade,
  nome text not null,
  cargo text,
  email text,
  telefone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contrato_tipo_processo (
  id uuid primary key default gen_random_uuid(),
  descricao text not null unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.contrato_status (
  id uuid primary key default gen_random_uuid(),
  descricao text not null unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.contrato_parcela_status (
  id uuid primary key default gen_random_uuid(),
  descricao text not null unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.contrato_conta_recebimento (
  id uuid primary key default gen_random_uuid(),
  banco text not null,
  convenio text,
  conta text,
  agencia text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contrato_forma_pagamento (
  id uuid primary key default gen_random_uuid(),
  quantidade_parcelas integer not null default 1,
  valor_parcela numeric(12,2) not null default 0,
  data_pagamento date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contrato_cadastros (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.contrato_clientes(id) on delete restrict,
  tipo_processo_id uuid not null references public.contrato_tipo_processo(id) on delete restrict,
  forma_pagamento_id uuid references public.contrato_forma_pagamento(id) on delete set null,
  conta_recebimento_id uuid references public.contrato_conta_recebimento(id) on delete set null,
  status_id uuid not null references public.contrato_status(id) on delete restrict,
  data_vigencia date,
  valor_total numeric(14,2) not null default 0,
  concurso_id uuid references public.concurso_cadastros(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_contrato_cadastros_cliente on public.contrato_cadastros(cliente_id);

create table if not exists public.contrato_parcelas (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references public.contrato_cadastros(id) on delete cascade,
  ordem integer not null,
  percentual numeric(7,3) not null default 0,
  data_pagamento date,
  status_id uuid references public.contrato_parcela_status(id) on delete set null,
  pago boolean not null default false,
  data_pagamento_efetivo date,
  -- comprovante de pagamento, guardado no bucket privado "comprovantes"
  comprovante_caminho text,
  comprovante_nome text,
  comprovante_tipo text,
  comprovante_tamanho integer,
  comprovante_enviado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contrato_id, ordem)
);

create table if not exists public.contrato_cadastro_responsaveis (
  contrato_id uuid not null references public.contrato_cadastros(id) on delete cascade,
  -- restrict: responsável vinculado a contrato não pode ser excluído
  responsavel_id uuid not null references public.contrato_responsaveis(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (contrato_id, responsavel_id)
);

create trigger set_updated_at_contrato_clientes before update on public.contrato_clientes
  for each row execute function public.set_updated_at();
create trigger set_updated_at_contrato_responsaveis before update on public.contrato_responsaveis
  for each row execute function public.set_updated_at();
create trigger set_updated_at_contrato_conta before update on public.contrato_conta_recebimento
  for each row execute function public.set_updated_at();
create trigger set_updated_at_contrato_fp before update on public.contrato_forma_pagamento
  for each row execute function public.set_updated_at();
create trigger set_updated_at_contrato_cadastros before update on public.contrato_cadastros
  for each row execute function public.set_updated_at();
create trigger set_updated_at_contrato_parcelas before update on public.contrato_parcelas
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 5) REGISTRO DE ATIVIDADES (logs)
--    Quem criou, alterou, excluiu, importou ou concluiu cada registro.
--    Gravado pela API na mesma transação da alteração. Não tem policies
--    para "authenticated": o navegador não lê nem grava direto nesta tabela.
-- =====================================================================
create table if not exists public.logs (
  id uuid primary key default gen_random_uuid(),
  modulo text not null check (modulo in ('concursos', 'contratos', 'provas', 'administracao')),
  acao text not null,
  descricao text not null,
  entidade text,
  entidade_id uuid,
  usuario_id uuid references public.usuarios(id) on delete set null,
  usuario_nome text,                         -- copiado no momento do registro
  -- clock_timestamp(), e não now(): várias gravações na mesma transação
  -- precisam de horários distintos para aparecerem em ordem na tela.
  created_at timestamptz not null default clock_timestamp()
);
create index if not exists logs_modulo_data_idx on public.logs (modulo, created_at desc);

alter table public.logs enable row level security;
revoke all on public.logs from anon, authenticated;
grant all on public.logs to service_role;

-- Um registro por dia em que o resumo de atrasos foi enviado por e-mail.
-- Impede o envio em dobro quando a API é reiniciada no mesmo dia.
create table if not exists public.notificacoes_envios (
  data date primary key,
  destinatarios integer not null default 0,
  enviado_em timestamptz not null default now()
);

alter table public.notificacoes_envios enable row level security;
revoke all on public.notificacoes_envios from anon, authenticated;
grant all on public.notificacoes_envios to service_role;

-- Bucket privado dos comprovantes de pagamento. Sem policies para
-- "authenticated": envio e download passam só pela API.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprovantes', 'comprovantes', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- =====================================================================
-- 6) CONTROLE DE ACESSO POR MÓDULO (GRANT + RLS)
--    Cada usuário acessa os módulos marcados em usuarios.modulos, em
--    qualquer combinação. O administrador (nivel_acesso = 4) acessa todos.
--    concurso_cadastros e concurso_eventos podem ser lidos por quem tem
--    qualquer módulo, porque Contratos e Provas exibem concursos e tarefas.
-- =====================================================================
create or replace function public.tem_acesso(modulos_aceitos text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select coalesce(
    (select u.nivel_acesso = 4 or u.modulos && modulos_aceitos
       from public.usuarios u
      where u.id = auth.uid()),
    false);
$fn$;

revoke all on function public.tem_acesso(text[]) from public;
grant execute on function public.tem_acesso(text[]) to authenticated;

do $$
declare
  tabela text;
  modulo_escrita text;
  modulos_leitura text[];
begin
  for tabela, modulo_escrita, modulos_leitura in
    select * from (values
      -- módulo Contratos
      ('contrato_cliente_tipo',          'contratos', array['contratos']),
      ('contrato_clientes',              'contratos', array['contratos']),
      ('contrato_responsaveis',          'contratos', array['contratos']),
      ('contrato_tipo_processo',         'contratos', array['contratos']),
      ('contrato_status',                'contratos', array['contratos']),
      ('contrato_parcela_status',        'contratos', array['contratos']),
      ('contrato_conta_recebimento',     'contratos', array['contratos']),
      ('contrato_forma_pagamento',       'contratos', array['contratos']),
      ('contrato_cadastros',             'contratos', array['contratos']),
      ('contrato_parcelas',              'contratos', array['contratos']),
      ('contrato_cadastro_responsaveis', 'contratos', array['contratos']),

      -- módulo Concursos (as duas primeiras são lidas pelos outros módulos)
      ('concurso_cadastros',             'concursos', array['contratos', 'concursos', 'provas']),
      ('concurso_eventos',               'concursos', array['contratos', 'concursos', 'provas']),
      ('concurso_tipos',                 'concursos', array['concursos']),
      ('concurso_status',                'concursos', array['concursos']),
      ('concurso_observacoes',           'concursos', array['concursos']),
      ('concurso_notas_titulos',         'concursos', array['concursos']),

      -- módulo Provas
      ('provas_elaboradores_sexo',       'provas', array['provas']),
      ('provas_bancos',                  'provas', array['provas']),
      ('provas_areas_atuacao',           'provas', array['provas']),
      ('provas_elaboradores',            'provas', array['provas']),
      ('provas_elaborador_areas',        'provas', array['provas']),
      ('provas_niveis',                  'provas', array['provas']),
      ('provas_status',                  'provas', array['provas']),
      ('provas_cadastro',                'provas', array['provas']),
      ('provas_cargos',                  'provas', array['provas']),
      ('provas_disciplinas',             'provas', array['provas']),
      ('provas_disciplina_niveis',       'provas', array['provas']),
      ('provas_concurso_encerramentos',  'provas', array['provas'])
    ) as v(tabela, modulo_escrita, modulos_leitura)
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', tabela);
    execute format('grant all on public.%I to service_role', tabela);
    execute format('revoke all on public.%I from anon', tabela);
    execute format('alter table public.%I enable row level security', tabela);

    -- remove as policies anteriores, para o arquivo poder ser executado de novo
    execute format('drop policy if exists %I on public.%I', tabela || '_leitura', tabela);
    execute format('drop policy if exists %I on public.%I', tabela || '_inclusao', tabela);
    execute format('drop policy if exists %I on public.%I', tabela || '_alteracao', tabela);
    execute format('drop policy if exists %I on public.%I', tabela || '_exclusao', tabela);

    execute format(
      'create policy %I on public.%I for select to authenticated using (public.tem_acesso(%L::text[]))',
      tabela || '_leitura', tabela, modulos_leitura);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.tem_acesso(array[%L]))',
      tabela || '_inclusao', tabela, modulo_escrita);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.tem_acesso(array[%L])) with check (public.tem_acesso(array[%L]))',
      tabela || '_alteracao', tabela, modulo_escrita, modulo_escrita);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.tem_acesso(array[%L]))',
      tabela || '_exclusao', tabela, modulo_escrita);
  end loop;
end $$;

grant usage on schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant all on all sequences in schema public to service_role;
revoke usage on schema public from anon;

-- =====================================================================
-- 7) DADOS INICIAIS (listas de apoio)
-- =====================================================================
insert into public.concurso_tipos (nome, ordem) values
  ('Concurso Público', 1), ('Processo Seletivo', 2)
on conflict (nome) do nothing;

insert into public.concurso_status (nome, ordem) values
  ('Em andamento', 1), ('Pausado', 2), ('Finalizado', 3)
on conflict (nome) do nothing;

insert into public.provas_elaboradores_sexo (nome, ordem) values
  ('Masculino', 1), ('Feminino', 2)
on conflict (nome) do nothing;

insert into public.provas_niveis (descricao, valor_questao) values
  ('Ensino Fundamental', 0), ('Ensino Médio', 0),
  ('Ensino Técnico', 0), ('Ensino Superior', 0)
on conflict do nothing;

insert into public.provas_status (descricao) values
  ('Solicitar'), ('Solicitado'), ('Recebido'), ('Revisado'), ('Finalizado')
on conflict (descricao) do nothing;

insert into public.contrato_cliente_tipo (nome) values
  ('Prefeitura'), ('Câmara'), ('Autarquia')
on conflict (nome) do nothing;

insert into public.contrato_tipo_processo (descricao) values
  ('Concurso Público'), ('Processo Seletivo')
on conflict (descricao) do nothing;

insert into public.contrato_status (descricao) values
  ('Em andamento'), ('Concluído'), ('Cancelado')
on conflict (descricao) do nothing;

insert into public.contrato_parcela_status (descricao) values
  ('Pendente'), ('Pago'), ('Atrasado'), ('Cancelado')
on conflict (descricao) do nothing;

-- Bancos: preencha conforme necessidade (usados no cadastro de elaboradores)
insert into public.provas_bancos (numero, nome) values
  (1,'Banco do Brasil'), (33,'Santander'), (104,'Caixa Econômica Federal'),
  (237,'Bradesco'), (260,'Nu Pagamentos'), (341,'Itaú Unibanco'),
  (336,'Banco C6'), (077,'Banco Inter'), (748,'Sicredi'), (756,'Sicoob')
on conflict (numero) do nothing;

-- =====================================================================
-- FIM. Depois de executar:
--  1) crie os usuários em Authentication (sem cadastro anônimo);
--  2) ajuste public.usuarios.nivel_acesso do primeiro administrador para 4;
--     os demais usuários e os módulos de cada um são definidos na tela de
--     Administração;
--  3) preencha o .env do frontend e o server/.env com os dados do projeto.
-- =====================================================================
