import { pool } from '../../config/db.js';
import { env } from '../../config/env.js';

/**
 * Confere que a sessao do token ainda existe (auth.sessions) e le o acesso do
 * usuario na tabela usuarios: o nivel (4 = administrador)
 * e os modulos liberados para ele.
 *
 * O acesso nunca vem do token nem de qualquer campo enviado pelo navegador:
 * o token diz apenas quem e a pessoa, e o que ela pode fazer e decidido aqui,
 * no servidor, a cada requisicao.
 */
export async function buscarAcesso(usuarioId, sessaoId) {
  // Sem session_id no token nao ha como confirmar a sessao: recusa sem consultar o banco.
  if (!sessaoId) return null;
  // null = sessao encerrada ou vencida (logout, senha trocada, usuario excluido) ou sem perfil.
  const resultado = await pool.query(
    `select u.nivel_acesso, u.modulos
       from auth.sessions s
       join public.usuarios u on u.id = s.user_id
      where s.id = $2
        and s.user_id = $1
        and (s.not_after is null or s.not_after > now())
        and s.created_at > now() - make_interval(hours => $3)`,
    [usuarioId, sessaoId, env.sessaoMaxHoras],
  );
  const usuario = resultado.rows[0];
  if (!usuario) return null;
  return { nivelAcesso: usuario.nivel_acesso, modulos: usuario.modulos };
}
