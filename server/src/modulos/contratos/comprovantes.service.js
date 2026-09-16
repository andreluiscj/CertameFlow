import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '../../config/supabaseAdmin.js';
import { ErroHttp } from '../../middleware/tratadorDeErros.js';
import { aspas } from '../../util/formatacao.js';
import { naoEncontrado } from '../../util/validacao.js';
import { registroDeAtividades } from '../logs/atividades.service.js';
import * as repository from './cadastros.repository.js';

export const BUCKET = 'comprovantes';
export const TAMANHO_MAXIMO = 10 * 1024 * 1024;
const VALIDADE_LINK_SEGUNDOS = 5 * 60;

/**
 * Tipos aceitos e a assinatura dos primeiros bytes de cada um. O tipo
 * informado pelo navegador nao basta: um arquivo renomeado para .pdf seria
 * aceito so pela extensao.
 */
const TIPOS = {
  'application/pdf': { extensao: 'pdf', confere: (b) => b.subarray(0, 4).toString('latin1') === '%PDF' },
  'image/jpeg': { extensao: 'jpg', confere: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  'image/png': { extensao: 'png', confere: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  'image/webp': {
    extensao: 'webp',
    confere: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
};

export const TIPOS_ACEITOS = Object.keys(TIPOS);

const atividades = registroDeAtividades('contratos');

/** Nome original sem caminho e sem caracteres de controle, para exibir e baixar. */
function limparNome(nome) {
  const base = String(nome ?? '').split(/[\\/]/).pop();
  const semControle = [...base].filter((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127).join('');
  return semControle.trim().slice(0, 200) || 'comprovante';
}

export function validarArquivo(arquivo) {
  if (!arquivo?.buffer?.length) {
    throw new ErroHttp(400, 'Selecione o arquivo do comprovante.');
  }
  const tipo = TIPOS[arquivo.mimetype];
  if (!tipo || !tipo.confere(arquivo.buffer)) {
    throw new ErroHttp(400, 'Envie um arquivo PDF ou uma imagem JPG, PNG ou WEBP.');
  }
  if (arquivo.buffer.length > TAMANHO_MAXIMO) {
    throw new ErroHttp(400, 'O comprovante deve ter no máximo 10 MB.');
  }
  return tipo;
}

async function descreverParcela(parcela, db) {
  const contrato = await repository.buscarPorId(parcela.contrato_id, db);
  return `parcela ${parcela.ordem} do contrato do cliente ${aspas(contrato?.cliente?.descricao)}`;
}

const doContrato = (parcela) => ({ entidade: 'contrato', entidadeId: parcela.contrato_id });

/** Remove arquivos do Storage sem interromper quem chamou: um arquivo orfao nao deve desfazer a operacao. */
export async function removerArquivos(caminhos) {
  const lista = caminhos.filter(Boolean);
  if (lista.length === 0) return;
  try {
    const { error } = await supabaseAdmin().storage.from(BUCKET).remove(lista);
    if (error) throw error;
  } catch (erro) {
    console.error('Falha ao remover comprovantes do Storage:', erro.message);
  }
}

export async function enviar(parcelaId, arquivo) {
  const tipo = validarArquivo(arquivo);
  const parcela = await repository.buscarParcelaComComprovante(parcelaId);
  if (!parcela) throw naoEncontrado('Parcela', parcelaId);

  const storage = supabaseAdmin().storage.from(BUCKET);
  const caminho = `${parcela.contrato_id}/${parcela.id}/${randomUUID()}.${tipo.extensao}`;
  const { error } = await storage.upload(caminho, arquivo.buffer, { contentType: arquivo.mimetype, upsert: false });
  if (error) throw new Error(`Falha ao enviar o comprovante ao Storage: ${error.message}`);

  let atualizada;
  try {
    atualizada = await atividades.registrando(async (db, registrar) => {
      const resultado = await repository.substituirComprovante(
        parcelaId,
        { caminho, nome: limparNome(arquivo.originalname), tipo: arquivo.mimetype, tamanho: arquivo.buffer.length },
        db,
      );
      if (!resultado) throw naoEncontrado('Parcela', parcelaId);
      const acao = resultado.caminho_anterior ? 'Substituiu o comprovante' : 'Anexou comprovante';
      await registrar('alterou', `${acao} da ${await descreverParcela(resultado, db)}.`, doContrato(resultado));
      return resultado;
    });
  } catch (erro) {
    await removerArquivos([caminho]);
    throw erro;
  }

  const { caminho_anterior: caminhoAnterior, ...parcelaAtualizada } = atualizada;
  await removerArquivos([caminhoAnterior]);
  return parcelaAtualizada;
}

/** Link temporario para abrir o comprovante; o bucket e privado. */
export async function gerarLink(parcelaId) {
  const parcela = await repository.buscarParcelaComComprovante(parcelaId);
  if (!parcela) throw naoEncontrado('Parcela', parcelaId);
  if (!parcela.comprovante_caminho) throw new ErroHttp(404, 'Esta parcela não tem comprovante anexado.');

  const { data, error } = await supabaseAdmin()
    .storage.from(BUCKET)
    .createSignedUrl(parcela.comprovante_caminho, VALIDADE_LINK_SEGUNDOS);
  if (error) throw new Error(`Falha ao gerar o link do comprovante: ${error.message}`);

  return { url: data.signedUrl, nome: parcela.comprovante_nome, tipo: parcela.comprovante_tipo };
}

export async function remover(parcelaId) {
  const atualizada = await atividades.registrando(async (db, registrar) => {
    const resultado = await repository.substituirComprovante(parcelaId, null, db);
    if (!resultado) throw naoEncontrado('Parcela', parcelaId);
    if (!resultado.caminho_anterior) throw new ErroHttp(404, 'Esta parcela não tem comprovante anexado.');
    await registrar('alterou', `Removeu o comprovante da ${await descreverParcela(resultado, db)}.`, doContrato(resultado));
    return resultado;
  });

  const { caminho_anterior: caminhoAnterior, ...parcela } = atualizada;
  await removerArquivos([caminhoAnterior]);
  return parcela;
}
