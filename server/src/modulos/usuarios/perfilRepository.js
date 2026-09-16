import { pool } from '../../config/db.js';

/**
 * Le o nivel de acesso direto da tabela usuarios.
 *
 * O nivel nunca vem do token nem de qualquer campo enviado pelo navegador:
 * o token diz apenas quem e a pessoa, e quanto ela pode fazer e decidido
 * aqui, no servidor, a cada requisicao.
 */
export async function buscarNivelAcesso(usuarioId) {
  const resultado = await pool.query(
    'select nivel_acesso from usuarios where id = $1',
    [usuarioId],
  );
  return resultado.rows[0]?.nivel_acesso ?? 0;
}
