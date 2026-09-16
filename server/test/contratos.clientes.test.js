import { beforeEach, describe, expect, it, vi } from 'vitest';

const conexaoDaTransacao = { nome: 'conexao-da-transacao' };

vi.mock('../src/config/db.js', () => ({
  pool: { query: vi.fn() },
  emTransacao: vi.fn((trabalho) => trabalho(conexaoDaTransacao)),
}));

vi.mock('../src/modulos/contratos/responsaveis.repository.js', () => ({
  listarIdsDoCliente: vi.fn(),
  excluirDoClienteExceto: vi.fn(),
  atualizarVarios: vi.fn(),
  inserirVarios: vi.fn(),
  listarDoCliente: vi.fn(),
}));

vi.mock('../src/modulos/contratos/clientes.repository.js', () => ({
  buscarPorId: vi.fn(async () => ({ descricao: 'Cliente' })),
}));

// O registro de atividades e conferido em teste proprio; aqui so e simulado.
vi.mock('../src/modulos/logs/atividades.repository.js', () => ({
  inserir: vi.fn(),
  listar: vi.fn(async () => []),
}));

const { emTransacao } = await import('../src/config/db.js');
const responsaveis = await import('../src/modulos/contratos/responsaveis.repository.js');
const service = await import('../src/modulos/contratos/clientes.service.js');

const CLIENTE = 'cliente-1';
const ANA = '11111111-1111-1111-1111-111111111111';
const BRUNO = '22222222-2222-2222-2222-222222222222';

beforeEach(() => {
  vi.clearAllMocks();
  responsaveis.listarIdsDoCliente.mockResolvedValue([ANA, BRUNO]);
  responsaveis.listarDoCliente.mockResolvedValue([]);
});

describe('substituicao dos responsaveis do cliente', () => {
  it('atualiza os que continuam, insere os novos e exclui so os removidos, numa transacao', async () => {
    const ana = { id: ANA, nome: 'Ana', cargo: 'Diretora' };
    const carla = { nome: 'Carla' };

    await service.substituirResponsaveis(CLIENTE, [ana, carla]);

    expect(emTransacao).toHaveBeenCalledTimes(1);
    expect(responsaveis.excluirDoClienteExceto).toHaveBeenCalledWith(CLIENTE, [ANA], conexaoDaTransacao);
    expect(responsaveis.atualizarVarios).toHaveBeenCalledWith(CLIENTE, [ana], conexaoDaTransacao);
    expect(responsaveis.inserirVarios).toHaveBeenCalledWith(CLIENTE, [carla], conexaoDaTransacao);
  });

  it('salvar os mesmos responsaveis nao exclui nem insere ninguem', async () => {
    await service.substituirResponsaveis(CLIENTE, [
      { id: ANA, nome: 'Ana' },
      { id: BRUNO, nome: 'Bruno' },
    ]);

    expect(responsaveis.excluirDoClienteExceto).toHaveBeenCalledWith(CLIENTE, [ANA, BRUNO], conexaoDaTransacao);
    expect(responsaveis.inserirVarios).not.toHaveBeenCalled();
  });

  it('com lista vazia, exclui todos e nao atualiza nem insere', async () => {
    await service.substituirResponsaveis(CLIENTE, []);

    expect(responsaveis.excluirDoClienteExceto).toHaveBeenCalledWith(CLIENTE, [], conexaoDaTransacao);
    expect(responsaveis.atualizarVarios).not.toHaveBeenCalled();
    expect(responsaveis.inserirVarios).not.toHaveBeenCalled();
  });

  it('recusa id de responsavel de outro cliente sem alterar nada', async () => {
    const deOutroCliente = '33333333-3333-3333-3333-333333333333';

    await expect(
      service.substituirResponsaveis(CLIENTE, [{ id: deOutroCliente, nome: 'Intruso' }]),
    ).rejects.toMatchObject({ status: 400, campos: { 'responsaveis[0].id': expect.any(String) } });

    expect(responsaveis.excluirDoClienteExceto).not.toHaveBeenCalled();
    expect(responsaveis.atualizarVarios).not.toHaveBeenCalled();
    expect(responsaveis.inserirVarios).not.toHaveBeenCalled();
  });

  it('recusa nome vazio e id repetido antes de abrir a transacao', async () => {
    await expect(
      service.substituirResponsaveis(CLIENTE, [
        { id: ANA, nome: 'Ana' },
        { id: ANA, nome: '  ' },
      ]),
    ).rejects.toMatchObject({
      status: 400,
      campos: { 'responsaveis[1].nome': expect.any(String), 'responsaveis[1].id': expect.any(String) },
    });

    expect(emTransacao).not.toHaveBeenCalled();
  });

  it('uma falha no meio repassa o erro para a transacao desfazer', async () => {
    responsaveis.atualizarVarios.mockRejectedValue(new Error('falha no update'));

    await expect(
      service.substituirResponsaveis(CLIENTE, [{ id: ANA, nome: 'Ana' }, { nome: 'Carla' }]),
    ).rejects.toThrow('falha no update');
    expect(responsaveis.inserirVarios).not.toHaveBeenCalled();
  });
});
