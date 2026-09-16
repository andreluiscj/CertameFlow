/**
 * Registra uma linha por requisicao: metodo, rota, status, tempo e usuario.
 * O corpo da requisicao nunca e registrado.
 *
 * Fica antes da autenticacao na cadeia de middlewares, mas so imprime depois
 * que a resposta termina - nesse momento req.auth ja foi preenchido, se a
 * requisicao chegou a ser autenticada.
 */
export function registrarRequisicoes(req, res, next) {
  const inicio = process.hrtime.bigint();

  res.on('finish', () => {
    const duracaoMs = Number(process.hrtime.bigint() - inicio) / 1_000_000;
    const usuario = req.auth?.usuarioId ?? 'anonimo';
    console.log(
      `${req.method} ${req.originalUrl} -> ${res.statusCode} (${duracaoMs.toFixed(0)} ms) usuario=${usuario}`,
    );
  });

  next();
}
