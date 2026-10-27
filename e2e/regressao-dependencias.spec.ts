import { expect, test, type Page } from '@playwright/test';
import * as XLSX from '../node_modules/xlsx';
import { readFileSync } from 'node:fs';
import { entrar, instalarMocks, novoEstado } from './mocks';

const CONCURSO = {
  id: 'c0000000-0000-4000-8000-000000000001', concurso_id: 'CC-001', nome: 'Concurso Teste', tipo: 'Prefeitura', uf: 'MG',
  cidade: 'Montes Claros', cor: '#3B82F6', status: 'Em andamento', nota_titulo: false, observacoes: '', cod_projeto: 'PRJ-9',
};

/** Mocks gerais mais as respostas de dados que estas telas pedem. Rotas registradas depois vencem as anteriores. */
async function preparar(page: Page, extra?: (corpos: Record<string, unknown[]>) => Promise<void>) {
  const e = novoEstado();
  const corpos: Record<string, unknown[]> = {};
  await instalarMocks(page, e);
  const json = (route: import('@playwright/test').Route, corpo: unknown, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(corpo) });
  await page.route('**/api/concursos', (r) => {
    if (r.request().method() === 'POST') { (corpos.criar ??= []).push(r.request().postDataJSON()); return json(r, { ...CONCURSO, ...r.request().postDataJSON() }, 201); }
    return json(r, [CONCURSO]);
  });
  await page.route('**/api/concursos/tipos', (r) => json(r, [{ id: 't1', nome: 'Prefeitura' }, { id: 't2', nome: 'Câmara' }]));
  await page.route('**/api/concursos/status', (r) => json(r, [{ id: 's1', nome: 'Em andamento' }, { id: 's2', nome: 'Finalizado' }]));
  await page.route(`**/api/concursos/${CONCURSO.id}`, (r) => {
    if (r.request().method() === 'PATCH') { (corpos.editar ??= []).push(r.request().postDataJSON()); return json(r, { ...CONCURSO, ...r.request().postDataJSON() }); }
    return json(r, CONCURSO);
  });
  await extra?.(corpos);
  await page.goto('/');
  await entrar(page, e.email, e.senha);
  await expect(page.getByLabel('E-mail')).toHaveCount(0);
  return { e, corpos };
}

test.describe('regressão das atualizações (vite 6, router 7, zod 4, xlsx 0.20.3)', () => {
  test.use({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });

  test('1. navegação: rotas dos 3 módulos abrem sem 404 nem erro de script; Link, navigate e voltar', async ({ page }) => {
    test.setTimeout(180_000);
    const erros: string[] = [];
    page.on('pageerror', (er) => erros.push(er.message));
    await preparar(page);
    const rotas = [
      '/', '/concursos/dashboard', '/concursos', '/concursos/finalizados', '/concursos/novo', `/concursos/${CONCURSO.id}`,
      '/concursos/inscricoes', '/concursos/agenda', '/concursos/tarefas', '/concursos/estatisticas',
      '/contratos/dashboard', '/contratos/lista',
      '/provas/dashboard', '/provas/concursos', '/provas/elaboradores', '/provas/pedidos', `/provas/pedidos/${CONCURSO.id}`,
      '/administracao',
    ];
    for (const rota of rotas) {
      await page.goto(rota, { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('Página não encontrada'), rota).toHaveCount(0);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('body'), rota).not.toBeEmpty();
    }
    // Link e navigate (SPA, sem recarregar): Concursos -> Novo -> Cancelar (Link) -> voltar
    await page.goto('/concursos');
    await page.getByRole('link', { name: /novo concurso/i }).first().click();
    await expect(page).toHaveURL(/\/concursos\/novo$/);
    await page.getByRole('link', { name: 'Cancelar' }).click();
    await expect(page).toHaveURL(/\/concursos$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/concursos\/novo$/);
    await page.goForward();
    await expect(page).toHaveURL(/\/concursos$/);
    // Módulos -> /provas (links da sidebar)
    await page.goto('/provas/dashboard');
    await page.getByRole('link', { name: 'Módulos' }).click();
    await expect(page).toHaveURL(/\/$/);
    expect(erros, `erros de script: ${erros.join(' | ')}`).toEqual([]);
  });

  test('2. NovoConcurso e EditarConcurso (zod 4): obrigatórios e envio', async ({ page }) => {
    const { corpos } = await preparar(page);
    await page.goto('/concursos/novo');
    await page.getByRole('button', { name: 'Salvar Concurso' }).click();
    for (const m of ['ID do concurso é obrigatório', 'Nome é obrigatório', 'Tipo é obrigatório', 'UF é obrigatória', 'Cidade é obrigatória']) {
      await expect(page.getByText(m)).toBeVisible();
    }
    expect(corpos.criar ?? []).toEqual([]); // nada enviado com campos vazios
    await page.screenshot({ path: './resultado/dep-2a-novo-validacao.png' });

    await page.getByLabel('ID do Concurso').fill('CC-777');
    await page.getByLabel('Nome do Concurso').fill('Concurso Novo');
    await page.getByLabel('Cidade').fill('Belo Horizonte');
    await page.getByRole('combobox').nth(0).click();
    await page.getByRole('button', { name: 'Câmara' }).click();
    await page.getByRole('combobox').nth(1).click();
    await page.getByRole('button', { name: 'MG', exact: true }).click();
    await page.getByRole('button', { name: 'Salvar Concurso' }).click();
    await expect(page).toHaveURL(/\/concursos$/);
    expect(corpos.criar).toHaveLength(1);
    expect(corpos.criar[0]).toMatchObject({ concurso_id: 'CC-777', nome: 'Concurso Novo', tipo: 'Câmara', uf: 'MG', cidade: 'Belo Horizonte', nota_titulo: false });

    await page.goto(`/concursos/${CONCURSO.id}/editar`);
    await expect(page.getByLabel('Nome do Concurso')).toHaveValue('Concurso Teste');
    await page.getByLabel('Nome do Concurso').fill('');
    await page.getByRole('button', { name: /Salvar/ }).first().click();
    await expect(page.getByText('Nome é obrigatório')).toBeVisible();
    expect(corpos.editar ?? []).toEqual([]);
    await page.getByLabel('Nome do Concurso').fill('Concurso Editado');
    await page.getByRole('button', { name: /Salvar/ }).first().click();
    await expect(page).toHaveURL(new RegExp(`/concursos/${CONCURSO.id}$`));
    expect(corpos.editar[0]).toMatchObject({ nome: 'Concurso Editado', concurso_id: 'CC-001' });
    expect(corpos.editar[0]).not.toHaveProperty('observacoes');
  });

  test('3a. xlsx: importar planilha pequena no ImportProvasDialog e baixar o modelo', async ({ page }) => {
    const { corpos } = await preparar(page, async (c) => {
      await page.route('**/api/provas/niveis', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ descricao: 'Ensino Médio' }]) }));
      await page.route('**/api/provas/concursos/*/importacoes', (r) => {
        (c.importar ??= []).push(r.request().postDataJSON());
        return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ provas: 1, cargos: 1, disciplinas: 2 }) });
      });
    });
    const ws = XLSX.utils.json_to_sheet([
      { CARGO: 'Analista', 'NÍVEL': 'Médio', PROVA: 1, TIPO: 'Objetiva', DISCIPLINA: 'Português', 'QUESTÕES': 10, 'TOTAL QUESTÕES PROVA': 20 },
      { CARGO: 'Analista', 'NÍVEL': 'Médio', PROVA: 1, TIPO: 'Objetiva', DISCIPLINA: 'Matemática', 'QUESTÕES': 10, 'TOTAL QUESTÕES PROVA': 20 },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Provas');
    const buffer = Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));

    await page.goto(`/provas/pedidos/${CONCURSO.id}`);
    await page.getByRole('button', { name: /Importar Excel/ }).first().click();
    const dialogo = page.getByRole('dialog', { name: 'Importar Provas' });

    const [modelo] = await Promise.all([page.waitForEvent('download'), dialogo.getByRole('button', { name: 'Baixar modelo de planilha' }).click()]);
    const lido = XLSX.read(readFileSync(await modelo.path() as string));
    const linhasModelo = XLSX.utils.sheet_to_json<Record<string, unknown>>(lido.Sheets[lido.SheetNames[0]]);
    expect(modelo.suggestedFilename()).toBe('modelo_pedidos_questoes.xlsx');
    expect(linhasModelo).toHaveLength(2);
    expect(Object.keys(linhasModelo[0])).toContain('TOTAL QUESTÕES PROVA');

    await dialogo.locator('input[type=file]').setInputFiles({ name: 'provas.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer });
    await expect(dialogo.getByText('2', { exact: false }).first()).toBeVisible();
    await expect(dialogo.getByText(/P1 · Analista · Ensino Médio · Português \(10\)/)).toBeVisible();
    await page.screenshot({ path: './resultado/dep-3a-importacao.png' });
    await dialogo.getByRole('button', { name: /Importar/ }).last().click();
    await expect(page.getByText(/Importação concluída: 1 provas, 1 cargos, 2 disciplinas/)).toBeVisible();
    expect(corpos.importar[0]).toEqual({
      linhas: [
        { cargo: 'Analista', nivel: 'Ensino Médio', prova: 1, tipo: 'Objetiva', disciplina: 'Português', questoes: 10, total_questoes: 20 },
        { cargo: 'Analista', nivel: 'Ensino Médio', prova: 1, tipo: 'Objetiva', disciplina: 'Matemática', questoes: 10, total_questoes: 20 },
      ],
    });
  });

  test('3b. xlsx: exportar RPA no ExportRpaDialog e abrir o arquivo gerado', async ({ page }) => {
    await preparar(page, async () => {
      const json = (corpo: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(corpo) });
      const nivel = { descricao: 'Ensino Médio', valor_questao: 10 };
      await page.route('**/api/provas/concursos/*/resumo-financeiro', (r) => r.fulfill(json([{
        id: 'p1', provas_disciplinas: [{ id: 'd1', prova_id: 'p1', disciplina: 'Português', provas_disciplina_niveis: [{ id: 'n1', nivel_id: 'nv1', qtd: 10, contabilizar: true, provas_niveis: nivel }] }],
      }])));
      await page.route('**/api/provas/concursos/*/rpa', (r) => r.fulfill(json({
        total_provas: 1, total_disciplinas: 1, niveis: [{ elaborador_id: 'el1', qtd: 10, contabilizar: true, provas_niveis: { valor_questao: 10 } }],
      })));
      await page.route('**/api/provas/elaboradores-rpa**', (r) => r.fulfill(json([{
        id: 'el1', nome: 'Elaboradora Teste', cpf: '000.000.000-00', email: 'el@teste.com', celular: '3899999999', data_nascimento: '1990-05-17',
        pis: null, tipo_conta: 'Corrente', agencia: '1234', conta: '5678', provas_bancos: { numero: 341 }, provas_elaboradores_sexo: { nome: 'Feminino' },
      }])));
    });
    await page.goto(`/provas/pedidos/${CONCURSO.id}/resumo`);
    await page.getByRole('button', { name: 'Exportar RPA' }).click();
    const dialogo = page.getByRole('dialog', { name: 'Exportar RPA' });
    await dialogo.getByLabel('Data de Vencimento').fill('2026-11-10');
    await dialogo.getByLabel('Data da Competência').fill('2026-10-31');
    const [arquivo] = await Promise.all([page.waitForEvent('download'), dialogo.getByRole('button', { name: 'Exportar', exact: true }).click()]);
    expect(arquivo.suggestedFilename()).toBe('RPA_PRJ-9_2026-11-10.xlsx');
    const wb = XLSX.read(readFileSync(await arquivo.path() as string));
    expect(wb.SheetNames).toEqual(['RPAs']);
    const linhas = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets.RPAs);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({ Projeto: 'PRJ-9', Nome: 'Elaboradora Teste', Banco: 341, 'Data de Vencimento': '10/11/2026' });
    expect(Number(linhas[0]['Valor Bruto'])).toBeGreaterThan(100); // 10 x R$ 10 líquido convertido para bruto
    await expect(page.getByText(/Exportado: 1 elaborador/)).toBeVisible();
  });
});
