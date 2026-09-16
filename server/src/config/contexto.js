import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Contexto da requisicao em andamento, disponivel em qualquer ponto do codigo
 * que ela executa (services, repositories) sem precisar repassar req.
 *
 * Hoje guarda so o usuario autenticado, usado para registrar quem fez cada
 * atividade. E preenchido pelo middleware de autenticacao, depois de conferir
 * o token; nunca a partir de dados enviados pelo navegador.
 */
const armazenamento = new AsyncLocalStorage();

export function executarComUsuario(usuarioId, funcao) {
  return armazenamento.run({ usuarioId }, funcao);
}

export function usuarioAtual() {
  return armazenamento.getStore()?.usuarioId ?? null;
}
