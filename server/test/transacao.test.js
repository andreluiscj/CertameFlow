import { beforeEach, describe, expect, it, vi } from 'vitest';

// Substitui o driver do Postgres por um cliente falso que registra os comandos.
const cliente = { query: vi.fn(), release: vi.fn() };

vi.mock('pg', () => ({
  default: {
    types: { setTypeParser: vi.fn() },
    Pool: class {
      on() {}
      connect() {
        return Promise.resolve(cliente);
      }
    },
  },
}));

const { emTransacao } = await import('../src/config/db.js');

const comandos = () => cliente.query.mock.calls.map(([sql]) => sql);

beforeEach(() => {
  vi.clearAllMocks();
  cliente.query.mockResolvedValue({ rows: [] });
});

describe('emTransacao', () => {
  it('confirma (commit) quando todas as operacoes dao certo', async () => {
    const resultado = await emTransacao(async (db) => {
      await db.query('insert 1');
      await db.query('insert 2');
      return 'ok';
    });

    expect(resultado).toBe('ok');
    expect(comandos()).toEqual(['begin', 'insert 1', 'insert 2', 'commit']);
    expect(cliente.release).toHaveBeenCalledWith(false);
  });

  it('desfaz (rollback) e repassa o erro quando uma operacao falha no meio', async () => {
    const falha = new Error('parcela invalida');

    await expect(
      emTransacao(async (db) => {
        await db.query('insert contrato');
        throw falha;
      }),
    ).rejects.toBe(falha);

    expect(comandos()).toEqual(['begin', 'insert contrato', 'rollback']);
    expect(comandos()).not.toContain('commit');
    expect(cliente.release).toHaveBeenCalledWith(false);
  });

  it('descarta a conexao se nem o rollback funcionar', async () => {
    cliente.query.mockImplementation(async (sql) => {
      if (sql === 'rollback') throw new Error('conexao caiu');
      return { rows: [] };
    });

    await expect(
      emTransacao(async () => {
        throw new Error('falha original');
      }),
    ).rejects.toThrow('falha original');

    // release(true) destroi a conexao em vez de devolve-la ao pool.
    expect(cliente.release).toHaveBeenCalledWith(true);
  });
});
