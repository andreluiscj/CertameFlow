import { beforeEach, describe, expect, it, vi } from 'vitest';

const conexaoDaTransacao = { nome: 'conexao-da-transacao' };

vi.mock('../src/config/db.js', () => ({
  pool: { query: vi.fn() },
  emTransacao: vi.fn((trabalho) => trabalho(conexaoDaTransacao)),
}));

vi.mock('../src/modulos/provas/elaboradores.repository.js', () => ({
  inserir: vi.fn(),
  atualizar: vi.fn(),
  substituirAreas: vi.fn(),
  inserirVarios: vi.fn(),
  inserirLigacoesDeAreas: vi.fn(),
}));

// O registro de atividades e conferido em teste proprio; aqui so e simulado.
vi.mock('../src/modulos/logs/atividades.repository.js', () => ({
  inserir: vi.fn(),
  listar: vi.fn(async () => []),
}));

const { emTransacao } = await import('../src/config/db.js');
const repository = await import('../src/modulos/provas/elaboradores.repository.js');
const service = await import('../src/modulos/provas/elaboradores.service.js');

const AREA_1 = '11111111-1111-1111-1111-111111111111';
const AREA_2 = '22222222-2222-2222-2222-222222222222';

beforeEach(() => {
  vi.clearAllMocks();
  repository.inserir.mockResolvedValue({ id: 'elab-1' });
  repository.atualizar.mockResolvedValue({ id: 'elab-1', codigo: 1, nome: 'Ana' });
});

describe('elaboradores', () => {
  it('cadastra e liga as areas na mesma transacao, sem gravar area_ids como coluna', async () => {
    await service.criar({ nome: 'Ana', email: null, area_ids: [AREA_1, AREA_2] });

    expect(emTransacao).toHaveBeenCalledTimes(1);
    expect(repository.inserir).toHaveBeenCalledWith({ nome: 'Ana', email: null }, conexaoDaTransacao);
    expect(repository.substituirAreas).toHaveBeenCalledWith('elab-1', [AREA_1, AREA_2], conexaoDaTransacao);
  });

  it('alterar troca as areas na mesma transacao', async () => {
    await service.atualizar('elab-1', { nome: 'Ana Maria', area_ids: [AREA_2] });
    expect(repository.substituirAreas).toHaveBeenCalledWith('elab-1', [AREA_2], conexaoDaTransacao);
  });

  it('elaborador inexistente responde 404 sem tocar nas areas', async () => {
    repository.atualizar.mockResolvedValue(null);
    await expect(service.atualizar('elab-x', { nome: 'X', area_ids: [] })).rejects.toMatchObject({ status: 404 });
    expect(repository.substituirAreas).not.toHaveBeenCalled();
  });

  it('importacao liga cada elaborador a sua area pelo codigo', async () => {
    repository.inserirVarios.mockResolvedValue([
      { id: 'elab-10', codigo: 10 },
      { id: 'elab-20', codigo: 20 },
    ]);

    const resultado = await service.importar({
      elaboradores: [
        { codigo: 10, nome: 'Ana', area_id: AREA_1 },
        { codigo: 20, nome: 'Bruno', area_id: null },
      ],
    });

    expect(repository.inserirLigacoesDeAreas).toHaveBeenCalledWith(
      [{ elaborador_id: 'elab-10', area_id: AREA_1 }],
      conexaoDaTransacao,
    );
    expect(resultado).toEqual({ importados: 2 });
  });

  it('importacao recusa codigo invalido sem abrir transacao', async () => {
    await expect(service.importar({ elaboradores: [{ codigo: 0, nome: 'Ana' }] })).rejects.toMatchObject({
      status: 400,
    });
    expect(emTransacao).not.toHaveBeenCalled();
  });
});
