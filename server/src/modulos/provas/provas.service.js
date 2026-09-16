import { aspas, dataBR } from '../../util/formatacao.js';
import { FORMATO_UUID } from '../../util/uuid.js';
import { lancarSeHouver, naoEncontrado } from '../../util/validacao.js';
import { registroDeAtividades } from '../logs/atividades.service.js';
import * as repository from './provas.repository.js';

const atividades = registroDeAtividades('provas');
const doConcurso = (id) => ({ entidade: 'concurso', entidadeId: id });

export async function buscarCompleta(id) {
  const prova = await repository.buscarCompleta(id);
  if (!prova) throw naoEncontrado('Prova', id);
  return prova;
}

export const listarPorConcurso = (concursoId) => repository.listarPorConcurso(concursoId);
export const listarResumoFinanceiro = (concursoId) => repository.listarResumoFinanceiro(concursoId);
export const contarPorConcurso = () => repository.contarPorConcurso();
export const listarDisciplinaNiveis = (provaId) => repository.listarDisciplinaNiveis(provaId);
export const buscarBaseRpa = (concursoId) => repository.buscarBaseRpa(concursoId);
export const listarEncerramentos = () => repository.listarEncerramentos();

/**
 * Exclui a prova e seus dependentes numa unica transacao, para que uma falha
 * no meio nao deixe a prova pela metade.
 */
export async function excluir(id) {
  return atividades.registrando(async (db, registrar) => {
    const prova = await repository.excluir(id, db);
    if (!prova) throw naoEncontrado('Prova', id);
    await registrar('excluiu', `Excluiu a prova ${prova.codigo} do concurso ${aspas(prova.concurso_nome)}.`, {
      entidade: 'prova',
      entidadeId: id,
    });
  });
}

/** Descreve o que mudou numa linha de nivel/elaboracao, com os nomes ja resolvidos. */
function descreverAlteracaoDaLinha(alteracoes, linha) {
  const partes = [];
  if (alteracoes.nivel_id !== undefined) partes.push(`nível ${aspas(linha.nivel ?? '-')}`);
  if (alteracoes.elaborador_id !== undefined) partes.push(`elaborador ${aspas(linha.elaborador ?? '-')}`);
  if (alteracoes.status_id !== undefined) partes.push(`status ${aspas(linha.status ?? '-')}`);
  if (alteracoes.contrato_status_id !== undefined) partes.push('situação do contrato');
  if (alteracoes.contabilizar !== undefined) partes.push(alteracoes.contabilizar ? 'marcou para contabilizar' : 'desmarcou contabilizar');
  if (alteracoes.prazo_entrega !== undefined) {
    partes.push(alteracoes.prazo_entrega ? `prazo ${dataBR(alteracoes.prazo_entrega)}` : 'prazo removido');
  }
  if (alteracoes.qtd !== undefined) partes.push(`quantidade ${alteracoes.qtd}`);
  return partes.join('; ');
}

export async function atualizarDisciplinaNivel(id, alteracoes) {
  return atividades.registrando(async (db, registrar) => {
    const linha = await repository.atualizarDisciplinaNivel(id, alteracoes, db);
    if (!linha) throw naoEncontrado('Nível da disciplina', id);
    const contexto = await repository.descreverDisciplinaNivel(id, db);
    const mudancas = descreverAlteracaoDaLinha(alteracoes ?? {}, contexto ?? {});
    if (mudancas && contexto) {
      await registrar(
        'alterou',
        `Alterou ${aspas(contexto.disciplina)} da prova ${contexto.prova} do concurso ${aspas(contexto.concurso)}: ${mudancas}.`,
        { entidade: 'disciplina_nivel', entidadeId: id },
      );
    }
    return linha;
  });
}

export async function encerrar(concursoId) {
  return atividades.registrando(async (db, registrar) => {
    const encerramento = await repository.encerrar(concursoId, db);
    const concurso = await repository.nomeDoConcurso(concursoId, db);
    await registrar('encerrou', `Encerrou os pedidos de questões do concurso ${aspas(concurso)}.`, doConcurso(concursoId));
    return encerramento;
  });
}

export async function reabrir(concursoId) {
  return atividades.registrando(async (db, registrar) => {
    if (await repository.reabrir(concursoId, db)) {
      const concurso = await repository.nomeDoConcurso(concursoId, db);
      await registrar('reabriu', `Reabriu os pedidos de questões do concurso ${aspas(concurso)}.`, doConcurso(concursoId));
    }
  });
}

/**
 * Registra a emissao da declaracao do elaborador na tabela de logs do modulo.
 * Quem emitiu vem do usuario autenticado, e nao do corpo da requisicao.
 */
export async function registrarCertificado(dados) {
  const campos = {};
  if (typeof dados?.elaborador_nome !== 'string') campos.elaborador_nome = 'Informe o nome do elaborador.';
  if (dados?.elaborador_id != null && !FORMATO_UUID.test(String(dados.elaborador_id))) {
    campos.elaborador_id = 'Elaborador inválido.';
  }
  lancarSeHouver(campos);

  const elaboradorId = dados.elaborador_id ?? null;
  return atividades.registrando(async (_db, registrar) => {
    await registrar('emitiu', `Emitiu declaração para o elaborador ${aspas(dados.elaborador_nome)}.`, {
      entidade: 'certificado',
      entidadeId: elaboradorId,
    });
    return { elaborador_id: elaboradorId };
  });
}

const texto = (v) => typeof v === 'string' && v.trim() !== '';
const numero = (v) => typeof v === 'number' && Number.isFinite(v);

function validarLinhasDeImportacao(linhas) {
  if (!Array.isArray(linhas) || linhas.length === 0) {
    lancarSeHouver({ linhas: 'Informe ao menos uma linha.' });
  }
  const campos = {};
  linhas.forEach((l, i) => {
    if (!texto(l?.cargo)) campos[`linhas[${i}].cargo`] = 'Cargo vazio.';
    if (!texto(l?.nivel)) campos[`linhas[${i}].nivel`] = 'Nível vazio.';
    if (!texto(l?.disciplina)) campos[`linhas[${i}].disciplina`] = 'Disciplina vazia.';
    if (!numero(l?.prova)) campos[`linhas[${i}].prova`] = 'Número da prova inválido.';
    if (!numero(l?.questoes)) campos[`linhas[${i}].questoes`] = 'Quantidade de questões inválida.';
    if (l?.total_questoes !== undefined && !numero(l.total_questoes)) {
      campos[`linhas[${i}].total_questoes`] = 'Total de questões inválido.';
    }
    if (l?.tipo !== undefined && typeof l.tipo !== 'string') campos[`linhas[${i}].tipo`] = 'Tipo inválido.';
  });
  lancarSeHouver(campos);
}

/** Primeiro item de cada chave, na ordem em que aparecem. */
function primeirosPorChave(itens, chave) {
  const mapa = new Map();
  for (const item of itens) {
    const k = chave(item);
    if (!mapa.has(k)) mapa.set(k, item);
  }
  return mapa;
}

/**
 * Substitui todas as provas do concurso pelas linhas da planilha.
 *
 * Mantem as regras que a tela ja aplicava:
 * - uma prova por numero, um cargo por prova + cargo;
 * - as disciplinas de cada prova vem so do primeiro cargo dela;
 * - cada disciplina ganha uma linha de nivel com o nivel do primeiro cargo da
 *   prova, a quantidade de questoes da primeira linha daquela disciplina, o
 *   status "Solicitar" e contabilizar = false.
 *
 * Tudo roda numa transacao. Antes, o navegador apagava as provas do concurso e
 * reinseria em varias etapas: uma falha no meio deixava o concurso sem provas
 * ou com provas incompletas.
 */
export async function importar(concursoId, dados) {
  const linhas = dados?.linhas;
  validarLinhasDeImportacao(linhas);

  return atividades.registrando(async (db, registrar) => {
    const descricoesNivel = [...new Set(linhas.map((l) => l.nivel))];
    const niveis = await repository.buscarNiveisPorDescricao(descricoesNivel, db);
    const nivelId = new Map(niveis.map((n) => [n.descricao, n.id]));
    const faltando = descricoesNivel.filter((d) => !nivelId.has(d));
    if (faltando.length > 0) {
      lancarSeHouver({ linhas: `Níveis não cadastrados: ${faltando.join(', ')}.` });
    }

    await repository.limparConcurso(concursoId, db);

    const primeiraLinhaDaProva = primeirosPorChave(linhas, (l) => l.prova);
    const provas = await repository.inserirProvas(concursoId, [...primeiraLinhaDaProva.keys()], db);
    const provaId = new Map(provas.map((p) => [p.codigo, p.id]));

    const cargos = [...primeirosPorChave(linhas, (l) => `${l.prova}::${l.cargo}`).values()].map((l) => ({
      descricao: l.cargo,
      prova_id: provaId.get(l.prova),
      nivel_id: nivelId.get(l.nivel),
    }));
    await repository.inserirCargos(concursoId, cargos, db);

    const linhasDoPrimeiroCargo = linhas.filter((l) => primeiraLinhaDaProva.get(l.prova).cargo === l.cargo);
    const disciplinasUnicas = [
      ...primeirosPorChave(linhasDoPrimeiroCargo, (l) => `${l.prova}::${l.disciplina}`).values(),
    ];
    const disciplinas = await repository.inserirDisciplinas(
      disciplinasUnicas.map((l) => ({
        prova_id: provaId.get(l.prova),
        disciplina: l.disciplina,
        tipo: l.tipo || null,
        questoes: l.questoes,
        total_questoes_prova: l.total_questoes ?? 0,
      })),
      db,
    );

    const codigoDaProva = new Map(provas.map((p) => [p.id, p.codigo]));
    const statusSolicitar = await repository.buscarStatusSolicitar(db);
    const niveisDasDisciplinas = disciplinas.map((d) => {
      const codigo = codigoDaProva.get(d.prova_id);
      const primeiraDaDisciplina = linhas.find((l) => l.prova === codigo && l.disciplina === d.disciplina);
      return {
        disciplina_id: d.id,
        nivel_id: nivelId.get(primeiraLinhaDaProva.get(codigo).nivel),
        qtd: primeiraDaDisciplina?.questoes ?? 0,
      };
    });
    await repository.inserirDisciplinaNiveis(niveisDasDisciplinas, statusSolicitar, db);

    const concurso = await repository.nomeDoConcurso(concursoId, db);
    const nomeArquivo = typeof dados.arquivo === 'string' && dados.arquivo.trim() ? ` do arquivo ${aspas(dados.arquivo.trim())}` : '';
    await registrar(
      'importou',
      `Importou${nomeArquivo} ${provas.length} prova(s), ${cargos.length} cargo(s) e ${disciplinas.length} disciplina(s) no concurso ${aspas(concurso)}, substituindo as anteriores.`,
      doConcurso(concursoId),
    );
    return { provas: provas.length, cargos: cargos.length, disciplinas: disciplinas.length };
  });
}
