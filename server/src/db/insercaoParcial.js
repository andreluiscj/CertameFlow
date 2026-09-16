/**
 * Monta um INSERT so com as colunas enviadas, como o insert do Supabase fazia:
 * coluna ausente no corpo fica com o default do banco (p.ex. codigo gerado por
 * sequence, valor_questao = 0), em vez de receber null.
 *
 * Como em montarAtualizacao, os valores entram por parametro e os nomes de
 * coluna so saem de colunasPermitidas.
 */
export function montarInsercao({ tabela, colunasPermitidas, dados, retorno }) {
  const campos = Object.entries(dados ?? {}).filter(
    ([coluna, valor]) => colunasPermitidas.has(coluna) && valor !== undefined,
  );

  if (campos.length === 0) {
    return { sql: `insert into ${tabela} default values returning ${retorno}`, valores: [] };
  }

  const colunas = campos.map(([coluna]) => coluna).join(', ');
  const marcadores = campos.map((_, indice) => `$${indice + 1}`).join(', ');

  return {
    sql: `insert into ${tabela} (${colunas}) values (${marcadores}) returning ${retorno}`,
    valores: campos.map(([, valor]) => valor),
  };
}
