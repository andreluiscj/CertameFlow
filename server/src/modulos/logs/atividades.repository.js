import { pool } from '../../config/db.js';

/**
 * Grava uma atividade. Recebe a conexao da transacao da alteracao, para que o
 * registro e a alteracao sejam gravados juntos (ou nenhum dos dois).
 *
 * O nome do usuario e copiado de usuarios no momento do registro.
 */
export async function inserir(db, { modulo, acao, descricao, entidade, entidadeId, usuarioId }) {
  await db.query(
    `insert into logs (modulo, acao, descricao, entidade, entidade_id, usuario_id, usuario_nome)
     select $1, $2, $3, $4, $5, u.id, u.nome
       from (select $6::uuid as id) as eu
       left join usuarios u on u.id = eu.id`,
    [modulo, acao, descricao, entidade ?? null, entidadeId ?? null, usuarioId],
  );
}

/** Atividades do modulo, da mais recente para a mais antiga. */
export async function listar(modulo, limite) {
  const { rows } = await pool.query(
    `select id, modulo, acao, descricao, entidade, entidade_id, usuario_id, usuario_nome, created_at
       from logs
      where modulo = $1
      order by created_at desc
      limit $2`,
    [modulo, limite],
  );
  return rows;
}
