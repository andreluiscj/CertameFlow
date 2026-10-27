import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/db.js', () => ({ pool: { query: vi.fn() } }));

const { pool } = await import('../src/config/db.js');
const { buscarAcesso } = await import('../src/modulos/usuarios/perfilRepository.js');

beforeEach(() => vi.clearAllMocks());

describe('buscarAcesso', () => {
  it('sem sessaoId devolve null sem consultar o banco', async () => {
    expect(await buscarAcesso('u1', undefined)).toBeNull();
    expect(await buscarAcesso('u1', '')).toBeNull();
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('consulta auth.sessions com usuarioId e sessaoId, nessa ordem', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    await buscarAcesso('u1', 's1');
    const [sql, valores] = pool.query.mock.calls[0];
    expect(sql).toContain('auth.sessions');
    expect(sql).toContain('not_after');
    expect(sql).toContain('make_interval(hours => $3)');
    expect(valores).toEqual(['u1', 's1', 8]);
  });

  it('sessao inexistente, vencida ou sem perfil (nenhuma linha) devolve null', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    expect(await buscarAcesso('u1', 's1')).toBeNull();
  });

  it('com linha devolve nivelAcesso e modulos', async () => {
    pool.query.mockResolvedValue({ rows: [{ nivel_acesso: 4, modulos: ['provas'] }] });
    expect(await buscarAcesso('u1', 's1')).toEqual({ nivelAcesso: 4, modulos: ['provas'] });
  });
});
