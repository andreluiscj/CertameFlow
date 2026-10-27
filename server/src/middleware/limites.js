import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

const JANELA = 15 * 60 * 1000;

/**
 * Limite de requisicoes por janela. A chave e o usuario autenticado (req.auth,
 * preenchido por `autenticar`) e, sem ele, o IP. Atras de proxy, o IP so e o do
 * cliente se TRUST_PROXY estiver configurado (ver README).
 * shortcut: contador em memoria, vale por processo; com varias instancias use um store compartilhado.
 */
export function limitar({ limite, porIp = false }) {
  return rateLimit({
    windowMs: JANELA,
    limit: limite,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => (!porIp && req.auth?.usuarioId ? `u:${req.auth.usuarioId}` : ipKeyGenerator(req.ip ?? '')),
    handler: (req, res) => {
      res.status(429).json({ mensagem: 'Muitas requisições. Aguarde alguns minutos e tente novamente.', campos: {} });
    },
  });
}

/** Geral em /api, antes da autenticacao, por IP: 1000 porque varios usuarios saem pelo mesmo NAT e cada tela faz varias chamadas. */
export const limiteGeral = limitar({ limite: 1000, porIp: true });

/** Operacoes sensiveis (senha, e-mail, upload): vai depois de `autenticar`, por usuario. */
export const limiteSensivel = () => limitar({ limite: 10 });
