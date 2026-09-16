import { createRemoteJWKSet, jwtVerify } from 'jose';
import { executarComUsuario } from '../config/contexto.js';
import { env } from '../config/env.js';
import { buscarAcesso } from '../modulos/usuarios/perfilRepository.js';

// Busca e guarda em cache as chaves publicas (JWKS) do Supabase. O jose renova
// o cache sozinho quando necessario.
const jwks = createRemoteJWKSet(new URL(env.supabaseJwksUri));

/**
 * Confere a assinatura do token emitido pelo Supabase Auth e, em seguida,
 * consulta o acesso do usuario no banco (nivel e modulos). Anexa o resultado
 * em req.auth para os proximos middlewares e controllers usarem.
 *
 * O login continua sendo feito pelo Supabase: esta funcao nao emite nem
 * renova token, so verifica um token que ja existe.
 */
export async function autenticar(req, res, next) {
  const cabecalho = req.get('authorization') ?? '';
  const [tipo, token] = cabecalho.split(' ');

  if (tipo !== 'Bearer' || !token) {
    res.status(401).json({ mensagem: 'Token ausente.' });
    return;
  }

  let usuarioId;
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: env.supabaseIssuerUri,
      algorithms: ['ES256', 'RS256'],
    });
    usuarioId = payload.sub;
  } catch {
    res.status(401).json({ mensagem: 'Token inválido ou expirado.' });
    return;
  }

  // Fora do try de proposito: uma falha do banco aqui e erro do servidor (500),
  // e nao pode ser confundida com token invalido.
  const { nivelAcesso, modulos } = await buscarAcesso(usuarioId);

  req.auth = { usuarioId, nivelAcesso, modulos };
  // O restante da requisicao roda dentro deste contexto, para o registro de
  // atividades saber quem e o usuario.
  executarComUsuario(usuarioId, next);
}
