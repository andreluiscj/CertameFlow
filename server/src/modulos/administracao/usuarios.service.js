import { randomInt } from 'node:crypto';
import { env } from '../../config/env.js';
import { supabaseAdmin } from '../../config/supabaseAdmin.js';
import { MODULOS, NIVEL_ADMINISTRADOR } from '../../middleware/autorizacao.js';
import { ErroHttp } from '../../middleware/tratadorDeErros.js';
import { aspas } from '../../util/formatacao.js';
import { lancarSeHouver, naoEncontrado } from '../../util/validacao.js';
import { descreverErroSmtp, emailConfigurado, enviarEmail } from '../notificacoes/email.js';
import { escapar } from '../notificacoes/resumo.js';
import { registroDeAtividades } from '../logs/atividades.service.js';
import * as repository from './usuarios.repository.js';

/** Nivel de quem nao e administrador: o acesso vem so da lista de modulos. */
const NIVEL_USUARIO = 0;

const NOMES_DOS_MODULOS = {
  contratos: 'Contratos',
  concursos: 'Concursos',
  provas: 'Provas',
};

const TAMANHO_MINIMO_SENHA = 12;
const TAMANHO_MAXIMO_SENHA = 72; // limite do bcrypt no Auth
// Sem 0 O o 1 l I, que se confundem na leitura.
const ALFABETO_SENHA = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
export const FORMATO_SENHA_PROVISORIA = /^[A-HJ-NP-Za-km-np-z2-9]{4}(-[A-HJ-NP-Za-km-np-z2-9]{4}){2}$/;
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
  } else if (senha.length > TAMANHO_MAXIMO_SENHA) {
    campos.senha = `A senha deve ter no máximo ${TAMANHO_MAXIMO_SENHA} caracteres.`;
  }
}

/** Traduz as recusas do Supabase Auth para mensagens do sistema. */
function erroDoAuth(erro) {
  if (erro?.code === 'email_exists' || /already (been )?registered/i.test(erro?.message ?? '')) {
    return new ErroHttp(409, 'Já existe um usuário com este e-mail.');
  }
  if (erro?.code === 'weak_password') {
    return new ErroHttp(400, `Senha fraca: use letras, números e pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`);
  }
  return erro instanceof Error ? erro : new Error(erro?.message ?? 'Falha no Supabase Auth.');
}

/** Senha aleatoria no formato Xk7p-M3qa-9bTz, com maiuscula, minuscula e digito. */
export function gerarSenhaProvisoria() {
  for (;;) {
    const letras = Array.from({ length: 12 }, () => ALFABETO_SENHA[randomInt(ALFABETO_SENHA.length)]).join('');
    if (/[A-Z]/.test(letras) && /[a-z]/.test(letras) && /\d/.test(letras)) {
      return `${letras.slice(0, 4)}-${letras.slice(4, 8)}-${letras.slice(8)}`;
    }
  }
}

export const listar = () => repository.listar();

export async function criar(dados) {
  const email = typeof dados?.email === 'string' ? dados.email.trim().toLowerCase() : '';
  const nivel = dados?.nivel_acesso ?? NIVEL_USUARIO;
  const modulos = dados?.modulos ?? [];
  const campos = {};
  if (!FORMATO_EMAIL.test(email)) campos.email = 'Informe um e-mail válido.';
  if (!textoOuNull(dados?.nome)) campos.nome = 'Informe o nome.';
  validarNivel(campos, nivel);
  validarModulos(campos, modulos);
  lancarSeHouver(campos);

  const auth = supabaseAdmin().auth.admin;
  const senhaProvisoria = gerarSenhaProvisoria();
  const nome = dados.nome.trim();
  const { data, error } = await auth.createUser({
    email,
    password: senhaProvisoria,
    email_confirm: true,
    user_metadata: { nome },
    app_metadata: { trocar_senha: true },
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
      return { usuario, senha_provisoria: senhaProvisoria };
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

export async function gerarSenhaProvisoriaDe(id, administradorId) {
  if (id === administradorId) {
    throw new ErroHttp(409, 'Para trocar a sua própria senha, use Alterar senha no menu do perfil.');
  }
  const senhaProvisoria = gerarSenhaProvisoria();

  return atividades.registrando(async (db, registrar) => {
    const usuario = await repository.buscarPorId(id, db);
    if (!usuario) throw naoEncontrado('Usuário', id);
    const { error } = await supabaseAdmin().auth.admin.updateUserById(id, {
      password: senhaProvisoria,
      app_metadata: { trocar_senha: true },
    });
    if (error) throw erroDoAuth(error);
    await registrar('alterou', `Gerou uma senha provisória para o usuário ${descrever(usuario)}.`, doUsuario(usuario));
    return { senha_provisoria: senhaProvisoria };
  });
}

export async function enviarSenhaProvisoria(id, senhaProvisoria) {
  if (typeof senhaProvisoria !== 'string' || !FORMATO_SENHA_PROVISORIA.test(senhaProvisoria)) {
    throw new ErroHttp(400, 'Dados inválidos.', { senha_provisoria: 'Senha provisória inválida.' });
  }
  if (!emailConfigurado()) {
    throw new ErroHttp(503, 'Envio de e-mail não configurado: defina SMTP_HOST e SMTP_FROM no server/.env.');
  }
  const { data, error } = await supabaseAdmin().auth.admin.getUserById(id);
  if (error?.status === 404 || (!error && !data?.user)) throw naoEncontrado('Usuário', id);
  if (error) throw erroDoAuth(error);
  const { email, app_metadata: meta } = data.user;
  if (meta?.trocar_senha !== true) {
    throw new ErroHttp(409, 'Este usuário já definiu a própria senha. Gere uma nova senha provisória.');
  }

  // Nome do perfil (so o admin altera); user_metadata o proprio usuario edita.
  const nome = (await repository.buscarPorId(id))?.nome || email;
  const url = env.notificacoes.urlSistema;
  const aviso = 'No primeiro acesso, o sistema vai pedir que você defina uma nova senha. A senha provisória deixa de valer depois disso.';
  const naoEsperava = 'Se você não esperava este e-mail, avise o administrador.';
  const texto = [`Olá, ${nome}.`, `Login: ${email}`, `Senha provisória: ${senhaProvisoria}`, aviso, url, naoEsperava].join('\n');
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#1a202c;max-width:720px">
  <p>Olá, ${escapar(nome)}.</p>
  <p>Login: <strong>${escapar(email)}</strong><br>Senha provisória: <strong>${escapar(senhaProvisoria)}</strong></p>
  <p>${escapar(aviso)}</p>
  <p><a href="${escapar(url)}" style="color:#2563eb">Abrir o CertameFlow</a></p>
  <p>${escapar(naoEsperava)}</p>
</div>`;

  // SMTP fora da transacao: a conexao do banco nao fica presa durante o envio.
  try {
    await enviarEmail({ para: email, assunto: 'Seu acesso ao CertameFlow', html, texto });
  } catch (erro) {
    throw new ErroHttp(502, descreverErroSmtp(erro));
  }
  await atividades.registrando((db, registrar) =>
    registrar(
      'alterou',
      `Enviou a senha provisória por e-mail para o usuário ${descrever({ nome, email })}.`,
      doUsuario({ id }),
    ),
  );
}

/** Troca obrigatoria: senha nova e remocao da marca na mesma chamada. */
export async function definirPropriaSenha(usuarioId, senha) {
  const campos = {};
  validarSenha(campos, senha);
  lancarSeHouver(campos);

  return atividades.registrando(async (db, registrar) => {
    const { error } = await supabaseAdmin().auth.admin.updateUserById(usuarioId, {
      password: senha,
      app_metadata: { trocar_senha: null },
    });
    if (error?.code === 'same_password') throw new ErroHttp(400, 'A nova senha precisa ser diferente da atual.');
    if (error) throw erroDoAuth(error);
    await registrar('alterou', 'Definiu a própria senha (troca obrigatória da senha provisória).', doUsuario({ id: usuarioId }));
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
