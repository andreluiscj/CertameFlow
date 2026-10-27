import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('jose', () => ({
  createRemoteJWKSet: () => ({}),
  jwtVerify: vi.fn(async (token) => ({
    payload: { sub: token, app_metadata: token.startsWith('adm') ? {} : { trocar_senha: true } },
  })),
}));
vi.mock('../src/modulos/usuarios/perfilRepository.js', () => ({
  buscarAcesso: vi.fn(async (id) => ({ nivelAcesso: id.startsWith('adm') ? 4 : 0, modulos: [] })),
}));
vi.mock('../src/config/db.js', () => {
  const pool = { query: vi.fn(async () => ({ rows: [], rowCount: 0 })) };
  return { pool, emTransacao: vi.fn((trabalho) => trabalho(pool)) };
});
vi.mock('../src/modulos/logs/atividades.repository.js', () => ({ inserir: vi.fn(), listar: vi.fn(async () => []) }));
const authAdmin = { updateUserById: vi.fn(async () => ({ error: null })) };
vi.mock('../src/config/supabaseAdmin.js', () => ({ supabaseAdmin: () => ({ auth: { admin: authAdmin } }) }));

const { criarApp } = await import('../src/app.js');
const { limitar } = await import('../src/middleware/limites.js');

beforeEach(() => vi.clearAllMocks());

describe('limite de requisicoes', () => {
  it('limita a troca de senha por usuario: a 11a tentativa recebe 429 em portugues, e outro usuario nao e afetado', async () => {
    const app = criarApp();
    const trocar = (usuario) =>
      request(app).put('/api/usuarios/eu/senha').set('Authorization', `Bearer ${usuario}`).send({ senha: 'senhaNova12345' });

    for (let i = 0; i < 10; i += 1) expect((await trocar('ana')).status).toBe(204);
    const bloqueada = await trocar('ana');
    expect(bloqueada.status).toBe(429);
    expect(bloqueada.body).toEqual({
      mensagem: 'Muitas requisições. Aguarde alguns minutos e tente novamente.',
      campos: {},
    });
    expect((await trocar('bia')).status).toBe(204);
  });

  it('429 numa rota sensivel nao bloqueia outra rota do mesmo administrador', async () => {
    const app = criarApp();
    const token = 'Bearer adm1';
    const gerar = () => request(app).post('/api/administracao/usuarios/11111111-1111-4111-8111-111111111111/senha-provisoria').set('Authorization', token);
    for (let i = 0; i < 10; i += 1) expect((await gerar()).status).not.toBe(429);
    expect((await gerar()).status).toBe(429);
    const outra = await request(app).post('/api/administracao/notificacoes/envios').set('Authorization', token);
    expect(outra.status).not.toBe(429);
  });

  it('sem usuario autenticado, a chave e o IP', async () => {
    const app = express();
    app.get('/x', limitar({ limite: 2 }), (req, res) => res.sendStatus(200));
    expect((await request(app).get('/x')).status).toBe(200);
    expect((await request(app).get('/x')).status).toBe(200);
    expect((await request(app).get('/x')).status).toBe(429);
  });
});
