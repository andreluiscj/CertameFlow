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

function inteiro(nome, padrao) {
  const valor = Number.parseInt(process.env[nome] ?? '', 10);
  return Number.isInteger(valor) ? valor : padrao;
}

const supabaseIssuerUri = obrigatoria('SUPABASE_ISSUER_URI');

export const env = {
  porta: Number(process.env.PORT ?? 8081),

  bancoUrl: obrigatoria('DATABASE_URL'),

  supabaseIssuerUri,
  supabaseJwksUri: obrigatoria('SUPABASE_JWKS_URI'),

  // URL do projeto e chave service_role: usadas so no servidor, para gerenciar
  // usuarios (Administracao) e guardar comprovantes no Storage. Opcionais: sem
  // a chave, apenas essas duas funcoes ficam indisponiveis.
  supabaseUrl: process.env.SUPABASE_URL ?? supabaseIssuerUri.replace(/\/auth\/v1\/?$/, ''),
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',

  corsOrigens: (process.env.CORS_ORIGENS ?? 'http://localhost:8080')
    .split(',')
    .map((origem) => origem.trim())
    .filter(Boolean),

  // Resumo diario de atrasos por e-mail. Sem SMTP_HOST, o envio fica desligado.
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    porta: inteiro('SMTP_PORT', 587),
    usuario: process.env.SMTP_USER ?? '',
    senha: process.env.SMTP_PASS ?? '',
    remetente: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? '',
  },
  notificacoes: {
    hora: inteiro('NOTIFICACOES_HORA', 8),
    fusoHorario: process.env.NOTIFICACOES_FUSO ?? 'America/Sao_Paulo',
    // Endereco do frontend, para o link "Abrir o CertameFlow" no e-mail.
    urlSistema: process.env.URL_SISTEMA ?? 'http://localhost:8080',
  },
};
