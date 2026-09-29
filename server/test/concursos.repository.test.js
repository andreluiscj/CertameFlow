import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/config/db.js', () => ({
  pool: { query: vi.fn() },
}));

const { pool } = await import('../src/config/db.js');
const repository = await import('../src/modulos/concursos/concursos.repository.js');
const eventos = await import('../src/modulos/concursos/eventos.repository.js');

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

describe('autoria da conclusao de tarefas', () => {
  const USUARIO = '11111111-1111-4111-8111-111111111111';

  it('grava quem concluiu e quando, com o nome copiado de usuarios', async () => {
    await eventos.definirConcluidas([{ id: ID, concluido: true }, { id: USUARIO, concluido: false }], USUARIO, pool);

    const [sql, valores] = pool.query.mock.calls[0];
    expect(sql).toContain('concluido_em = case when t.concluido then now() end');
    expect(sql).toContain('concluido_por = case when t.concluido then u.id end');
    expect(sql).toContain('coalesce(u.nome, u.email)');
    expect(sql).toContain('left join usuarios u on u.id = $3::uuid');
    // so altera (e so registra) quem realmente mudou de estado
    expect(sql).toContain('e.concluido is distinct from t.concluido');
    expect(valores).toEqual([[ID, USUARIO], [true, false], USUARIO]);
  });

  it('o UPDATE generico da tarefa nao altera a conclusao', async () => {
    await eventos.atualizar(ID, { titulo: 'Novo', concluido: true, concluido_por: USUARIO }, pool);

    const [sql, valores] = pool.query.mock.calls[0];
    expect(sql).toContain('set titulo = $2');
    expect(sql).not.toMatch(/concluido(_por)? = \$/);
    expect(valores).toEqual([ID, 'Novo']);
  });

  it('concluir todas as tarefas do concurso tambem grava o autor', async () => {
    await eventos.definirTodasConcluidas(ID, true, USUARIO, pool);

    const [sql, valores] = pool.query.mock.calls[0];
    expect(sql).toContain('concluido_por_nome = case when t.concluido then coalesce(u.nome, u.email) end');
    expect(valores).toEqual([ID, true, USUARIO]);
  });
});
