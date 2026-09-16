/**
 * Middleware de erro do Express (assinatura de 4 argumentos obrigatoria).
 * Padroniza o corpo das respostas de erro.
 */
export function tratarErros(erro, req, res, _next) {
  if (erro?.status) {
    res.status(erro.status).json({ mensagem: erro.message, campos: erro.campos ?? {} });
    return;
  }

  const erroDoBanco = traduzirErroDoBanco(erro);
  if (erroDoBanco) {
    res.status(erroDoBanco.status).json({ mensagem: erroDoBanco.mensagem, campos: {} });
    return;
  }

  console.error('Erro não tratado:', erro);
  res.status(500).json({ mensagem: 'Erro interno do servidor.', campos: {} });
}

/** Erro de negocio com status HTTP definido, para os services lancarem. */
export class ErroHttp extends Error {
  constructor(status, mensagem, campos) {
    super(mensagem);
    this.status = status;
    this.campos = campos;
  }
}

/**
 * Converte violacoes de regra do proprio banco em erro do cliente (4xx).
 *
 * Sao situacoes esperadas - excluir um cliente que ainda tem contratos, cadastrar
 * um nome repetido - e nao falhas do servidor. A mensagem e generica de
 * proposito: o detalhe do Postgres (nomes de tabela e constraint) fica fora da
 * resposta.
 */
export function traduzirErroDoBanco(erro) {
  switch (erro?.code) {
    case '23503': // foreign_key_violation
      return String(erro.detail ?? '').includes('still referenced')
        ? { status: 409, mensagem: 'Este registro está vinculado a outros cadastros.' }
        : { status: 400, mensagem: 'Um dos registros relacionados não existe.' };
    case '23505': // unique_violation
      return { status: 409, mensagem: 'Já existe um registro com esses dados.' };
    case '23502': // not_null_violation
      return { status: 400, mensagem: 'Campo obrigatório não informado.' };
    case '23514': // check_violation
    case '22P02': // invalid_text_representation (ex.: uuid mal formado)
    case '22007': // invalid_datetime_format
    case '22008': // datetime_field_overflow
    case '22003': // numeric_value_out_of_range
      return { status: 400, mensagem: 'Valor inválido.' };
    default:
      return null;
  }
}
