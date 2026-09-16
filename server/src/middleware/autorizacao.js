/**
 * Controle de acesso por modulo.
 *
 * Cada usuario tem os modulos liberados para ele (contratos, concursos,
 * provas), em qualquer combinacao. O nivel 4 (administrador) acessa todos os
 * modulos e a Administracao, sem depender da lista.
 */

export const NIVEL_ADMINISTRADOR = 4;

export const MODULOS = ['contratos', 'concursos', 'provas'];

export const ehAdministrador = (auth) => auth?.nivelAcesso === NIVEL_ADMINISTRADOR;

/** true se o usuario e administrador ou tem ao menos um dos modulos informados. */
export function temAcesso(auth, modulos) {
  return ehAdministrador(auth) || modulos.some((modulo) => auth?.modulos?.includes(modulo));
}

function exigir(permitido) {
  return (req, res, next) => {
    if (!req.auth) {
      // autenticar() roda sempre antes; isto so dispara em erro de composicao das rotas.
      res.status(401).json({ mensagem: 'Não autenticado.' });
      return;
    }

    if (!permitido(req.auth)) {
      res.status(403).json({ mensagem: 'Você não tem permissão para esta operação.' });
      return;
    }

    next();
  };
}

/**
 * Exige acesso a pelo menos um dos modulos informados.
 *
 * Uso: router.use(exigirModulo('provas')) no topo do arquivo de rotas do
 * modulo, para que nenhuma rota fique desprotegida por esquecimento.
 */
export function exigirModulo(...modulos) {
  return exigir((auth) => temAcesso(auth, modulos));
}

export function exigirAdministrador() {
  return exigir(ehAdministrador);
}

const METODOS_DE_LEITURA = new Set(['GET', 'HEAD']);

/**
 * Exige o modulo apenas para escrita; leitura passa direto.
 *
 * Qualquer metodo fora de GET/HEAD e tratado como escrita, entao um metodo
 * novo adicionado ao router ja nasce protegido. Deve vir depois de um
 * exigirModulo(...) que define quem pode ler.
 */
export function exigirModuloParaEscrita(...modulos) {
  const exigirParaEscrever = exigirModulo(...modulos);
  return (req, res, next) => {
    if (METODOS_DE_LEITURA.has(req.method)) {
      next();
      return;
    }
    exigirParaEscrever(req, res, next);
  };
}
