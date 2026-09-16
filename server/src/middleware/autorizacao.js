/**
 * Exige que o usuario autenticado tenha pelo menos o nivel informado.
 *
 * Uso: router.use(exigirNivel(2)) no topo do arquivo de rotas do modulo,
 * para que nenhuma rota fique desprotegida por esquecimento.
 */
export function exigirNivel(nivelMinimo) {
  return (req, res, next) => {
    if (!req.auth) {
      // autenticar() roda sempre antes; isto so dispara em erro de composicao das rotas.
      res.status(401).json({ mensagem: 'Não autenticado.' });
      return;
    }

    if (req.auth.nivelAcesso < nivelMinimo) {
      res.status(403).json({ mensagem: 'Você não tem permissão para esta operação.' });
      return;
    }

    next();
  };
}

const METODOS_DE_LEITURA = new Set(['GET', 'HEAD']);

/**
 * Exige o nivel informado apenas para escrita; leitura passa direto.
 *
 * Qualquer metodo fora de GET/HEAD e tratado como escrita, entao um metodo
 * novo adicionado ao router ja nasce exigindo o nivel maior. Deve vir depois
 * de um exigirNivel(n) que define o piso de leitura do modulo.
 */
export function exigirNivelParaEscrita(nivelMinimo) {
  const exigir = exigirNivel(nivelMinimo);
  return (req, res, next) => {
    if (METODOS_DE_LEITURA.has(req.method)) {
      next();
      return;
    }
    exigir(req, res, next);
  };
}
