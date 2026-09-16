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
  nivel_acesso integer not null default 1,   -- 1 = Contratos, 2 = Concursos, 3 = Provas
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- O usuário lê o próprio perfil e só pode alterar nome e setor: o
-- nivel_acesso fica fora do grant para que ninguém se promova sozinho.
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
  insert into public.usuarios (id, nome, email, nivel_acesso)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.raw_user_meta_data->>'full_name'),
    new.email,
    1
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
  modulo text not null check (modulo in ('concursos', 'contratos', 'provas')),
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

-- =====================================================================
-- 6) CONTROLE DE ACESSO POR NÍVEL (GRANT + RLS)
--    Níveis cumulativos: 1 = Contratos, 2 = Concursos, 3 = Provas.
--    concurso_cadastros e concurso_eventos são legíveis a partir do nível 1
--    porque o módulo Contratos exibe e vincula concursos.
-- =====================================================================
create or replace function public.nivel_acesso_atual()
returns integer
language sql
stable
security definer
set search_path = public
as $fn$
  select coalesce((select u.nivel_acesso from public.usuarios u where u.id = auth.uid()), 0);
$fn$;

revoke all on function public.nivel_acesso_atual() from public;
grant execute on function public.nivel_acesso_atual() to authenticated;

do $$
declare
  tabela text;
  nivel integer;
  nivel_leitura integer;
begin
  for tabela, nivel, nivel_leitura in
    select * from (values
      -- módulo Contratos
      ('contrato_cliente_tipo',          1, 1),
      ('contrato_clientes',              1, 1),
      ('contrato_responsaveis',          1, 1),
      ('contrato_tipo_processo',         1, 1),
      ('contrato_status',                1, 1),
      ('contrato_parcela_status',        1, 1),
      ('contrato_conta_recebimento',     1, 1),
      ('contrato_forma_pagamento',       1, 1),
      ('contrato_cadastros',             1, 1),
      ('contrato_parcelas',              1, 1),
      ('contrato_cadastro_responsaveis', 1, 1),

      -- módulo Concursos
      ('concurso_cadastros',             2, 1),
      ('concurso_eventos',               2, 1),
      ('concurso_tipos',                 2, 2),
      ('concurso_status',                2, 2),
      ('concurso_observacoes',           2, 2),
      ('concurso_notas_titulos',         2, 2),

      -- módulo Provas
      ('provas_elaboradores_sexo',       3, 3),
      ('provas_bancos',                  3, 3),
      ('provas_areas_atuacao',           3, 3),
      ('provas_elaboradores',            3, 3),
      ('provas_elaborador_areas',        3, 3),
      ('provas_niveis',                  3, 3),
      ('provas_status',                  3, 3),
      ('provas_cadastro',                3, 3),
      ('provas_cargos',                  3, 3),
      ('provas_disciplinas',             3, 3),
      ('provas_disciplina_niveis',       3, 3),
      ('provas_concurso_encerramentos',  3, 3)
    ) as v(tabela, nivel, nivel_leitura)
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', tabela);
    execute format('grant all on public.%I to service_role', tabela);
    execute format('revoke all on public.%I from anon', tabela);
    execute format('alter table public.%I enable row level security', tabela);

    execute format(
      'create policy %I on public.%I for select to authenticated using (public.nivel_acesso_atual() >= %s)',
      tabela || '_leitura', tabela, nivel_leitura);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.nivel_acesso_atual() >= %s)',
      tabela || '_inclusao', tabela, nivel);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.nivel_acesso_atual() >= %s) with check (public.nivel_acesso_atual() >= %s)',
      tabela || '_alteracao', tabela, nivel, nivel);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.nivel_acesso_atual() >= %s)',
      tabela || '_exclusao', tabela, nivel);
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
--  2) ajuste public.usuarios.nivel_acesso (1=Contratos, 2=Concursos, 3=Provas);
--  3) preencha o .env do frontend e o server/.env com os dados do projeto.
-- =====================================================================
