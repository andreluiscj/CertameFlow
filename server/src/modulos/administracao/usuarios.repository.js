import { pool } from '../../config/db.js';
import { montarAtualizacao } from '../../db/atualizacaoParcial.js';

const COLUNAS = 'id, nome, email, setor, nivel_acesso, modulos, receber_notificacoes, created_at, updated_at';

const COLUNAS_EDITAVEIS = new Set(['nome', 'setor', 'nivel_acesso', 'modulos', 'receber_notificacoes']);

export async function listar() {
  const { rows } = await pool.query(`select ${COLUNAS} from usuarios order by nome nulls last, email`);
  return rows;
}

export async function buscarPorId(id, db = pool) {
  const { rows } = await db.query(`select ${COLUNAS} from usuarios where id = $1`, [id]);
  return rows[0] ?? null;
}

/**
 * Grava o perfil de um usuario recem-criado no Auth. O gatilho
 * on_auth_user_created normalmente ja inseriu a linha sem acesso; por isso o
 * upsert completa os dados em vez de falhar por chave repetida.
 */
export async function gravarPerfil({ id, email, nome, setor, nivel_acesso, modulos }, db = pool) {
  const { rows } = await db.query(
    `insert into usuarios (id, email, nome, setor, nivel_acesso, modulos)
     values ($1, $2, $3, $4, $5, $6::text[])
     on conflict (id) do update
        set email = excluded.email, nome = excluded.nome, setor = excluded.setor,
            nivel_acesso = excluded.nivel_acesso, modulos = excluded.modulos, updated_at = now()
     returning ${COLUNAS}`,
    [id, email, nome, setor, nivel_acesso, modulos],
  );
  return rows[0];
}

export async function atualizar(id, alteracoes, db = pool) {
  const atualizacao = montarAtualizacao({
    tabela: 'usuarios',
    colunasEditaveis: COLUNAS_EDITAVEIS,
    id,
    alteracoes,
    retorno: COLUNAS,
  });
  if (!atualizacao) return buscarPorId(id, db);
  const { rows } = await db.query(atualizacao.sql, atualizacao.valores);
  return rows[0] ?? null;
}

export async function excluir(id, db = pool) {
  const { rows } = await db.query(`delete from usuarios where id = $1 returning ${COLUNAS}`, [id]);
  return rows[0] ?? null;
}
