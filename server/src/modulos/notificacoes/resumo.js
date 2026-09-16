import { temAcesso } from '../../middleware/autorizacao.js';
import { dataBR } from '../../util/formatacao.js';

const escapar = (texto) =>
  String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const moeda = (valor) => Number(valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const plural = (n, singular, pluralizado) => `${n} ${n === 1 ? singular : pluralizado}`;

/** Dias entre a data ("AAAA-MM-DD") e hoje ("AAAA-MM-DD"). */
export function diasDeAtraso(data, hoje) {
  return Math.round((Date.parse(hoje) - Date.parse(String(data).slice(0, 10))) / 86_400_000);
}

function tabela(cabecalhos, linhas) {
  const th = cabecalhos
    .map((c) => `<th style="text-align:left;padding:6px 10px;border-bottom:2px solid #e2e8f0;font-size:13px">${c}</th>`)
    .join('');
  const tr = linhas
    .map(
      (colunas) =>
        `<tr>${colunas
          .map((c) => `<td style="padding:6px 10px;border-bottom:1px solid #edf2f7;font-size:13px">${c}</td>`)
          .join('')}</tr>`,
    )
    .join('');
  return `<table style="border-collapse:collapse;width:100%;margin:8px 0 24px"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
}

/**
 * Monta o e-mail de um usuario so com o que ele pode ver: parcelas para quem
 * tem o modulo Contratos, tarefas para quem tem Concursos, e tudo para o
 * administrador. Devolve null quando nao ha nada atrasado para esse usuario.
 */
export function montarResumo({ usuario, tarefas, parcelas, hoje, urlSistema }) {
  const acesso = { nivelAcesso: usuario.nivel_acesso, modulos: usuario.modulos };
  const suasTarefas = temAcesso(acesso, ['concursos']) ? tarefas : [];
  const suasParcelas = temAcesso(acesso, ['contratos']) ? parcelas : [];

  if (suasTarefas.length === 0 && suasParcelas.length === 0) return null;

  const partes = [];
  const textos = [];

  if (suasTarefas.length > 0) {
    partes.push(`<h2 style="font-size:16px;margin:0">Tarefas atrasadas (${suasTarefas.length})</h2>`);
    partes.push(
      tabela(
        ['Data', 'Atraso', 'Concurso', 'Tarefa'],
        suasTarefas.map((t) => [
          dataBR(t.data),
          plural(diasDeAtraso(t.data, hoje), 'dia', 'dias'),
          escapar(t.concurso_nome ?? '-'),
          escapar(t.titulo),
        ]),
      ),
    );
    textos.push(
      `TAREFAS ATRASADAS (${suasTarefas.length})`,
      ...suasTarefas.map((t) => `- ${dataBR(t.data)} | ${t.concurso_nome ?? '-'} | ${t.titulo}`),
      '',
    );
  }

  if (suasParcelas.length > 0) {
    partes.push(`<h2 style="font-size:16px;margin:0">Parcelas atrasadas (${suasParcelas.length})</h2>`);
    partes.push(
      tabela(
        ['Vencimento', 'Atraso', 'Cliente', 'Parcela', 'Valor'],
        suasParcelas.map((p) => [
          dataBR(p.data_pagamento),
          plural(diasDeAtraso(p.data_pagamento, hoje), 'dia', 'dias'),
          `${escapar(p.cliente)} (${escapar(p.cidade)}/${escapar(p.uf)})`,
          `${p.ordem}ª`,
          moeda(p.valor),
        ]),
      ),
    );
    textos.push(
      `PARCELAS ATRASADAS (${suasParcelas.length})`,
      ...suasParcelas.map((p) => `- ${dataBR(p.data_pagamento)} | ${p.cliente} | parcela ${p.ordem} | ${moeda(p.valor)}`),
      '',
    );
  }

  const resumoDoAssunto = [
    suasTarefas.length > 0 && plural(suasTarefas.length, 'tarefa atrasada', 'tarefas atrasadas'),
    suasParcelas.length > 0 && plural(suasParcelas.length, 'parcela atrasada', 'parcelas atrasadas'),
  ]
    .filter(Boolean)
    .join(' e ');

  const saudacao = `Olá, ${usuario.nome || usuario.email}.`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#1a202c;max-width:720px">
  <p>${escapar(saudacao)}</p>
  <p>Este é o resumo de pendências do CertameFlow em ${dataBR(hoje)}.</p>
  ${partes.join('\n  ')}
  <p><a href="${escapar(urlSistema)}" style="color:#2563eb">Abrir o CertameFlow</a></p>
  <p style="font-size:12px;color:#718096">Você recebe este e-mail porque as notificações estão ativas no seu usuário. Para deixar de receber, peça ao administrador do sistema.</p>
</div>`;

  const texto = [saudacao, `Resumo de pendências do CertameFlow em ${dataBR(hoje)}.`, '', ...textos, urlSistema].join('\n');

  return { assunto: `CertameFlow: ${resumoDoAssunto}`, html, texto };
}
