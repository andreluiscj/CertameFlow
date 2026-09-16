/**
 * O Express 4 nao encaminha ao tratador de erros as rejeicoes de funcoes
 * async. Este invólucro faz isso, para que um erro de banco num controller
 * vire resposta 500 padronizada em vez de derrubar a requisicao sem resposta.
 */
export function assincrono(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
