import pg from 'pg';
import { env } from './env.js';

// Conversao de tipos no formato que o frontend espera:
// - numeric chega como numero, e nao como texto ("1500.00"), para que somas
//   no front nao virem concatenacao de strings;
// - date chega como o texto "AAAA-MM-DD", e nao como Date a meia-noite no fuso
//   do servidor, o que deslocaria a data em um dia dependendo do fuso.
const OID_NUMERIC = 1700;
const OID_DATE = 1082;
pg.types.setTypeParser(OID_NUMERIC, (valor) => (valor === null ? null : Number.parseFloat(valor)));
pg.types.setTypeParser(OID_DATE, (valor) => valor);

/**
 * Pool de conexoes com o Postgres do Supabase, compartilhado por toda a API.
 * Todo acesso ao banco passa por aqui, sempre com consulta parametrizada
 * ($1, $2, ...) - nunca por concatenacao de texto.
 */
export const pool = new pg.Pool({
  connectionString: env.bancoUrl,
  max: 10,
});

pool.on('error', (erro) => {
  // Erro em uma conexao ociosa do pool: registra, mas nao derruba o processo.
  console.error('Erro inesperado no pool de conexoes com o banco:', erro);
});

/**
 * Executa varias operacoes como uma unica transacao: ou todas sao gravadas, ou
 * nenhuma. A funcao recebe a conexao da transacao e deve repassa-la aos
 * repositories; qualquer erro lancado desfaz tudo e e propagado.
 */
export async function emTransacao(trabalho) {
  const cliente = await pool.connect();
  let conexaoPerdida = false;

  try {
    await cliente.query('begin');
    const resultado = await trabalho(cliente);
    await cliente.query('commit');
    return resultado;
  } catch (erro) {
    try {
      await cliente.query('rollback');
    } catch {
      // Sem conseguir desfazer, a conexao esta em estado desconhecido e nao
      // pode voltar ao pool.
      conexaoPerdida = true;
    }
    throw erro;
  } finally {
    cliente.release(conexaoPerdida);
  }
}
