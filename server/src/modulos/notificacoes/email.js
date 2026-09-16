import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';

let transporte = null;

export const emailConfigurado = () => Boolean(env.smtp.host && env.smtp.remetente);

function obterTransporte() {
  transporte ??= nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.porta,
    // 465 usa TLS direto; as demais portas (587) sobem para TLS com STARTTLS.
    secure: env.smtp.porta === 465,
    auth: env.smtp.usuario ? { user: env.smtp.usuario, pass: env.smtp.senha } : undefined,
    connectionTimeout: 15_000,
  });
  return transporte;
}

/** Conecta e faz login no servidor SMTP, sem enviar nada. Lanca o erro do servidor se falhar. */
export async function verificarConexao() {
  await obterTransporte().verify();
}

const ERROS_DE_CONEXAO = new Set(['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EDNS', 'ENOTFOUND', 'ECONNREFUSED']);

/** Traduz a recusa do servidor de e-mail para uma mensagem que o administrador consiga resolver. */
export function descreverErroSmtp(erro) {
  if (erro?.code === 'EAUTH') {
    return 'O servidor de e-mail recusou o usuário ou a senha (SMTP_USER e SMTP_PASS no server/.env). '
      + 'No Gmail, use uma senha de app de 16 letras, e não a senha da conta.';
  }
  if (ERROS_DE_CONEXAO.has(erro?.code)) {
    return `Não foi possível conectar ao servidor de e-mail ${env.smtp.host}:${env.smtp.porta} `
      + '(confira SMTP_HOST e SMTP_PORT no server/.env).';
  }
  return `Falha no servidor de e-mail: ${erro?.message ?? erro}`;
}

export async function enviarEmail({ para, assunto, html, texto }) {
  await obterTransporte().sendMail({
    from: `CertameFlow <${env.smtp.remetente}>`,
    to: para,
    subject: assunto,
    html,
    text: texto,
  });
}
