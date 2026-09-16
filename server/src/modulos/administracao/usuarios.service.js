import { supabaseAdmin } from '../../config/supabaseAdmin.js';
import { MODULOS, NIVEL_ADMINISTRADOR } from '../../middleware/autorizacao.js';
import { ErroHttp } from '../../middleware/tratadorDeErros.js';
import { aspas } from '../../util/formatacao.js';
import { lancarSeHouver, naoEncontrado } from '../../util/validacao.js';
import { registroDeAtividades } from '../logs/atividades.service.js';
import * as repository from './usuarios.repository.js';

/** Nivel de quem nao e administrador: o acesso vem so da lista de modulos. */
const NIVEL_USUARIO = 0;

const NOMES_DOS_MODULOS = {
  contratos: 'Contratos',
  concursos: 'Concursos',
  provas: 'Provas',
};

const TAMANHO_MINIMO_SENHA = 8;
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const atividades = registroDeAtividades('administracao');

const descrever = (u) => `${aspas(u.nome || u.email)} (${u.email})`;
const doUsuario = (u) => ({ entidade: 'usuario', entidadeId: u.id });

const textoOuNull = (valor) => (typeof valor === 'string' && valor.trim() !== '' ? valor.trim() : null);

/** ["A"] -> "A"; ["A", "B"] -> "A e B"; ["A", "B", "C"] -> "A, B e C". */
function juntar(nomes) {
  return nomes.length <= 1 ? nomes.join('') : `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}`;
}

/** "administrador", "acesso a Contratos e Provas" ou "sem acesso a módulos", para os logs. */
export function descreverAcesso({ nivel_acesso: nivel, modulos }) {
  if (nivel === NIVEL_ADMINISTRADOR) return 'administrador';
  if (!modulos?.length) return 'sem acesso a módulos';
  return `acesso a ${juntar(modulos.map((m) => NOMES_DOS_MODULOS[m]))}`;
}

function validarNivel(campos, nivel) {
  if (nivel !== NIVEL_USUARIO && nivel !== NIVEL_ADMINISTRADOR) {
    campos.nivel_acesso = 'Nível de acesso inválido.';
  }
}

function validarModulos(campos, modulos) {
  if (!Array.isArray(modulos) || modulos.some((m) => !MODULOS.includes(m))) {
    campos.modulos = 'Lista de módulos inválida.';
  }
}

/**
 * Acesso no formato gravado: modulos sem repeticao e na ordem padrao. O
 * administrador acessa tudo; a lista dele fica completa para continuar
 * coerente se ele deixar de ser administrador.
 */
function normalizarAcesso(nivel, modulos) {
  return {
    nivel_acesso: nivel,
    modulos: nivel === NIVEL_ADMINISTRADOR ? [...MODULOS] : MODULOS.filter((m) => modulos.includes(m)),
  };
}

function validarSenha(campos, senha) {
  if (typeof senha !== 'string' || senha.length < TAMANHO_MINIMO_SENHA) {
    campos.senha = `A senha deve ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`;
  }
}

/** Traduz as recusas do Supabase Auth para mensagens do sistema. */
function erroDoAuth(erro) {
  if (erro?.code === 'email_exists' || /already (been )?registered/i.test(erro?.message ?? '')) {
    return new ErroHttp(409, 'Já existe um usuário com este e-mail.');
  }
  if (erro?.code === 'weak_password') {
    return new ErroHttp(400, 'Senha fraca: use letras, números e pelo menos 8 caracteres.');
  }
  return erro instanceof Error ? erro : new Error(erro?.message ?? 'Falha no Supabase Auth.');
}

export const listar = () => repository.listar();

export async function criar(dados) {
  const email = typeof dados?.email === 'string' ? dados.email.trim().toLowerCase() : '';
  const nivel = dados?.nivel_acesso ?? NIVEL_USUARIO;
  const modulos = dados?.modulos ?? [];
  const campos = {};
  if (!FORMATO_EMAIL.test(email)) campos.email = 'Informe um e-mail válido.';
  if (!textoOuNull(dados?.nome)) campos.nome = 'Informe o nome.';
  validarSenha(campos, dados?.senha);
  validarNivel(campos, nivel);
  validarModulos(campos, modulos);
  lancarSeHouver(campos);

  const auth = supabaseAdmin().auth.admin;
  const nome = dados.nome.trim();
  const { data, error } = await auth.createUser({
    email,
    password: dados.senha,
    email_confirm: true,
    user_metadata: { nome },
  });
  if (error) throw erroDoAuth(error);

  try {
    return await atividades.registrando(async (db, registrar) => {
      const usuario = await repository.gravarPerfil(
        { id: data.user.id, email, nome, setor: textoOuNull(dados.setor), ...normalizarAcesso(nivel, modulos) },
        db,
      );
      const acesso = descreverAcesso(usuario);
      await registrar(
        'criou',
        `Cadastrou o usuário ${descrever(usuario)} ${acesso === 'administrador' ? 'como administrador' : `com ${acesso}`}.`,
        doUsuario(usuario),
      );
      return usuario;
    });
  } catch (erro) {
    // Sem o perfil gravado o login existiria sem acesso definido: desfaz no Auth.
    await auth.deleteUser(data.user.id).catch(() => {});
    throw erro;
  }
}

export async function atualizar(id, alteracoes, administradorId) {
  const campos = {};
  if (alteracoes?.nivel_acesso !== undefined) validarNivel(campos, alteracoes.nivel_acesso);
  if (alteracoes?.modulos !== undefined) validarModulos(campos, alteracoes.modulos);
  if (alteracoes?.nome !== undefined && !textoOuNull(alteracoes.nome)) campos.nome = 'Informe o nome.';
  if (alteracoes?.receber_notificacoes !== undefined && typeof alteracoes.receber_notificacoes !== 'boolean') {
    campos.receber_notificacoes = 'Valor inválido.';
  }
  lancarSeHouver(campos);

  // Impede que o sistema fique sem administrador por engano.
  if (
    id === administradorId &&
    alteracoes?.nivel_acesso !== undefined &&
    alteracoes.nivel_acesso !== NIVEL_ADMINISTRADOR
  ) {
    throw new ErroHttp(409, 'Você não pode remover o seu próprio acesso de administrador.');
  }

  return atividades.registrando(async (db, registrar) => {
    const anterior = await repository.buscarPorId(id, db);
    if (!anterior) throw naoEncontrado('Usuário', id);

    // Nivel e modulos sao gravados juntos e normalizados; o que nao veio mantem o valor atual.
    const dados = { ...alteracoes };
    delete dados.nivel_acesso;
    delete dados.modulos;
    if (dados.nome !== undefined) dados.nome = dados.nome.trim();
    if (dados.setor !== undefined) dados.setor = textoOuNull(dados.setor);
    if (alteracoes?.nivel_acesso !== undefined || alteracoes?.modulos !== undefined) {
      Object.assign(
        dados,
        normalizarAcesso(alteracoes.nivel_acesso ?? anterior.nivel_acesso, alteracoes.modulos ?? anterior.modulos),
      );
    }
    const usuario = await repository.atualizar(id, dados, db);

    const mudancas = [];
    const acessoAntes = descreverAcesso(anterior);
    const acessoDepois = descreverAcesso(usuario);
    if (acessoAntes !== acessoDepois) mudancas.push(`de ${acessoAntes} para ${acessoDepois}`);
    if (anterior.receber_notificacoes !== usuario.receber_notificacoes) {
      mudancas.push(usuario.receber_notificacoes ? 'ativou as notificações por e-mail' : 'desativou as notificações por e-mail');
    }
    if (anterior.nome !== usuario.nome || anterior.setor !== usuario.setor) mudancas.push('dados do perfil');
    const detalhe = mudancas.length > 0 ? `: ${mudancas.join(', ')}` : '';

    await registrar('alterou', `Alterou o usuário ${descrever(usuario)}${detalhe}.`, doUsuario(usuario));
    return usuario;
  });
}

export async function redefinirSenha(id, senha) {
  const campos = {};
  validarSenha(campos, senha);
  lancarSeHouver(campos);

  return atividades.registrando(async (db, registrar) => {
    const usuario = await repository.buscarPorId(id, db);
    if (!usuario) throw naoEncontrado('Usuário', id);
    const { error } = await supabaseAdmin().auth.admin.updateUserById(id, { password: senha });
    if (error) throw erroDoAuth(error);
    await registrar('alterou', `Redefiniu a senha do usuário ${descrever(usuario)}.`, doUsuario(usuario));
  });
}

export async function excluir(id, administradorId) {
  if (id === administradorId) {
    throw new ErroHttp(409, 'Você não pode excluir o seu próprio usuário.');
  }

  return atividades.registrando(async (db, registrar) => {
    const usuario = await repository.excluir(id, db);
    if (!usuario) throw naoEncontrado('Usuário', id);
    await registrar('excluiu', `Excluiu o usuário ${descrever(usuario)}.`, doUsuario(usuario));
    // Por ultimo e dentro da transacao: se o Auth recusar, o perfil e mantido.
    const { error } = await supabaseAdmin().auth.admin.deleteUser(id);
    if (error && error.status !== 404) throw erroDoAuth(error);
  });
}
