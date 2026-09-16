import { aspas, dataBR } from '../../util/formatacao.js';
import { FORMATO_UUID, validarListaDeIds } from '../../util/uuid.js';
import { lancarSeHouver, naoEncontrado, textosFaltando } from '../../util/validacao.js';
import * as repository from './cadastros.repository.js';
import * as responsaveis from './responsaveis.repository.js';
import { registroDeAtividades } from '../logs/atividades.service.js';
import { removerArquivos } from './comprovantes.service.js';

const atividades = registroDeAtividades('contratos');

/** "contrato de <cliente>" para as descricoes das atividades. */
async function descreverContrato(contratoId, db) {
  const contrato = await repository.buscarPorId(contratoId, db);
  return { contrato, texto: `contrato do cliente ${aspas(contrato?.cliente?.descricao)}` };
}
const doContrato = (id) => ({ entidade: 'contrato', entidadeId: id });

function validarCriacao(dados) {
  const campos = textosFaltando(dados, {
    cliente_id: 'Informe o cliente.',
    tipo_processo_id: 'Informe o tipo de processo.',
    status_id: 'Informe o status.',
  });

  if (typeof dados?.valor_total !== 'number' || !Number.isFinite(dados.valor_total)) {
    campos.valor_total = 'Informe o valor total.';
  }

  if (!Array.isArray(dados?.parcelas)) {
    campos.parcelas = 'Informe as parcelas.';
  } else {
    dados.parcelas.forEach((p, indice) => {
      if (!Number.isInteger(p?.ordem)) campos[`parcelas[${indice}].ordem`] = 'Ordem inválida.';
      if (typeof p?.percentual !== 'number' || !Number.isFinite(p.percentual)) {
        campos[`parcelas[${indice}].percentual`] = 'Percentual inválido.';
      }
    });
  }

  if (dados?.responsavel_ids !== undefined && !validarListaDeIds(dados.responsavel_ids)) {
    campos.responsavel_ids = 'Lista de responsáveis inválida.';
  }

  lancarSeHouver(campos);
}

export const listar = () => repository.listar();
export const listarResponsaveis = (contratoId) => repository.listarResponsaveis(contratoId);

export async function buscarPorId(id) {
  const contrato = await repository.buscarPorId(id);
  if (!contrato) throw naoEncontrado('Contrato', id);
  return contrato;
}

/**
 * Cadastra o contrato com forma de pagamento, parcelas e responsaveis numa
 * unica transacao: ou tudo e gravado, ou nada.
 *
 * Antes, eram quatro gravacoes independentes feitas pelo navegador. Uma falha
 * no meio deixava um contrato sem parcelas (e, ao tentar de novo, um contrato
 * duplicado) e uma forma de pagamento solta, sem contrato.
 */
export async function criar(dados) {
  validarCriacao(dados);

  return atividades.registrando(async (db, registrar) => {
    const formaPagamento = await repository.inserirFormaPagamento(dados.parcelas.length, db);

    const contrato = await repository.inserirContrato(
      { ...dados, forma_pagamento_id: formaPagamento.id },
      db,
    );

    if (dados.parcelas.length > 0) {
      await repository.inserirParcelas(contrato.id, dados.parcelas, db);
    }

    if (dados.responsavel_ids?.length > 0) {
      await repository.vincularResponsaveis(contrato.id, dados.responsavel_ids, db);
    }

    const { texto } = await descreverContrato(contrato.id, db);
    await registrar(
      'criou',
      `Cadastrou o ${texto} com ${dados.parcelas.length} parcela(s), valor total R$ ${Number(contrato.valor_total).toFixed(2)}.`,
      doContrato(contrato.id),
    );
    return contrato;
  });
}

/** Substitui os responsaveis do contrato na mesma transacao (ver criar). */
export async function substituirResponsaveis(contratoId, responsavelIds) {
  if (!validarListaDeIds(responsavelIds)) {
    lancarSeHouver({ responsavel_ids: 'Lista de responsáveis inválida.' });
  }

  return atividades.registrando(async (db, registrar) => {
    await repository.desvincularResponsaveis(contratoId, db);
    const vinculos = responsavelIds.length === 0 ? [] : await repository.vincularResponsaveis(contratoId, responsavelIds, db);
    const { texto } = await descreverContrato(contratoId, db);
    await registrar('alterou', `Definiu ${vinculos.length} responsável(is) no ${texto}.`, doContrato(contratoId));
    return vinculos;
  });
}

/**
 * Vincula um responsavel ao contrato. So aceita responsavel do mesmo cliente
 * do contrato, que e o que a tela oferece para escolha.
 */
export async function vincularResponsavel(contratoId, responsavelId) {
  if (typeof responsavelId !== 'string' || !FORMATO_UUID.test(responsavelId)) {
    lancarSeHouver({ responsavel_id: 'Informe o responsável.' });
  }

  return atividades.registrando(async (db, registrar) => {
    const clienteId = await repository.buscarClienteDoContrato(contratoId, db);
    if (!clienteId) throw naoEncontrado('Contrato', contratoId);

    const responsavel = await responsaveis.buscarPorId(responsavelId, db);
    if (!responsavel || responsavel.cliente_id !== clienteId) {
      lancarSeHouver({ responsavel_id: 'O responsável precisa ser do mesmo cliente do contrato.' });
    }

    await repository.vincularResponsavel(contratoId, responsavelId, db);
    const { texto } = await descreverContrato(contratoId, db);
    await registrar('vinculou', `Vinculou o responsável ${aspas(responsavel.nome)} ao ${texto}.`, doContrato(contratoId));
  });
}

/** Desvincula um responsavel do contrato. Desvincular quem nao esta vinculado nao faz nada. */
export async function desvincularResponsavel(contratoId, responsavelId) {
  return atividades.registrando(async (db, registrar) => {
    const responsavel = await responsaveis.buscarPorId(responsavelId, db);
    await repository.desvincularResponsavel(contratoId, responsavelId, db);
    const { contrato, texto } = await descreverContrato(contratoId, db);
    if (contrato && responsavel) {
      await registrar('desvinculou', `Desvinculou o responsável ${aspas(responsavel.nome)} do ${texto}.`, doContrato(contratoId));
    }
  });
}

export async function atualizarConcurso(id, dados) {
  const concursoId = dados?.concurso_id ?? null;
  if (concursoId !== null && (typeof concursoId !== 'string' || !FORMATO_UUID.test(concursoId))) {
    lancarSeHouver({ concurso_id: 'Concurso inválido.' });
  }

  return atividades.registrando(async (db, registrar) => {
    const contrato = await repository.atualizarConcurso(id, concursoId, db);
    if (!contrato) throw naoEncontrado('Contrato', id);
    const { contrato: completo, texto } = await descreverContrato(id, db);
    await registrar(
      concursoId ? 'vinculou' : 'desvinculou',
      concursoId
        ? `Vinculou o concurso ${aspas(completo?.concurso?.nome)} ao ${texto}.`
        : `Desvinculou o concurso do ${texto}.`,
      doContrato(id),
    );
    return contrato;
  });
}

export async function excluir(id) {
  const comprovantes = await atividades.registrando(async (db, registrar) => {
    const { contrato, texto } = await descreverContrato(id, db);
    const caminhos = await repository.caminhosDosComprovantes(id, db);
    if (!contrato || !(await repository.excluir(id, db))) throw naoEncontrado('Contrato', id);
    await registrar('excluiu', `Excluiu o ${texto}.`, doContrato(id));
    return caminhos;
  });
  // Os arquivos saem do Storage so depois de a exclusao estar gravada.
  await removerArquivos(comprovantes);
}

/** Texto da alteracao de parcela: pagamento, status ou data efetiva. */
function descreverAlteracaoDaParcela(parcela, alteracoes) {
  if (alteracoes?.pago === true) return ['alterou', `Marcou como paga a parcela ${parcela.ordem}`];
  if (alteracoes?.pago === false) return ['alterou', `Desmarcou o pagamento da parcela ${parcela.ordem}`];
  if (alteracoes?.status_id !== undefined) return ['alterou', `Alterou o status da parcela ${parcela.ordem}`];
  if (alteracoes?.data_pagamento_efetivo !== undefined) {
    const data = parcela.data_pagamento_efetivo ? ` para ${dataBR(parcela.data_pagamento_efetivo)}` : '';
    return ['alterou', `Alterou a data de pagamento da parcela ${parcela.ordem}${data}`];
  }
  return ['alterou', `Alterou a parcela ${parcela.ordem}`];
}

export async function atualizarParcela(id, alteracoes) {
  return atividades.registrando(async (db, registrar) => {
    const parcela = await repository.atualizarParcela(id, alteracoes, db);
    if (!parcela) throw naoEncontrado('Parcela', id);
    const { texto } = await descreverContrato(parcela.contrato_id, db);
    const [acao, inicio] = descreverAlteracaoDaParcela(parcela, alteracoes);
    await registrar(acao, `${inicio} do ${texto}.`, doContrato(parcela.contrato_id));
    return parcela;
  });
}
