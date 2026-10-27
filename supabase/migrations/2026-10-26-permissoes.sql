-- =====================================================================
-- M1 (ADR 0003): fechar o acesso direto do navegador as tabelas dos modulos.
-- Rodar no SQL Editor do Supabase (papel postgres), numa so execucao.
-- ANTES: rodar as 4 consultas de verificacao do ADR 0003 com o DATABASE_URL
-- (current_user = postgres; nenhuma tabela com outro dono nem force RLS).
-- Reversao por tabela: grant select, insert, update, delete on public.<tabela> to authenticated;
-- NAO reverter usuarios: la o correto e so select.
-- Verificado no banco real antes: current_user postgres, bypassrls, sem outros donos, sem force RLS.
-- A API Express nao usa o papel authenticated, entao nada muda para ela.
-- =====================================================================

-- Efeito global: o revoke de execute em functions (item 3) vale para funcoes novas em todos os schemas;
-- funcao nova chamada por policy precisa de grant execute explicito para authenticated.
begin;

-- 1) Nada para anon/authenticated em nenhuma tabela ou sequence do public
--    (cobre as 29 tabelas dos modulos, usuarios, logs e as criadas so no painel).
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- 2) usuarios: o navegador so le o proprio perfil (o frontend so faz SELECT); nome e setor mudam pela API.
--    O revoke all acima ja removeu tambem os grants por coluna.
grant select on public.usuarios to authenticated;
drop policy if exists "usuarios_update_self" on public.usuarios;

-- 3) Objetos novos no public nao nascem abertos para o PostgREST.
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;
alter default privileges for role postgres revoke execute on functions from public;

-- 4) Funcoes SECURITY DEFINER.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.tem_acesso(text[]) from public, anon;
grant execute on function public.tem_acesso(text[]) to authenticated;

-- rls_auto_enable() existe no banco real e nao no schema.sql: so mexe se existir.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;

commit;

-- Depois de aplicar, conferir os criterios de aceite do ADR 0003 e:
--  a) select grantee, privilege_type from information_schema.role_table_grants
--      where table_schema='public' and table_name='usuarios' and grantee in ('anon','authenticated');
--      -> authenticated so SELECT; anon nenhum.
--  b) select grantee, column_name, privilege_type from information_schema.column_privileges
--      where table_schema='public' and table_name='usuarios' and grantee in ('anon','authenticated') and privilege_type='UPDATE';
--      -> nenhuma linha (nenhuma coluna com UPDATE).
--  c) PATCH /rest/v1/usuarios?id=eq.<proprio id> com {"nivel_acesso":4} e JWT de usuario comum -> recusado (42501).
