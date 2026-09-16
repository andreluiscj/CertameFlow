import { aspas } from '../../util/formatacao.js';
import { FORMATO_UUID } from '../../util/uuid.js';
import { lancarSeHouver, naoEncontrado } from '../../util/validacao.js';
import { usuarioAtual } from '../../config/contexto.js';
import { registroDeAtividades } from '../logs/atividades.service.js';
import * as repository from './complementos.repository.js';
import { nomeDoConcurso } from './eventos.repository.js';

const atividades = registroDeAtividades('concursos');

export const listarTipos = () => repository.listarTipos();
export const listarStatus = () => repository.listarStatus();
export const listarNotas = () => repository.listarNotas();
export const buscarNotaDoConcurso = (concursoId) => repository.buscarNotaDoConcurso(concursoId);

function validarMes(ano, mes) {
  const a = Number(ano);
  const m = Number(mes);
  if (!Number.isInteger(a) || !Number.isInteger(m) || m < 1 || m > 12) {
    lancarSeHouver({ mes: 'Mês ou ano inválido.' });
  }
  return { ano: a, mes: m };
}

const mesAno = (ano, mes) => `${String(mes).padStart(2, '0')}/${ano}`;

export async function listarObservacoes(ano, mes) {
  const periodo = validarMes(ano, mes);
  return repository.listarObservacoes(periodo.ano, periodo.mes);
}

export async function criarObservacao(ano, mes, dados) {
  const periodo = validarMes(ano, mes);
  const conteudo = typeof dados?.conteudo === 'string' ? dados.conteudo.trim() : '';
  if (!conteudo) lancarSeHouver({ conteudo: 'Informe a observação.' });

  return atividades.registrando(async (db, registrar) => {
    const observacao = await repository.inserirObservacao(periodo.ano, periodo.mes, conteudo, usuarioAtual(), db);
    await registrar('criou', `Adicionou uma observação na agenda de ${mesAno(periodo.ano, periodo.mes)}.`, {
      entidade: 'observacao',
      entidadeId: observacao.id,
    });
    return observacao;
  });
}

export async function excluirObservacao(id) {
  return atividades.registrando(async (db, registrar) => {
    const observacao = await repository.excluirObservacao(id, db);
    if (!observacao) throw naoEncontrado('Observação', id);
    const autor = observacao.usuario_nome ? ` de ${aspas(observacao.usuario_nome)}` : '';
    await registrar(
      'excluiu',
      `Excluiu a observação${autor} da agenda de ${mesAno(observacao.ano, observacao.mes)}.`,
      { entidade: 'observacao' },
    );
  });
}

export async function salvarNota(dados) {
  if (typeof dados?.concurso_id !== 'string' || !FORMATO_UUID.test(dados.concurso_id)) {
    lancarSeHouver({ concurso_id: 'Informe o concurso.' });
  }
  return atividades.registrando(async (db, registrar) => {
    const nota = await repository.salvarNota(dados, db);
    const concurso = await nomeDoConcurso(nota.concurso_id, db);
    await registrar('alterou', `Salvou a nota de títulos do concurso ${aspas(concurso)}.`, {
      entidade: 'nota_titulo',
      entidadeId: nota.id,
    });
    return nota;
  });
}

export async function atualizarNota(id, alteracoes) {
  return atividades.registrando(async (db, registrar) => {
    const nota = await repository.atualizarNota(id, alteracoes, db);
    if (!nota) throw naoEncontrado('Nota de título', id);
    const concurso = await nomeDoConcurso(nota.concurso_id, db);
    await registrar('alterou', `Alterou a nota de títulos do concurso ${aspas(concurso)}.`, {
      entidade: 'nota_titulo',
      entidadeId: id,
    });
    return nota;
  });
}

export async function excluirNota(id) {
  return atividades.registrando(async (db, registrar) => {
    const nota = await repository.excluirNota(id, db);
    if (!nota) throw naoEncontrado('Nota de título', id);
    const concurso = await nomeDoConcurso(nota.concurso_id, db);
    await registrar('excluiu', `Excluiu a nota de títulos do concurso ${aspas(concurso)}.`, {
      entidade: 'nota_titulo',
      entidadeId: id,
    });
  });
}
