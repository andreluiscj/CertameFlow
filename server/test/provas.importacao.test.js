import { beforeEach, describe, expect, it, vi } from 'vitest';

const conexaoDaTransacao = { nome: 'conexao-da-transacao' };

vi.mock('../src/config/db.js', () => ({
  pool: { query: vi.fn() },
  emTransacao: vi.fn((trabalho) => trabalho(conexaoDaTransacao)),
}));

vi.mock('../src/modulos/provas/provas.repository.js', () => ({
  buscarNiveisPorDescricao: vi.fn(),
  limparConcurso: vi.fn(),
  inserirProvas: vi.fn(),
  inserirCargos: vi.fn(),
  inserirDisciplinas: vi.fn(),
  buscarStatusSolicitar: vi.fn(),
  inserirDisciplinaNiveis: vi.fn(),
  nomeDoConcurso: vi.fn(async () => 'Concurso'),
}));

// O registro de atividades e conferido em teste proprio; aqui so e simulado.
vi.mock('../src/modulos/logs/atividades.repository.js', () => ({
  inserir: vi.fn(),
  listar: vi.fn(async () => []),
}));

const { emTransacao } = await import('../src/config/db.js');
const repository = await import('../src/modulos/provas/provas.repository.js');
const service = await import('../src/modulos/provas/provas.service.js');

const CONCURSO = 'concurso-1';

const linha = (prova, cargo, nivel, disciplina, questoes, extra = {}) => ({
  prova, cargo, nivel, disciplina, questoes, tipo: '', total_questoes: 40, ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  repository.buscarNiveisPorDescricao.mockResolvedValue([
    { id: 'nivel-medio', descricao: 'Médio' },
    { id: 'nivel-superior', descricao: 'Superior' },
  ]);
  repository.inserirProvas.mockImplementation(async (_c, codigos) =>
    codigos.map((codigo) => ({ id: `prova-${codigo}`, codigo })),
  );
  repository.inserirDisciplinas.mockImplementation(async (disciplinas) =>
    disciplinas.map((d, i) => ({ id: `disc-${i}`, prova_id: d.prova_id, disciplina: d.disciplina })),
  );
  repository.buscarStatusSolicitar.mockResolvedValue('status-solicitar');
});

describe('importacao de provas', () => {
  it('aplica as regras da planilha numa unica transacao', async () => {
    const resultado = await service.importar(CONCURSO, {
      linhas: [
        linha(1, 'Agente', 'Médio', 'Português', 10, { tipo: 'Objetiva' }),
        linha(1, 'Agente', 'Médio', 'Matemática', 5),
        linha(1, 'Fiscal', 'Superior', 'Português', 20), // mesmo prova, outro cargo: nao gera disciplina
        linha(1, 'Fiscal', 'Superior', 'Direito', 8), // disciplina so do segundo cargo: ignorada
        linha(2, 'Médico', 'Superior', 'Clínica', 30),
      ],
    });

    expect(emTransacao).toHaveBeenCalledTimes(1);
    expect(repository.limparConcurso).toHaveBeenCalledWith(CONCURSO, conexaoDaTransacao);
    expect(repository.inserirProvas).toHaveBeenCalledWith(CONCURSO, [1, 2], conexaoDaTransacao);

    expect(repository.inserirCargos.mock.calls[0][1]).toEqual([
      { descricao: 'Agente', prova_id: 'prova-1', nivel_id: 'nivel-medio' },
      { descricao: 'Fiscal', prova_id: 'prova-1', nivel_id: 'nivel-superior' },
      { descricao: 'Médico', prova_id: 'prova-2', nivel_id: 'nivel-superior' },
    ]);

    expect(repository.inserirDisciplinas.mock.calls[0][0]).toEqual([
      { prova_id: 'prova-1', disciplina: 'Português', tipo: 'Objetiva', questoes: 10, total_questoes_prova: 40 },
      { prova_id: 'prova-1', disciplina: 'Matemática', tipo: null, questoes: 5, total_questoes_prova: 40 },
      { prova_id: 'prova-2', disciplina: 'Clínica', tipo: null, questoes: 30, total_questoes_prova: 40 },
    ]);

    // nivel da prova vem do primeiro cargo; qtd da primeira linha da disciplina
    expect(repository.inserirDisciplinaNiveis).toHaveBeenCalledWith(
      [
        { disciplina_id: 'disc-0', nivel_id: 'nivel-medio', qtd: 10 },
        { disciplina_id: 'disc-1', nivel_id: 'nivel-medio', qtd: 5 },
        { disciplina_id: 'disc-2', nivel_id: 'nivel-superior', qtd: 30 },
      ],
      'status-solicitar',
      conexaoDaTransacao,
    );

    expect(resultado).toEqual({ provas: 2, cargos: 3, disciplinas: 3 });
  });

  it('nivel nao cadastrado recusa a importacao antes de apagar as provas atuais', async () => {
    await expect(
      service.importar(CONCURSO, { linhas: [linha(1, 'Agente', 'Fundamental', 'Português', 10)] }),
    ).rejects.toMatchObject({ status: 400 });
    expect(repository.limparConcurso).not.toHaveBeenCalled();
  });

  it('uma falha no meio repassa o erro para a transacao desfazer a limpeza', async () => {
    repository.inserirDisciplinas.mockRejectedValue(new Error('falha nas disciplinas'));

    await expect(
      service.importar(CONCURSO, { linhas: [linha(1, 'Agente', 'Médio', 'Português', 10)] }),
    ).rejects.toThrow('falha nas disciplinas');
    expect(repository.inserirDisciplinaNiveis).not.toHaveBeenCalled();
  });

  it('linhas invalidas sao recusadas sem abrir transacao', async () => {
    await expect(
      service.importar(CONCURSO, { linhas: [{ prova: 'um', cargo: '', nivel: 'Médio', disciplina: 'X', questoes: 1 }] }),
    ).rejects.toMatchObject({
      status: 400,
      campos: expect.objectContaining({ 'linhas[0].prova': expect.any(String), 'linhas[0].cargo': expect.any(String) }),
    });
    expect(emTransacao).not.toHaveBeenCalled();
  });
});
