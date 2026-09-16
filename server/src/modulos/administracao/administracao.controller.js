import * as notificacoes from '../notificacoes/notificacoes.service.js';
import * as usuarios from './usuarios.service.js';

/**
 * Controllers da Administracao. O id do administrador vem de req.auth (token
 * ja conferido), para as regras que impedem alterar o proprio acesso.
 */

// ----- Usuarios -----
export const listarUsuarios = async (req, res) => res.json(await usuarios.listar());
export const criarUsuario = async (req, res) => res.status(201).json(await usuarios.criar(req.body));
export const atualizarUsuario = async (req, res) =>
  res.json(await usuarios.atualizar(req.params.id, req.body, req.auth.usuarioId));
export const redefinirSenha = async (req, res) => {
  await usuarios.redefinirSenha(req.params.id, req.body?.senha);
  res.status(204).end();
};
export const excluirUsuario = async (req, res) => {
  await usuarios.excluir(req.params.id, req.auth.usuarioId);
  res.status(204).end();
};

// ----- Notificacoes por e-mail -----
export const situacaoNotificacoes = async (req, res) => res.json(await notificacoes.situacao());
export const enviarNotificacoes = async (req, res) => res.json(await notificacoes.enviarAgora());
