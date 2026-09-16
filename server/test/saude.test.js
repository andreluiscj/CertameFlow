import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { criarApp } from '../src/app.js';

describe('esqueleto da API', () => {
  it('responde 200 em /saude sem exigir token', async () => {
    const resposta = await request(criarApp()).get('/saude');
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ status: 'ok' });
  });

  it('responde 404 em rota inexistente', async () => {
    const resposta = await request(criarApp()).get('/api/isso-nao-existe');
    expect(resposta.status).toBe(404);
  });
});

describe('CORS', () => {
  it('libera a origem do frontend', async () => {
    const resposta = await request(criarApp())
      .options('/api/concursos')
      .set('Origin', 'http://localhost:8080')
      .set('Access-Control-Request-Method', 'GET');
    expect(resposta.headers['access-control-allow-origin']).toBe('http://localhost:8080');
  });

  it('recusa origem desconhecida com 403, e nao com 500', async () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {});
    const resposta = await request(criarApp())
      .options('/api/concursos')
      .set('Origin', 'http://site-malicioso.example')
      .set('Access-Control-Request-Method', 'GET');
    expect(resposta.status).toBe(403);
    expect(resposta.headers['access-control-allow-origin']).toBeUndefined();
    expect(erro).not.toHaveBeenCalled();
    erro.mockRestore();
  });
});
