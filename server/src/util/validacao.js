import { ErroHttp } from '../middleware/tratadorDeErros.js';

/**
 * Confere campos de texto obrigatorios e lanca 400 com a lista dos que faltam.
 * Recebe um objeto no formato { campo: 'mensagem para o usuario' }.
 */
export function exigirTextos(dados, obrigatorios) {
  lancarSeHouver(textosFaltando(dados, obrigatorios));
}

/** Mesmo teste de exigirTextos, mas devolve os problemas em vez de lancar. */
export function textosFaltando(dados, obrigatorios) {
  const campos = {};

  for (const [campo, mensagem] of Object.entries(obrigatorios)) {
    const valor = dados?.[campo];
    if (typeof valor !== 'string' || valor.trim() === '') {
      campos[campo] = mensagem;
    }
  }

  return campos;
}

/** Lanca 400 se houver ao menos um campo com problema. */
export function lancarSeHouver(campos) {
  if (Object.keys(campos).length > 0) {
    throw new ErroHttp(400, 'Dados inválidos.', campos);
  }
}

export function naoEncontrado(recurso, id) {
  return new ErroHttp(404, `${recurso} ${id} não encontrado.`);
}
