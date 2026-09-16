import { aspas, dataBR } from '../../util/formatacao.js';
import { validarListaDeIds } from '../../util/uuid.js';
import { exigirTextos, lancarSeHouver, naoEncontrado } from '../../util/validacao.js';
import { registroDeAtividades } from '../logs/atividades.service.js';
import * as repository from './eventos.repository.js';

const atividades = registroDeAtividades('concursos');

const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;
const FORMATO_HORA = /^\d{1,2}:\d{2}(:\d{2})?$/;

const doConcurso = (nome) => (nome ? ` do concurso ${aspas(nome)}` : '');

function registroDaTarefa(evento) {
  return { entidade: 'tarefa', entidadeId: evento.id };
}

export const listar = (concursoId) => repository.listar(concursoId);

export async function progresso(ids) {
  const lista = typeof ids === 'string' && ids !== '' ? ids.split(',') : [];
  if (!validarListaDeIds(lista)) lancarSeHouver({ ids: 'Lista de concursos inválida.' });
  return lista.length === 0 ? {} : repository.progresso(lista);
}

export async function criar(dados) {
  exigirTextos(dados, { titulo: 'Informe o título.', data: 'Informe a data.' });
  return atividades.registrando(async (db, registrar) => {
    const evento = await repository.inserir(dados, db);
    const concurso = await repository.nomeDoConcurso(evento.concurso_id, db);
    await registrar(
      'criou',
      `Criou a tarefa ${aspas(evento.titulo)} (${dataBR(evento.data)})${doConcurso(concurso)}.`,
      registroDaTarefa(evento),
    );
    return evento;
  });
}

export async function atualizar(id, alteracoes) {
  if (alteracoes?.titulo !== undefined) exigirTextos(alteracoes, { titulo: 'Informe o título.' });
  return atividades.registrando(async (db, registrar) => {
    const antes = await repository.buscarPorId(id, db);
    if (!antes) throw naoEncontrado('Tarefa', id);
    const evento = await repository.atualizar(id, alteracoes, db);
    const concurso = await repository.nomeDoConcurso(evento.concurso_id, db);

    if (antes.concluido !== evento.concluido) {
      await registrarConclusao(registrar, evento, concurso);
    }
    const outrasMudancas = ['titulo', 'data', 'hora', 'cor'].some((c) => antes[c] !== evento[c]);
    if (outrasMudancas) {
      await registrar(
        'alterou',
        `Alterou a tarefa ${aspas(evento.titulo)} (${dataBR(evento.data)})${doConcurso(concurso)}.`,
        registroDaTarefa(evento),
      );
    }
    return evento;
  });
}

export async function excluir(id) {
  return atividades.registrando(async (db, registrar) => {
    const evento = await repository.excluir(id, db);
    if (!evento) throw naoEncontrado('Tarefa', id);
    const concurso = await repository.nomeDoConcurso(evento.concurso_id, db);
    await registrar(
      'excluiu',
      `Excluiu a tarefa ${aspas(evento.titulo)} (${dataBR(evento.data)})${doConcurso(concurso)}.`,
      registroDaTarefa(evento),
    );
  });
}

function registrarConclusao(registrar, evento, concurso) {
  return registrar(
    evento.concluido ? 'concluiu' : 'desconcluiu',
    `${evento.concluido ? 'Concluiu a tarefa' : 'Desmarcou a conclusão da tarefa'} ${aspas(evento.titulo)}${doConcurso(concurso)}.`,
    registroDaTarefa(evento),
  );
}

/**
 * Se todas as tarefas do concurso ficaram concluidas, finaliza o concurso, como
 * a tela ja fazia. Devolve o nome do concurso finalizado, ou null.
 */
async function finalizarSeTudoConcluido(concursoId, db, registrar) {
  if (!concursoId || !(await repository.todasConcluidas(concursoId, db))) return null;
  const concurso = await repository.finalizarConcurso(concursoId, db);
  if (!concurso) return null;
  if (!concurso.ja_finalizado) {
    await registrar(
      'finalizou',
      `Concurso ${aspas(concurso.nome)} finalizado automaticamente: todas as tarefas foram concluídas.`,
      { entidade: 'concurso', entidadeId: concursoId },
    );
  }
  return concurso.nome;
}

/**
 * Conclui ou desmarca uma tarefa, registrando quem fez. Ao concluir a ultima
 * tarefa pendente, finaliza o concurso.
 */
export async function definirConcluida(id, dados) {
  if (typeof dados?.concluido !== 'boolean') lancarSeHouver({ concluido: 'Informe se a tarefa está concluída.' });

  return atividades.registrando(async (db, registrar) => {
    const [evento] = await repository.definirConcluidas([{ id, concluido: dados.concluido }], db);
    const atual = evento ?? (await repository.buscarPorId(id, db));
    if (!atual) throw naoEncontrado('Tarefa', id);

    let concursoFinalizado = null;
    if (evento) {
      const concurso = await repository.nomeDoConcurso(evento.concurso_id, db);
      await registrarConclusao(registrar, evento, concurso);
    }
    if (atual.concluido) {
      concursoFinalizado = await finalizarSeTudoConcluido(atual.concurso_id, db, registrar);
    }
    return { evento: await repository.buscarPorId(id, db), concurso_finalizado: concursoFinalizado };
  });
}

/** Salva de uma vez as conclusoes alteradas na tela do concurso. */
export async function salvarConclusoes(dados) {
  const alteracoes = dados?.alteracoes;
  if (
    !Array.isArray(alteracoes) ||
    !validarListaDeIds(alteracoes.map((a) => a?.id)) ||
    alteracoes.some((a) => typeof a.concluido !== 'boolean')
  ) {
    lancarSeHouver({ alteracoes: 'Lista de alterações inválida.' });
  }

  return atividades.registrando(async (db, registrar) => {
    const alteradas = await repository.definirConcluidas(alteracoes, db);
    const nomes = new Map();
    for (const evento of alteradas) {
      if (!nomes.has(evento.concurso_id)) {
        nomes.set(evento.concurso_id, await repository.nomeDoConcurso(evento.concurso_id, db));
      }
      await registrarConclusao(registrar, evento, nomes.get(evento.concurso_id));
    }
    return { alteradas: alteradas.length };
  });
}

/** Conclui ou desmarca todas as tarefas do concurso. */
export async function definirTodasConcluidas(concursoId, dados) {
  if (typeof dados?.concluido !== 'boolean') lancarSeHouver({ concluido: 'Informe se as tarefas estão concluídas.' });

  return atividades.registrando(async (db, registrar) => {
    const alteradas = await repository.definirTodasConcluidas(concursoId, dados.concluido, db);
    const concurso = await repository.nomeDoConcurso(concursoId, db);
    for (const evento of alteradas) {
      await registrarConclusao(registrar, evento, concurso);
    }
    return alteradas;
  });
}

export async function excluirDoConcurso(concursoId) {
  return atividades.registrando(async (db, registrar) => {
    const concurso = await repository.nomeDoConcurso(concursoId, db);
    const total = await repository.excluirDoConcurso(concursoId, db);
    if (total > 0) {
      await registrar('excluiu', `Excluiu todas as ${total} tarefas${doConcurso(concurso)}.`, {
        entidade: 'concurso',
        entidadeId: concursoId,
      });
    }
    return { excluidas: total };
  });
}

/**
 * Importa tarefas de um arquivo para o concurso. Linhas com titulo, data ou
 * hora invalidos sao ignoradas e contadas como falhas, como a tela ja fazia;
 * as validas entram numa unica instrucao, com um registro de quem importou.
 */
export async function importar(concursoId, dados) {
  const eventos = dados?.eventos;
  if (!Array.isArray(eventos) || eventos.length === 0) {
    lancarSeHouver({ eventos: 'Informe ao menos uma tarefa.' });
  }

  const validos = eventos.filter(
    (e) =>
      typeof e?.titulo === 'string' &&
      e.titulo.trim() !== '' &&
      typeof e.data === 'string' &&
      FORMATO_DATA.test(e.data) &&
      !Number.isNaN(Date.parse(e.data)) &&
      (e.hora == null || (typeof e.hora === 'string' && FORMATO_HORA.test(e.hora))),
  );
  const nomeArquivo = typeof dados.arquivo === 'string' && dados.arquivo.trim() ? dados.arquivo.trim() : null;

  return atividades.registrando(async (db, registrar) => {
    const concurso = await repository.nomeDoConcurso(concursoId, db);
    if (!concurso) throw naoEncontrado('Concurso', concursoId);

    const inseridos = validos.length > 0 ? await repository.inserirVarios(concursoId, validos, db) : [];
    if (inseridos.length > 0) {
      await registrar(
        'importou',
        `Importou ${inseridos.length} tarefas${nomeArquivo ? ` do arquivo ${aspas(nomeArquivo)}` : ''}${doConcurso(concurso)}.`,
        { entidade: 'concurso', entidadeId: concursoId },
      );
    }
    return { importados: inseridos.length, falhas: eventos.length - inseridos.length };
  });
}
