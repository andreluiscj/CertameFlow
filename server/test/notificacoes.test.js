import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubEnv('SMTP_HOST', 'smtp.exemplo.com');
vi.stubEnv('SMTP_FROM', 'certameflow@exemplo.com');
vi.stubEnv('NOTIFICACOES_HORA', '8');

vi.mock('../src/modulos/notificacoes/notificacoes.repository.js', () => ({
  listarTarefasAtrasadas: vi.fn(async () => []),
  listarParcelasAtrasadas: vi.fn(async () => []),
  listarDestinatarios: vi.fn(async () => []),
  jaEnviado: vi.fn(async () => false),
  reservarEnvio: vi.fn(async () => true),
  concluirEnvio: vi.fn(),
  cancelarEnvio: vi.fn(),
  ultimoEnvio: vi.fn(async () => null),
}));

// O envio e simulado, mas a traducao das mensagens de erro e a real.
vi.mock('../src/modulos/notificacoes/email.js', async (importOriginal) => {
  const real = await importOriginal();
  return {
    emailConfigurado: () => true,
    descreverErroSmtp: real.descreverErroSmtp,
    verificarConexao: vi.fn(async () => {}),
    enviarEmail: vi.fn(async () => {}),
  };
});

const repository = await import('../src/modulos/notificacoes/notificacoes.repository.js');
const email = await import('../src/modulos/notificacoes/email.js');
const { montarResumo, diasDeAtraso } = await import('../src/modulos/notificacoes/resumo.js');
const { agoraNoFuso, enviarAgora, enviarResumoDoDiaSePreciso } = await import('../src/modulos/notificacoes/notificacoes.service.js');

/** Erro no formato que o nodemailer lanca quando o Gmail recusa a senha. */
const senhaRecusada = () => Object.assign(new Error('Invalid login: 535-5.7.8 Username and Password not accepted'), {
  code: 'EAUTH',
  responseCode: 535,
});

const HOJE = '2026-09-15';
const tarefa = { titulo: 'Publicar edital <urgente>', data: '2026-09-10', concurso_nome: 'Concurso Prefeitura' };
const parcela = { ordem: 2, data_pagamento: '2026-09-14', valor: 1500, cliente: 'Câmara', cidade: 'Montes Claros', uf: 'MG' };
const usuario = (modulos, nivel = 0) => ({ nome: 'Ana', email: 'ana@exemplo.com', nivel_acesso: nivel, modulos });

// 15/09/2026 as 09:00 e as 07:00 no horario de Brasilia (UTC-3).
const AS_9H = new Date('2026-09-15T12:00:00Z');
const AS_7H = new Date('2026-09-15T10:00:00Z');

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('conteudo do resumo', () => {
  it('quem so tem Contratos recebe so as parcelas', () => {
    const resumo = montarResumo({ usuario: usuario(['contratos']), tarefas: [tarefa], parcelas: [parcela], hoje: HOJE, urlSistema: 'http://app' });
    expect(resumo.assunto).toBe('CertameFlow: 1 parcela atrasada');
    expect(resumo.html).not.toContain('Tarefas atrasadas');
  });

  it('quem tem Contratos e Concursos recebe tarefas e parcelas', () => {
    const resumo = montarResumo({ usuario: usuario(['contratos', 'concursos']), tarefas: [tarefa], parcelas: [parcela], hoje: HOJE, urlSistema: 'http://app' });
    expect(resumo.assunto).toBe('CertameFlow: 1 tarefa atrasada e 1 parcela atrasada');
    expect(resumo.html).toContain('5 dias');
    expect(resumo.texto).toContain('parcela 2');
  });

  it('escapa o HTML vindo do banco', () => {
    const resumo = montarResumo({ usuario: usuario(['concursos']), tarefas: [tarefa], parcelas: [], hoje: HOJE, urlSistema: 'http://app' });
    expect(resumo.html).toContain('Publicar edital &lt;urgente&gt;');
    expect(resumo.html).not.toContain('<urgente>');
  });

  it('sem pendencias visiveis para o usuario nao gera e-mail', () => {
    const semParcelas = { tarefas: [tarefa], parcelas: [], hoje: HOJE, urlSistema: '' };
    expect(montarResumo({ usuario: usuario(['contratos']), ...semParcelas })).toBeNull();
    // quem so tem Provas nao ve tarefas nem parcelas
    const tudo = { tarefas: [tarefa], parcelas: [parcela], hoje: HOJE, urlSistema: '' };
    expect(montarResumo({ usuario: usuario(['provas']), ...tudo })).toBeNull();
  });

  it('quem so tem Concursos recebe so as tarefas', () => {
    const resumo = montarResumo({ usuario: usuario(['concursos']), tarefas: [tarefa], parcelas: [parcela], hoje: HOJE, urlSistema: '' });
    expect(resumo.assunto).toBe('CertameFlow: 1 tarefa atrasada');
  });

  it('administrador recebe tudo, mesmo sem modulos marcados', () => {
    const resumo = montarResumo({ usuario: usuario([], 4), tarefas: [tarefa], parcelas: [parcela], hoje: HOJE, urlSistema: '' });
    expect(resumo.assunto).toBe('CertameFlow: 1 tarefa atrasada e 1 parcela atrasada');
  });

  it('calcula os dias de atraso', () => {
    expect(diasDeAtraso('2026-09-14', HOJE)).toBe(1);
  });
});

describe('envio automatico diario', () => {
  it('usa a data e a hora do fuso configurado', () => {
    expect(agoraNoFuso('America/Sao_Paulo', new Date('2026-09-16T01:30:00Z'))).toEqual({ data: '2026-09-15', hora: 22 });
  });

  it('antes do horario nao faz nada', async () => {
    expect(await enviarResumoDoDiaSePreciso(AS_7H)).toBeNull();
    expect(repository.reservarEnvio).not.toHaveBeenCalled();
  });

  it('se o dia ja foi enviado, nao envia de novo nem conecta ao SMTP', async () => {
    repository.jaEnviado.mockResolvedValueOnce(true);
    expect(await enviarResumoDoDiaSePreciso(AS_9H)).toBeNull();
    expect(email.verificarConexao).not.toHaveBeenCalled();
    expect(repository.reservarEnvio).not.toHaveBeenCalled();
  });

  it('se outro processo reservou o dia primeiro, nao envia', async () => {
    repository.reservarEnvio.mockResolvedValueOnce(false);
    expect(await enviarResumoDoDiaSePreciso(AS_9H)).toBeNull();
    expect(email.enviarEmail).not.toHaveBeenCalled();
  });

  it('com a senha recusada, nao reserva o dia e explica o motivo', async () => {
    email.verificarConexao.mockRejectedValueOnce(senhaRecusada());
    await expect(enviarResumoDoDiaSePreciso(AS_9H)).rejects.toMatchObject({
      status: 502,
      message: expect.stringContaining('senha de app'),
    });
    expect(repository.reservarEnvio).not.toHaveBeenCalled();
  });

  it('envia um e-mail por destinatario com pendencias e registra o dia', async () => {
    repository.listarTarefasAtrasadas.mockResolvedValueOnce([tarefa]);
    repository.listarDestinatarios.mockResolvedValueOnce([usuario(['contratos']), { ...usuario(['concursos']), email: 'bia@exemplo.com' }]);

    const resultado = await enviarResumoDoDiaSePreciso(AS_9H);

    expect(repository.reservarEnvio).toHaveBeenCalledWith(HOJE);
    expect(email.enviarEmail).toHaveBeenCalledTimes(1);
    expect(email.enviarEmail.mock.calls[0][0].para).toBe('bia@exemplo.com');
    expect(resultado).toMatchObject({ enviados: 1, falhas: 0 });
    expect(repository.concluirEnvio).toHaveBeenCalledWith(HOJE, 1);
  });

  it('se todos os envios falharem, libera o dia e informa o motivo', async () => {
    repository.listarParcelasAtrasadas.mockResolvedValueOnce([parcela]);
    repository.listarDestinatarios.mockResolvedValueOnce([usuario(['contratos'])]);
    email.enviarEmail.mockRejectedValueOnce(new Error('SMTP recusou'));

    const resultado = await enviarResumoDoDiaSePreciso(AS_9H);

    expect(resultado.erro).toContain('Falha no servidor de e-mail: SMTP recusou');
    expect(repository.cancelarEnvio).toHaveBeenCalledWith(HOJE);
    expect(repository.concluirEnvio).not.toHaveBeenCalled();
  });
});

describe('envio pelo botao "Enviar agora"', () => {
  it('senha recusada vira 502 com orientacao, sem consultar o banco', async () => {
    email.verificarConexao.mockRejectedValueOnce(senhaRecusada());
    await expect(enviarAgora()).rejects.toMatchObject({
      status: 502,
      message: expect.stringContaining('SMTP_USER e SMTP_PASS'),
    });
    expect(repository.listarDestinatarios).not.toHaveBeenCalled();
    expect(email.enviarEmail).not.toHaveBeenCalled();
  });

  it('servidor inexistente vira mensagem sobre SMTP_HOST', async () => {
    email.verificarConexao.mockRejectedValueOnce(Object.assign(new Error('getaddrinfo ENOTFOUND gmail'), { code: 'EDNS' }));
    await expect(enviarAgora()).rejects.toThrow(/SMTP_HOST e SMTP_PORT/);
  });

  it('com login aceito, envia e devolve o resultado', async () => {
    repository.listarParcelasAtrasadas.mockResolvedValueOnce([parcela]);
    repository.listarDestinatarios.mockResolvedValueOnce([usuario([], 4)]);

    const resultado = await enviarAgora();

    expect(resultado).toMatchObject({ parcelas: 1, enviados: 1, falhas: 0, erro: null });
    expect(repository.reservarEnvio).not.toHaveBeenCalled();
  });
});
