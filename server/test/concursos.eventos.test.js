import { beforeEach, describe, expect, it, vi } from 'vitest';

const conexaoDaTransacao = { nome: 'conexao-da-transacao' };

vi.mock('../src/config/db.js', () => ({
  pool: { query: vi.fn() },
  emTransacao: vi.fn((trabalho) => trabalho(conexaoDaTransacao)),
}));

vi.mock('../src/modulos/concursos/eventos.repository.js', () => ({
  buscarPorId: vi.fn(),
  nomeDoConcurso: vi.fn(async () => 'Concurso X'),
  definirConcluidas: vi.fn(),
  todasConcluidas: vi.fn(),
  finalizarConcurso: vi.fn(),
  inserirVarios: vi.fn(),
}));

vi.mock('../src/modulos/logs/atividades.repository.js', () => ({
  inserir: vi.fn(),
  listar: vi.fn(),
}));

const { executarComUsuario } = await import('../src/config/contexto.js');
const repository = await import('../src/modulos/concursos/eventos.repository.js');
const logs = await import('../src/modulos/logs/atividades.repository.js');
const service = await import('../src/modulos/concursos/eventos.service.js');

const USUARIO = 'usuario-1';
const TAREFA = '11111111-1111-1111-1111-111111111111';
const CONCURSO = '22222222-2222-2222-2222-222222222222';

const comoUsuario = (funcao) => executarComUsuario(USUARIO, funcao);
const registros = () => logs.inserir.mock.calls.map(([, r]) => r);

beforeEach(() => {
  vi.clearAllMocks();
  repository.nomeDoConcurso.mockResolvedValue('Concurso X');
});

describe('conclusao de tarefas', () => {
  it('registra quem concluiu, na mesma transacao', async () => {
    const tarefa = { id: TAREFA, concurso_id: CONCURSO, titulo: 'Publicar edital', concluido: true };
    repository.definirConcluidas.mockResolvedValue([tarefa]);
    repository.buscarPorId.mockResolvedValue(tarefa);
    repository.todasConcluidas.mockResolvedValue(false);

    const resultado = await comoUsuario(() => service.definirConcluida(TAREFA, { concluido: true }));

    expect(resultado.concurso_finalizado).toBeNull();
    expect(logs.inserir).toHaveBeenCalledWith(conexaoDaTransacao, expect.anything());
    expect(registros()).toEqual([
      expect.objectContaining({
        modulo: 'concursos',
        acao: 'concluiu',
        entidade: 'tarefa',
        entidadeId: TAREFA,
        usuarioId: USUARIO,
        descricao: 'Concluiu a tarefa "Publicar edital" do concurso "Concurso X".',
      }),
    ]);
  });

  it('registra quem desmarcou a conclusao', async () => {
    const tarefa = { id: TAREFA, concurso_id: CONCURSO, titulo: 'Publicar edital', concluido: false };
    repository.definirConcluidas.mockResolvedValue([tarefa]);
    repository.buscarPorId.mockResolvedValue(tarefa);

    await comoUsuario(() => service.definirConcluida(TAREFA, { concluido: false }));

    expect(registros()[0]).toMatchObject({ acao: 'desconcluiu', usuarioId: USUARIO });
    expect(repository.todasConcluidas).not.toHaveBeenCalled();
  });

  it('marcar de novo o mesmo estado nao gera registro', async () => {
    repository.definirConcluidas.mockResolvedValue([]);
    repository.buscarPorId.mockResolvedValue({ id: TAREFA, concurso_id: CONCURSO, concluido: true });
    repository.todasConcluidas.mockResolvedValue(false);

    await comoUsuario(() => service.definirConcluida(TAREFA, { concluido: true }));

    expect(logs.inserir).not.toHaveBeenCalled();
  });

  it('concluir a ultima tarefa finaliza o concurso e registra a finalizacao', async () => {
    const tarefa = { id: TAREFA, concurso_id: CONCURSO, titulo: 'Resultado', concluido: true };
    repository.definirConcluidas.mockResolvedValue([tarefa]);
    repository.buscarPorId.mockResolvedValue(tarefa);
    repository.todasConcluidas.mockResolvedValue(true);
    repository.finalizarConcurso.mockResolvedValue({ nome: 'Concurso X', ja_finalizado: false });

    const resultado = await comoUsuario(() => service.definirConcluida(TAREFA, { concluido: true }));

    expect(resultado.concurso_finalizado).toBe('Concurso X');
    expect(registros().map((r) => r.acao)).toEqual(['concluiu', 'finalizou']);
  });

  it('tarefa inexistente responde 404', async () => {
    repository.definirConcluidas.mockResolvedValue([]);
    repository.buscarPorId.mockResolvedValue(null);

    await expect(service.definirConcluida(TAREFA, { concluido: true })).rejects.toMatchObject({ status: 404 });
  });
});

describe('importacao de tarefas', () => {
  it('ignora linhas invalidas, grava as validas e registra um unico log de importacao', async () => {
    repository.inserirVarios.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);

    const resultado = await comoUsuario(() =>
      service.importar(CONCURSO, {
        arquivo: 'cronograma.csv',
        eventos: [
          { titulo: 'Edital', data: '2026-10-01', hora: null },
          { titulo: 'Prova', data: '2026-12-13', hora: '08:00' },
          { titulo: '', data: '2026-10-02' },
          { titulo: 'Data ruim', data: '13/12/2026' },
        ],
      }),
    );

    expect(repository.inserirVarios).toHaveBeenCalledWith(
      CONCURSO,
      [
        { titulo: 'Edital', data: '2026-10-01', hora: null },
        { titulo: 'Prova', data: '2026-12-13', hora: '08:00' },
      ],
      conexaoDaTransacao,
    );
    expect(resultado).toEqual({ importados: 2, falhas: 2 });
    expect(registros()).toEqual([
      expect.objectContaining({
        acao: 'importou',
        usuarioId: USUARIO,
        descricao: 'Importou 2 tarefas do arquivo "cronograma.csv" do concurso "Concurso X".',
      }),
    ]);
  });
});
