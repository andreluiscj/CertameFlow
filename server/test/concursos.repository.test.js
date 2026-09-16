import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/db.js', () => ({
  pool: { query: vi.fn() },
}));

const { pool } = await import('../src/config/db.js');
const repository = await import('../src/modulos/concursos/concursos.repository.js');

const ID = '08a11b5f-95b3-43d0-af8b-02d66decc626';

beforeEach(() => {
  vi.clearAllMocks();
  pool.query.mockResolvedValue({ rows: [{ id: ID }], rowCount: 1 });
});

describe('atualizacao parcial de concursos', () => {
  it('ignora colunas fora da lista permitida, inclusive tentativa de injecao no nome da coluna', async () => {
    await repository.atualizar(ID, {
      nome: 'Novo nome',
      id: 'outro-id',
      created_at: '2000-01-01',
      'nome = nome; drop table usuarios; --': 'x',
    });

    const [sql, valores] = pool.query.mock.calls[0];
    expect(sql).toContain('set nome = $2, updated_at = now()');
    expect(sql).not.toContain('drop table');
    expect(sql).not.toContain('created_at =');
    expect(valores).toEqual([ID, 'Novo nome']);
  });

  it('um campo enviado como null e limpo, e nao ignorado', async () => {
    await repository.atualizar(ID, { observacoes: null });
    const [sql, valores] = pool.query.mock.calls[0];
    expect(sql).toContain('set observacoes = $2');
    expect(valores).toEqual([ID, null]);
  });

  it('sem nenhum campo permitido, apenas busca o registro sem executar UPDATE', async () => {
    await repository.atualizar(ID, { id: 'outro' });
    const [sql] = pool.query.mock.calls[0];
    expect(sql.trim().startsWith('select')).toBe(true);
  });
});
