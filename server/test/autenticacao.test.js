import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('jose', () => ({
  createRemoteJWKSet: () => ({}),
  jwtVerify: vi.fn(),
}));

vi.mock('../src/modulos/usuarios/perfilRepository.js', () => ({
  buscarAcesso: vi.fn(async () => ({ nivelAcesso: 4, modulos: [] })),
}));

vi.mock('../src/config/db.js', () => {
  const pool = { query: vi.fn(async () => ({ rows: [], rowCount: 0 })) };
  return { pool, emTransacao: vi.fn((trabalho) => trabalho(pool)) };
});

const { jwtVerify } = await import('jose');
const { buscarAcesso } = await import('../src/modulos/usuarios/perfilRepository.js');
const { criarApp } = await import('../src/app.js');
const app = criarApp();

beforeEach(() => vi.clearAllMocks());

describe('autenticacao do token', () => {
  it('exige audience authenticated na verificacao', async () => {
    jwtVerify.mockResolvedValue({ payload: { sub: 'u1' } });
    await request(app).get('/api/administracao/usuarios').set('Authorization', 'Bearer x');
    expect(jwtVerify.mock.calls[0][2]).toEqual(expect.objectContaining({ audience: 'authenticated' }));
  });

  it('token com audience errada (recusado pelo jose) responde 401', async () => {
    jwtVerify.mockRejectedValue(new Error('unexpected "aud" claim value'));
    const resposta = await request(app).get('/api/administracao/usuarios').set('Authorization', 'Bearer x');
    expect(resposta.status).toBe(401);
  });

  it('login anonimo responde 401', async () => {
    jwtVerify.mockResolvedValue({ payload: { sub: 'u1', is_anonymous: true } });
    const resposta = await request(app).get('/api/administracao/usuarios').set('Authorization', 'Bearer x');
    expect(resposta.status).toBe(401);
  });

  it('passa o sub e o session_id do token para buscarAcesso', async () => {
    jwtVerify.mockResolvedValue({ payload: { sub: 'u1', session_id: 's1' } });
    await request(app).get('/api/administracao/usuarios').set('Authorization', 'Bearer x');
    expect(buscarAcesso).toHaveBeenCalledWith('u1', 's1');
  });

  it('sessao encerrada (buscarAcesso devolve null) responde 401', async () => {
    jwtVerify.mockResolvedValue({ payload: { sub: 'u1', session_id: 's1' } });
    buscarAcesso.mockResolvedValueOnce(null);
    const resposta = await request(app).get('/api/administracao/usuarios').set('Authorization', 'Bearer x');
    expect(resposta.status).toBe(401);
    expect(resposta.body.mensagem).toBe('Sua sessão foi encerrada. Entre novamente.');
  });

  it('falha do banco em buscarAcesso responde 500, nunca 401', async () => {
    jwtVerify.mockResolvedValue({ payload: { sub: 'u1', session_id: 's1' } });
    buscarAcesso.mockRejectedValueOnce(new Error('banco fora do ar'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const resposta = await request(app).get('/api/administracao/usuarios').set('Authorization', 'Bearer x');
    expect(resposta.status).toBe(500);
  });
});
