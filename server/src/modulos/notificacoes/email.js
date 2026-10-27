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
    // Exige STARTTLS fora da 465: evita downgrade para texto puro (a senha provisoria viaja por aqui).
    requireTLS: env.smtp.porta !== 465,
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
  // O detalhe fica so no log do servidor (a mensagem do SMTP pode expor host e usuario).
  console.error('Falha no SMTP:', erro?.code, erro?.message);
  if (erro?.code === 'EAUTH') {
    return 'O servidor de e-mail recusou o usuário ou a senha. Confira a configuração de e-mail do servidor.';
  }
  if (ERROS_DE_CONEXAO.has(erro?.code)) return 'Falha ao conectar ao servidor de e-mail.';
  return 'Falha ao enviar o e-mail.';
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
