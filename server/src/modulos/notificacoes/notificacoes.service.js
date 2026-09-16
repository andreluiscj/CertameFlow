import { env } from '../../config/env.js';
import { ErroHttp } from '../../middleware/tratadorDeErros.js';
import { descreverErroSmtp, emailConfigurado, enviarEmail, verificarConexao } from './email.js';
import * as repository from './notificacoes.repository.js';
import { montarResumo } from './resumo.js';

const INTERVALO_VERIFICACAO_MS = 10 * 60 * 1000;

/** Data ("AAAA-MM-DD") e hora atuais no fuso configurado, e nao no do servidor. */
export function agoraNoFuso(fusoHorario = env.notificacoes.fusoHorario, agora = new Date()) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: fusoHorario,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(agora)
      .map((p) => [p.type, p.value]),
  );
  return { data: `${partes.year}-${partes.month}-${partes.day}`, hora: Number(partes.hour) };
}

/**
 * Faz login no servidor de e-mail antes de montar os resumos. Uma senha errada
 * vira uma mensagem clara (502), em vez de uma falha por destinatario.
 */
async function exigirConexao() {
  try {
    await verificarConexao();
  } catch (erro) {
    throw new ErroHttp(502, descreverErroSmtp(erro));
  }
}

/** Monta e envia um e-mail por destinatario. Um envio que falha nao impede os demais. */
async function enviarParaTodos(hoje) {
  const [tarefas, parcelas, destinatarios] = await Promise.all([
    repository.listarTarefasAtrasadas(hoje),
    repository.listarParcelasAtrasadas(hoje),
    repository.listarDestinatarios(),
  ]);

  let enviados = 0;
  let falhas = 0;
  let erro = null;
  for (const usuario of destinatarios) {
    const resumo = montarResumo({ usuario, tarefas, parcelas, hoje, urlSistema: env.notificacoes.urlSistema });
    if (!resumo) continue;
    try {
      await enviarEmail({ para: usuario.email, ...resumo });
      enviados += 1;
    } catch (falha) {
      falhas += 1;
      erro ??= descreverErroSmtp(falha);
      console.error(`Falha ao enviar o resumo de atrasos para ${usuario.email}:`, falha.message);
    }
  }

  return { data: hoje, tarefas: tarefas.length, parcelas: parcelas.length, enviados, falhas, erro };
}

/**
 * Envio pela tela de Administracao ("Enviar agora"). Nao conta como o envio
 * automatico do dia, que continua acontecendo no horario configurado.
 */
export async function enviarAgora() {
  if (!emailConfigurado()) {
    throw new ErroHttp(503, 'Envio de e-mail não configurado: defina SMTP_HOST e SMTP_FROM no server/.env.');
  }
  await exigirConexao();
  return enviarParaTodos(agoraNoFuso().data);
}

/** Envio automatico: no maximo uma vez por dia, a partir do horario configurado. */
export async function enviarResumoDoDiaSePreciso(agora = new Date()) {
  const { data, hora } = agoraNoFuso(env.notificacoes.fusoHorario, agora);
  if (hora < env.notificacoes.hora) return null;
  // Conferido antes do login no SMTP, para nao conectar a cada 10 minutos depois do envio.
  if (await repository.jaEnviado(data)) return null;
  await exigirConexao();
  if (!(await repository.reservarEnvio(data))) return null;

  try {
    const resultado = await enviarParaTodos(data);
    if (resultado.enviados === 0 && resultado.falhas > 0) {
      await repository.cancelarEnvio(data);
    } else {
      await repository.concluirEnvio(data, resultado.enviados);
    }
    return resultado;
  } catch (erro) {
    await repository.cancelarEnvio(data).catch(() => {});
    throw erro;
  }
}

export async function situacao() {
  return {
    configurado: emailConfigurado(),
    hora: env.notificacoes.hora,
    fusoHorario: env.notificacoes.fusoHorario,
    ultimoEnvio: await repository.ultimoEnvio(),
  };
}

/**
 * Confere a cada 10 minutos se o resumo do dia ja pode sair. Verificar em
 * intervalos, e nao agendar um horario exato, faz o envio acontecer mesmo que
 * a API esteja desligada as 8h e so seja iniciada mais tarde.
 */
export function iniciarAgendador() {
  if (!emailConfigurado()) {
    console.log('Notificações por e-mail desativadas (SMTP_HOST não definido).');
    return null;
  }

  // A mesma falha (p.ex. senha errada) aparece no terminal uma vez, e nao a cada 10 minutos.
  let ultimoAviso = null;
  const avisar = (mensagem, detalhe) => {
    if (mensagem === ultimoAviso) return;
    ultimoAviso = mensagem;
    console.error(mensagem, detalhe ?? '');
  };

  const verificar = () =>
    enviarResumoDoDiaSePreciso()
      .then((resultado) => {
        ultimoAviso = null;
        if (resultado) console.log(`Resumo de atrasos de ${resultado.data}: ${resultado.enviados} e-mail(s) enviado(s).`);
      })
      .catch((erro) =>
        erro instanceof ErroHttp
          ? avisar(`Resumo de atrasos não enviado: ${erro.message}`)
          : avisar('Erro no envio do resumo de atrasos:', erro),
      );

  verificar();
  const intervalo = setInterval(verificar, INTERVALO_VERIFICACAO_MS);
  intervalo.unref();
  console.log(`Notificações por e-mail ativas: resumo diário a partir das ${env.notificacoes.hora}h.`);
  return intervalo;
}
