import { ErroHttp } from '../../middleware/tratadorDeErros.js';
import { aspas } from '../../util/formatacao.js';
import { registroDeAtividades } from '../logs/atividades.service.js';
import * as repository from './concursos.repository.js';

const CAMPOS_OBRIGATORIOS = {
  concurso_id: 'Informe o código do concurso.',
  nome: 'Informe o nome do concurso.',
  tipo: 'Informe o tipo do concurso.',
  uf: 'Informe a UF.',
  cidade: 'Informe a cidade.',
};

function naoEncontrado(id) {
  return new ErroHttp(404, `Concurso ${id} não encontrado.`);
}

function validarCriacao(dados) {
  const campos = {};

  for (const [campo, mensagem] of Object.entries(CAMPOS_OBRIGATORIOS)) {
    const valor = dados?.[campo];
    if (typeof valor !== 'string' || valor.trim() === '') {
      campos[campo] = mensagem;
    }
  }

  if (!campos.uf && dados.uf.trim().length !== 2) {
    campos.uf = 'A UF deve ter 2 letras.';
  }

  if (Object.keys(campos).length > 0) {
    throw new ErroHttp(400, 'Dados inválidos.', campos);
  }
}

export function listar() {
  return repository.listar();
}

export async function buscarPorId(id) {
  const concurso = await repository.buscarPorId(id);
  if (!concurso) throw naoEncontrado(id);
  return concurso;
}

const atividades = registroDeAtividades('concursos');

const ROTULOS = {
  concurso_id: 'código', nome: 'nome', tipo: 'tipo', uf: 'UF', cidade: 'cidade', cor: 'cor',
  status: 'status', observacoes: 'observações', nota_titulo: 'nota de título', cod_projeto: 'código do projeto',
};

/** Descreve o que mudou, p.ex. 'status de "Em andamento" para "Finalizado"; cor'. */
function descreverMudancas(antes, depois) {
  return Object.keys(ROTULOS)
    .filter((campo) => antes[campo] !== depois[campo])
    .map((campo) =>
      campo === 'status' || campo === 'cod_projeto'
        ? `${ROTULOS[campo]} de ${aspas(antes[campo] || '(vazio)')} para ${aspas(depois[campo] || '(vazio)')}`
        : ROTULOS[campo],
    )
    .join('; ');
}

export async function criar(dados) {
  validarCriacao(dados);
  return atividades.registrando(async (db, registrar) => {
    const concurso = await repository.inserir(dados, db);
    await registrar('criou', `Cadastrou o concurso ${aspas(concurso.nome)} (${concurso.concurso_id}).`, {
      entidade: 'concurso',
      entidadeId: concurso.id,
    });
    return concurso;
  });
}

export async function atualizar(id, alteracoes) {
  return atividades.registrando(async (db, registrar) => {
    const antes = await repository.buscarPorId(id, db);
    if (!antes) throw naoEncontrado(id);
    const concurso = await repository.atualizar(id, alteracoes ?? {}, db);

    const mudancas = descreverMudancas(antes, concurso);
    if (mudancas) {
      const acao = antes.status !== concurso.status && concurso.status === 'Finalizado' ? 'finalizou' : 'alterou';
      await registrar(acao, `Alterou o concurso ${aspas(concurso.nome)}: ${mudancas}.`, {
        entidade: 'concurso',
        entidadeId: id,
      });
    }
    return concurso;
  });
}

/** A exclusao remove tambem os eventos do concurso, por cascata definida no banco. */
export async function excluir(id) {
  return atividades.registrando(async (db, registrar) => {
    const concurso = await repository.buscarPorId(id, db);
    if (!concurso || !(await repository.excluir(id, db))) throw naoEncontrado(id);
    await registrar('excluiu', `Excluiu o concurso ${aspas(concurso.nome)} (${concurso.concurso_id}).`, {
      entidade: 'concurso',
      entidadeId: id,
    });
  });
}
