/**
 * Monta um UPDATE que altera apenas os campos enviados, preservando o
 * comportamento do PATCH que o front ja fazia contra o Supabase: o que nao vem
 * no corpo nao e tocado, e um campo enviado como null e de fato limpo.
 *
 * Os valores entram sempre por parametro. O unico trecho montado com texto e a
 * lista de colunas, e ela so aceita nomes presentes em colunasEditaveis - nunca
 * um nome vindo da requisicao sem essa conferencia.
 *
 * Devolve null quando nenhum campo enviado e editavel, para o repository decidir
 * o que fazer (normalmente, apenas buscar o registro).
 *
 * Tabelas sem a coluna updated_at (p.ex. concurso_eventos) passam
 * comUpdatedAt: false.
 */
export function montarAtualizacao({ tabela, colunasEditaveis, id, alteracoes, retorno, comUpdatedAt = true }) {
  const campos = Object.entries(alteracoes ?? {}).filter(([coluna]) => colunasEditaveis.has(coluna));

  if (campos.length === 0) {
    return null;
  }

  const atribuicoes = campos.map(([coluna], indice) => `${coluna} = $${indice + 2}`).join(', ');

  return {
    sql: `update ${tabela}
        set ${atribuicoes}${comUpdatedAt ? ', updated_at = now()' : ''}
      where id = $1
      returning ${retorno}`,
    valores: [id, ...campos.map(([, valor]) => valor)],
  };
}
