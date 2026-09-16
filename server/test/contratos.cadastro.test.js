import { beforeEach, describe, expect, it, vi } from 'vitest';

// A conexao da transacao e um objeto identificavel, para conferir que todas as
// etapas do cadastro rodam sobre ela e nao sobre o pool comum.
const conexaoDaTransacao = { nome: 'conexao-da-transacao' };

vi.mock('../src/config/db.js', () => ({
  pool: { query: vi.fn() },
  emTransacao: vi.fn((trabalho) => trabalho(conexaoDaTransacao)),
}));

vi.mock('../src/modulos/contratos/cadastros.repository.js', () => ({
  inserirFormaPagamento: vi.fn(),
  inserirContrato: vi.fn(),
  inserirParcelas: vi.fn(),
  vincularResponsaveis: vi.fn(),
  desvincularResponsaveis: vi.fn(),
  buscarClienteDoContrato: vi.fn(),
  vincularResponsavel: vi.fn(),
  desvincularResponsavel: vi.fn(),
  buscarPorId: vi.fn(async () => ({ cliente: { descricao: 'Cliente' } })),
}));

// O registro de atividades e conferido em teste proprio; aqui so e simulado.
vi.mock('../src/modulos/logs/atividades.repository.js', () => ({
  inserir: vi.fn(),
  listar: vi.fn(async () => []),
}));

vi.mock('../src/modulos/contratos/responsaveis.repository.js', () => ({
  buscarPorId: vi.fn(),
}));

const { emTransacao } = await import('../src/config/db.js');
const repository = await import('../src/modulos/contratos/cadastros.repository.js');
const responsaveis = await import('../src/modulos/contratos/responsaveis.repository.js');
const service = await import('../src/modulos/contratos/cadastros.service.js');

const RESP_1 = '11111111-1111-1111-1111-111111111111';
const RESP_2 = '22222222-2222-2222-2222-222222222222';

const dadosValidos = () => ({
  cliente_id: 'cliente',
  tipo_processo_id: 'tipo',
  status_id: 'status',
  data_vigencia: '2026-12-31',
  conta_recebimento_id: null,
  valor_total: 1500,
  responsavel_ids: [RESP_1, RESP_2],
  parcelas: [
    { ordem: 1, percentual: 50, data_pagamento: '2026-10-01' },
    { ordem: 2, percentual: 50, data_pagamento: null },
  ],
});

beforeEach(() => {
  vi.clearAllMocks();
  repository.inserirFormaPagamento.mockResolvedValue({ id: 'forma-1' });
  repository.inserirContrato.mockResolvedValue({ id: 'contrato-1' });
  repository.inserirParcelas.mockResolvedValue();
  repository.vincularResponsaveis.mockResolvedValue([]);
  repository.buscarPorId.mockResolvedValue({ cliente: { descricao: 'Cliente' } });
});

describe('cadastro de contrato', () => {
  it('executa as quatro etapas numa unica transacao, na ordem certa', async () => {
    const contrato = await service.criar(dadosValidos());

    expect(contrato).toEqual({ id: 'contrato-1' });
    expect(emTransacao).toHaveBeenCalledTimes(1);

    expect(repository.inserirFormaPagamento).toHaveBeenCalledWith(2, conexaoDaTransacao);
    expect(repository.inserirContrato).toHaveBeenCalledWith(
      expect.objectContaining({ forma_pagamento_id: 'forma-1', valor_total: 1500 }),
      conexaoDaTransacao,
    );
    expect(repository.inserirParcelas).toHaveBeenCalledWith('contrato-1', dadosValidos().parcelas, conexaoDaTransacao);
    expect(repository.vincularResponsaveis).toHaveBeenCalledWith('contrato-1', [RESP_1, RESP_2], conexaoDaTransacao);
  });

  it('uma falha nas parcelas interrompe o cadastro e repassa o erro para a transacao desfazer', async () => {
    repository.inserirParcelas.mockRejectedValue(new Error('parcela duplicada'));

    await expect(service.criar(dadosValidos())).rejects.toThrow('parcela duplicada');
    expect(repository.vincularResponsaveis).not.toHaveBeenCalled();
  });

  it('sem parcelas nem responsaveis, nao executa essas etapas', async () => {
    await service.criar({ ...dadosValidos(), parcelas: [], responsavel_ids: [] });

    expect(repository.inserirFormaPagamento).toHaveBeenCalledWith(0, conexaoDaTransacao);
    expect(repository.inserirParcelas).not.toHaveBeenCalled();
    expect(repository.vincularResponsaveis).not.toHaveBeenCalled();
  });

  it('dados invalidos sao recusados antes de abrir a transacao', async () => {
    await expect(
      service.criar({ cliente_id: '', valor_total: 'mil', parcelas: [{ ordem: 1.5, percentual: 'x' }] }),
    ).rejects.toMatchObject({
      status: 400,
      campos: expect.objectContaining({
        cliente_id: expect.any(String),
        tipo_processo_id: expect.any(String),
        status_id: expect.any(String),
        valor_total: expect.any(String),
        'parcelas[0].ordem': expect.any(String),
        'parcelas[0].percentual': expect.any(String),
      }),
    });

    expect(emTransacao).not.toHaveBeenCalled();
  });

  it('recusa ids de responsavel mal formados', async () => {
    await expect(
      service.criar({ ...dadosValidos(), responsavel_ids: ['nao-e-uuid'] }),
    ).rejects.toMatchObject({ status: 400 });
    expect(emTransacao).not.toHaveBeenCalled();
  });
});

describe('substituicao dos responsaveis do contrato', () => {
  it('desvincula e vincula na mesma transacao', async () => {
    await service.substituirResponsaveis('contrato-1', [RESP_1]);

    expect(emTransacao).toHaveBeenCalledTimes(1);
    expect(repository.desvincularResponsaveis).toHaveBeenCalledWith('contrato-1', conexaoDaTransacao);
    expect(repository.vincularResponsaveis).toHaveBeenCalledWith('contrato-1', [RESP_1], conexaoDaTransacao);
  });

  it('com lista vazia, apenas desvincula', async () => {
    await service.substituirResponsaveis('contrato-1', []);
    expect(repository.desvincularResponsaveis).toHaveBeenCalled();
    expect(repository.vincularResponsaveis).not.toHaveBeenCalled();
  });
});

describe('vincular um responsavel ao contrato', () => {
  it('vincula responsavel do mesmo cliente do contrato', async () => {
    repository.buscarClienteDoContrato.mockResolvedValue('cliente-1');
    responsaveis.buscarPorId.mockResolvedValue({ id: RESP_1, cliente_id: 'cliente-1' });

    await service.vincularResponsavel('contrato-1', RESP_1);

    expect(repository.vincularResponsavel).toHaveBeenCalledWith('contrato-1', RESP_1, conexaoDaTransacao);
  });

  it('recusa responsavel de outro cliente', async () => {
    repository.buscarClienteDoContrato.mockResolvedValue('cliente-1');
    responsaveis.buscarPorId.mockResolvedValue({ id: RESP_1, cliente_id: 'outro-cliente' });

    await expect(service.vincularResponsavel('contrato-1', RESP_1)).rejects.toMatchObject({
      status: 400,
      campos: { responsavel_id: expect.any(String) },
    });
    expect(repository.vincularResponsavel).not.toHaveBeenCalled();
  });

  it('contrato inexistente responde 404', async () => {
    repository.buscarClienteDoContrato.mockResolvedValue(null);

    await expect(service.vincularResponsavel('contrato-x', RESP_1)).rejects.toMatchObject({ status: 404 });
    expect(repository.vincularResponsavel).not.toHaveBeenCalled();
  });

  it('recusa id ausente ou mal formado sem consultar o banco', async () => {
    await expect(service.vincularResponsavel('contrato-1', 'abc')).rejects.toMatchObject({ status: 400 });
    expect(repository.buscarClienteDoContrato).not.toHaveBeenCalled();
  });
});
