import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('jose', () => ({
  createRemoteJWKSet: () => ({}),
  jwtVerify: vi.fn(async (token) => ({ payload: { sub: token } })),
}));

vi.mock('../src/modulos/usuarios/perfilRepository.js', () => ({
  buscarAcesso: vi.fn(async () => ({ nivelAcesso: 0, modulos: ['contratos'] })),
}));

vi.mock('../src/config/db.js', () => {
  const pool = { query: vi.fn(async () => ({ rows: [], rowCount: 0 })) };
  return { pool, emTransacao: vi.fn((trabalho) => trabalho(pool)) };
});

vi.mock('../src/modulos/logs/atividades.repository.js', () => ({
  inserir: vi.fn(),
  listar: vi.fn(async () => []),
}));

const bucket = {
  upload: vi.fn(async () => ({ error: null })),
  remove: vi.fn(async () => ({ error: null })),
  createSignedUrl: vi.fn(async () => ({ data: { signedUrl: 'https://storage.exemplo/assinado' }, error: null })),
};
vi.mock('../src/config/supabaseAdmin.js', () => ({
  supabaseAdmin: () => ({ storage: { from: () => bucket } }),
}));

const { criarApp } = await import('../src/app.js');
const { pool } = await import('../src/config/db.js');
const { validarArquivo } = await import('../src/modulos/contratos/comprovantes.service.js');

const PARCELA_ID = '33333333-3333-4333-8333-333333333333';
const CONTRATO_ID = '44444444-4444-4444-8444-444444444444';
const TOKEN = 'Bearer usuario-contratos';
const app = criarApp();

const PDF = Buffer.from('%PDF-1.7\n conteudo');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

const parcela = (dados = {}) => ({ id: PARCELA_ID, contrato_id: CONTRATO_ID, ordem: 1, comprovante_caminho: null, ...dados });

/** Responde cada consulta conforme o trecho de SQL. */
function bancoCom(respostas) {
  pool.query.mockImplementation(async (sql) => {
    const chave = Object.keys(respostas).find((trecho) => sql.includes(trecho));
    const rows = chave ? respostas[chave] : [];
    return { rows, rowCount: rows.length };
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  bancoCom({});
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('validacao do arquivo', () => {
  it('aceita PDF e PNG pelo conteudo', () => {
    expect(validarArquivo({ buffer: PDF, mimetype: 'application/pdf' }).extensao).toBe('pdf');
    expect(validarArquivo({ buffer: PNG, mimetype: 'image/png' }).extensao).toBe('png');
  });

  it('recusa arquivo que diz ser PDF mas nao e', () => {
    expect(() => validarArquivo({ buffer: Buffer.from('MZ executavel'), mimetype: 'application/pdf' })).toThrow(
      /PDF ou uma imagem/,
    );
  });

  it('recusa tipo nao aceito', () => {
    expect(() => validarArquivo({ buffer: PDF, mimetype: 'text/plain' })).toThrow(/PDF ou uma imagem/);
  });
});

describe('rotas de comprovante da parcela', () => {
  it('sem arquivo responde 400', async () => {
    const resposta = await request(app).post(`/api/contratos/parcelas/${PARCELA_ID}/comprovante`).set('Authorization', TOKEN);
    expect(resposta.status).toBe(400);
    expect(bucket.upload).not.toHaveBeenCalled();
  });

  it('envia ao Storage, grava na parcela e remove o arquivo anterior', async () => {
    // A ordem importa: a consulta "with anterior as" tambem contem o trecho da segunda chave.
    bancoCom({
      'with anterior as': [{ ...parcela(), comprovante_nome: 'recibo.pdf', caminho_anterior: 'antigo.pdf' }],
      'comprovante_caminho from contrato_parcelas where id': [parcela({ comprovante_caminho: 'antigo.pdf' })],
    });

    const resposta = await request(app)
      .post(`/api/contratos/parcelas/${PARCELA_ID}/comprovante`)
      .set('Authorization', TOKEN)
      .attach('arquivo', PDF, { filename: 'recibo.pdf', contentType: 'application/pdf' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.caminho_anterior).toBeUndefined();
    const [caminho, , opcoes] = bucket.upload.mock.calls[0];
    expect(caminho).toMatch(new RegExp(`^${CONTRATO_ID}/${PARCELA_ID}/[0-9a-f-]+\\.pdf$`));
    expect(opcoes.contentType).toBe('application/pdf');
    expect(bucket.remove).toHaveBeenCalledWith(['antigo.pdf']);
  });

  it('se a gravacao no banco falhar, apaga o arquivo recem-enviado', async () => {
    pool.query.mockImplementation(async (sql) => {
      if (sql.includes('with anterior as')) throw new Error('falha no banco');
      return { rows: [parcela()], rowCount: 1 };
    });

    const resposta = await request(app)
      .post(`/api/contratos/parcelas/${PARCELA_ID}/comprovante`)
      .set('Authorization', TOKEN)
      .attach('arquivo', PNG, { filename: 'foto.png', contentType: 'image/png' });

    expect(resposta.status).toBe(500);
    const enviado = bucket.upload.mock.calls[0][0];
    expect(bucket.remove).toHaveBeenCalledWith([enviado]);
  });

  it('gera link temporario para abrir o comprovante', async () => {
    bancoCom({
      'comprovante_caminho from contrato_parcelas where id': [
        parcela({ comprovante_caminho: 'a/b/c.pdf', comprovante_nome: 'recibo.pdf', comprovante_tipo: 'application/pdf' }),
      ],
    });

    const resposta = await request(app).get(`/api/contratos/parcelas/${PARCELA_ID}/comprovante`).set('Authorization', TOKEN);

    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ url: 'https://storage.exemplo/assinado', nome: 'recibo.pdf', tipo: 'application/pdf' });
    expect(bucket.createSignedUrl).toHaveBeenCalledWith('a/b/c.pdf', 300);
  });

  it('link de parcela sem comprovante responde 404', async () => {
    bancoCom({ 'comprovante_caminho from contrato_parcelas where id': [parcela()] });
    const resposta = await request(app).get(`/api/contratos/parcelas/${PARCELA_ID}/comprovante`).set('Authorization', TOKEN);
    expect(resposta.status).toBe(404);
  });

  it('excluir o contrato remove os comprovantes do Storage depois de gravar', async () => {
    bancoCom({
      'where k.id': [{ id: CONTRATO_ID, cliente: { descricao: 'Prefeitura' } }],
      'comprovante_caminho is not null': [{ comprovante_caminho: 'x.pdf' }, { comprovante_caminho: 'y.png' }],
      'delete from contrato_cadastros': [{}],
    });

    const resposta = await request(app).delete(`/api/contratos/cadastros/${CONTRATO_ID}`).set('Authorization', TOKEN);

    expect(resposta.status).toBe(204);
    expect(bucket.remove).toHaveBeenCalledWith(['x.pdf', 'y.png']);
  });
});
