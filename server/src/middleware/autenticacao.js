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
async function verificar(req, res, next, bloquearTrocaDeSenha) {
  const cabecalho = req.get('authorization') ?? '';
  const [tipo, token] = cabecalho.split(' ');

  if (tipo !== 'Bearer' || !token) {
    res.status(401).json({ mensagem: 'Token ausente.' });
    return;
  }

  let usuarioId;
  let trocarSenha;
  let sessaoId;
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: env.supabaseIssuerUri,
      algorithms: ['ES256', 'RS256'],
      audience: 'authenticated',
    });
    if (payload.is_anonymous === true) throw new Error('login anonimo');
    usuarioId = payload.sub;
    sessaoId = payload.session_id;
    // app_metadata so o servidor altera, e a assinatura ja foi conferida.
    trocarSenha = payload.app_metadata?.trocar_senha === true;
  } catch {
    res.status(401).json({ mensagem: 'Token inválido ou expirado.' });
    return;
  }

  if (trocarSenha && bloquearTrocaDeSenha) {
    res.status(403).json({
      mensagem: 'Defina sua nova senha para continuar.',
      campos: {},
      codigo: 'troca_de_senha_obrigatoria',
    });
    return;
  }

  // Fora do try de proposito: uma falha do banco aqui e erro do servidor (500),
  // e nao pode ser confundida com token invalido.
  const acesso = await buscarAcesso(usuarioId, sessaoId);
  if (!acesso) {
    res.status(401).json({ mensagem: 'Sua sessão foi encerrada. Entre novamente.', campos: {} });
    return;
  }
  const { nivelAcesso, modulos } = acesso;

  req.auth = { usuarioId, nivelAcesso, modulos, trocarSenha };
  // O restante da requisicao roda dentro deste contexto, para o registro de
  // atividades saber quem e o usuario.
  executarComUsuario(usuarioId, next);
}

/** Recusa (403) quem ainda precisa trocar a senha provisoria. Usado por todos os routers. */
export const autenticar = (req, res, next) => verificar(req, res, next, true);

/** Igual a autenticar, mas deixa passar quem precisa trocar a senha. So para a rota de troca. */
export const autenticarPermitindoTrocaDeSenha = (req, res, next) => verificar(req, res, next, false);
