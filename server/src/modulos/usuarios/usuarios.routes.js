import { Router } from 'express';
import { assincrono } from '../../middleware/assincrono.js';
import { autenticarPermitindoTrocaDeSenha } from '../../middleware/autenticacao.js';
import { ErroHttp } from '../../middleware/tratadorDeErros.js';
import { limiteSensivel } from '../../middleware/limites.js';
import { definirPropriaSenha } from '../administracao/usuarios.service.js';

export const usuariosRoutes = Router();

// O middleware fica na rota (nao no router) para que rotas futuras nao herdem a excecao.
usuariosRoutes.put(
  '/eu/senha',
  assincrono(autenticarPermitindoTrocaDeSenha),
  limiteSensivel(),
  assincrono(async (req, res) => {
    // So a troca obrigatoria usa esta rota: troca normal pede a senha atual no Auth.
    if (!req.auth.trocarSenha) throw new ErroHttp(409, 'Não há troca de senha pendente.');
    await definirPropriaSenha(req.auth.usuarioId, req.body?.senha);
    res.status(204).end();
  }),
);
