import 'dotenv/config';

/**
 * Le e valida as variaveis de ambiente uma unica vez, na inicializacao.
 * Se faltar alguma, a aplicacao para aqui, com uma mensagem clara, em vez de
 * falhar mais tarde de forma confusa na primeira requisicao.
 */
function obrigatoria(nome) {
  const valor = process.env[nome];
  if (!valor) {
    throw new Error(`Defina a variavel de ambiente ${nome} (veja .env.example).`);
  }
  return valor;
}

export const env = {
  porta: Number(process.env.PORT ?? 8081),

  bancoUrl: obrigatoria('DATABASE_URL'),

  supabaseIssuerUri: obrigatoria('SUPABASE_ISSUER_URI'),
  supabaseJwksUri: obrigatoria('SUPABASE_JWKS_URI'),

  corsOrigens: (process.env.CORS_ORIGENS ?? 'http://localhost:8080')
    .split(',')
    .map((origem) => origem.trim())
    .filter(Boolean),
};
