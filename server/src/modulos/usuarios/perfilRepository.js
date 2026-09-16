import { pool } from '../../config/db.js';

/**
 * Le o acesso do usuario direto da tabela usuarios: o nivel (4 = administrador)
 * e os modulos liberados para ele.
 *
 * O acesso nunca vem do token nem de qualquer campo enviado pelo navegador:
 * o token diz apenas quem e a pessoa, e o que ela pode fazer e decidido aqui,
 * no servidor, a cada requisicao.
 */
export async function buscarAcesso(usuarioId) {
  const resultado = await pool.query(
    'select nivel_acesso, modulos from usuarios where id = $1',
    [usuarioId],
  );
  const usuario = resultado.rows[0];
  return {
    nivelAcesso: usuario?.nivel_acesso ?? 0,
    modulos: usuario?.modulos ?? [],
  };
}
