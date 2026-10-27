import { expect, test } from '@playwright/test';
import { entrar, ID_ALVO, instalarMocks, novoEstado, SENHA_PROVISORIA } from './mocks';

const FORMATO = /^[A-HJ-NP-Za-km-np-z2-9]{4}(-[A-HJ-NP-Za-km-np-z2-9]{4}){2}$/;
const viewports = [
  { nome: 'desktop', width: 1280, height: 800 },
  { nome: 'mobile-375', width: 375, height: 800 },
];

for (const vp of viewports) {
  test.describe(`senha provisória [${vp.nome}]`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, permissions: ['clipboard-read', 'clipboard-write'] });
    const foto = (n: string) => `./resultado/${vp.nome}-${n}.png`;

    test('1. cadastro: sem campo de senha, painel com senha, Copiar e Enviar com 503', async ({ page }) => {
      const e = novoEstado();
      await instalarMocks(page, e);
      await page.goto('/');
      await entrar(page, e.email, e.senha);
      await page.goto('/administracao');
      await page.getByRole('button', { name: /Novo usuário/ }).click();
      const dialogo = page.getByRole('dialog');
      await expect(dialogo.getByLabel(/senha/i)).toHaveCount(0); // (e)
      await dialogo.getByLabel('Nome').fill('João Teste');
      await dialogo.getByLabel('E-mail').fill('joao@exemplo.com');
      await page.screenshot({ path: foto('1a-cadastro') });
      await dialogo.getByRole('button', { name: 'Salvar' }).click();

      const painel = page.getByRole('dialog', { name: 'Senha provisória' });
      await expect(painel.getByTestId('senha-provisoria')).toHaveText(FORMATO); // (a)
      await painel.getByRole('button', { name: 'Copiar' }).click();
      await expect(page.getByText('Senha copiada.')).toBeVisible();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(SENHA_PROVISORIA);
      await painel.getByRole('button', { name: 'Enviar senha via e-mail' }).click();
      await expect(page.getByText('O envio de e-mail não está configurado no servidor.')).toBeVisible(); // (d)
      await page.screenshot({ path: foto('1b-painel-erro-503') });
      await painel.getByRole('button', { name: 'Fechar' }).first().click();
      await expect(page.getByText(SENHA_PROVISORIA)).toHaveCount(0);
    });

    test('2. KeyRound: Gerar abre o painel; envio ok mostra sucesso', async ({ page }) => {
      const e = novoEstado({ envio: 204 });
      await instalarMocks(page, e);
      await page.goto('/');
      await entrar(page, e.email, e.senha);
      await page.goto('/administracao');
      await page.getByRole('button', { name: 'Redefinir senha de Maria Souza' }).click();
      await page.screenshot({ path: foto('2a-confirmar') });
      await page.getByRole('button', { name: 'Gerar senha provisória' }).click();
      const painel = page.getByRole('dialog', { name: 'Senha provisória' });
      await expect(painel.getByTestId('senha-provisoria')).toHaveText(FORMATO);
      await painel.getByRole('button', { name: 'Enviar senha via e-mail' }).click();
      await expect(page.getByText('Senha enviada por e-mail.')).toBeVisible();
      expect(e.chamadas).toContain(`POST /api/administracao/usuarios/${ID_ALVO}/senha-provisoria/envios`);
      await page.screenshot({ path: foto('2b-painel') });
    });

    test('3. login com a marca: só a tela de troca; igual recusada; troca válida e novo login', async ({ page }) => {
      const e = novoEstado({ senha: SENHA_PROVISORIA, trocar: true });
      await instalarMocks(page, e);
      await page.goto('/');
      await entrar(page, e.email, SENHA_PROVISORIA);
      const titulo = page.getByRole('heading', { name: 'Defina sua nova senha' });
      await expect(titulo).toBeVisible();
      await page.screenshot({ path: foto('3a-troca') });

      // (b) navegação por URL: a senha digitada some ao recarregar, mas a sessão fica e a tela de troca continua
      for (const url of ['/administracao', '/concursos', '/contratos/dashboard', '/provas/dashboard']) {
        await page.goto(url);
        await expect(titulo).toBeVisible();
      }
      expect(e.chamadas.filter((c) => c.includes('/api/'))).toEqual([]); // nenhuma rota de dados foi chamada
      await page.screenshot({ path: foto('3b-url-protegida') });

      // Recarregar apaga a senha lembrada: sai e entra de novo para testar "igual à provisória".
      await page.getByRole('button', { name: 'Sair' }).click();
      await entrar(page, e.email, SENHA_PROVISORIA);
      await page.getByLabel('Nova senha', { exact: true }).fill(SENHA_PROVISORIA);
      await page.getByLabel('Confirmar nova senha').fill(SENHA_PROVISORIA);
      await page.getByRole('button', { name: 'Salvar' }).click();
      await expect(page.getByText('A nova senha precisa ser diferente da senha provisória.')).toBeVisible();
      await page.screenshot({ path: foto('3c-igual-recusada') });
      expect(e.chamadas).not.toContain('PUT /api/usuarios/eu/senha');

      await page.getByLabel('Nova senha', { exact: true }).fill('MinhaNova123');
      await page.getByLabel('Confirmar nova senha').fill('MinhaNova123');
      await page.getByRole('button', { name: 'Salvar' }).click();
      await expect(titulo).toHaveCount(0);
      const i = e.chamadas.indexOf('PUT /api/usuarios/eu/senha');
      expect(i).toBeGreaterThan(-1);
      expect(e.chamadas.slice(i + 1)).toContain('POST /auth/v1/token'); // novo login depois do PUT
      await page.screenshot({ path: foto('3d-liberado') });

      // (c) a provisória não funciona mais (no mock, que troca a senha ao receber o PUT)
      await page.evaluate(() => localStorage.clear());
      await page.goto('/');
      await entrar(page, e.email, SENHA_PROVISORIA);
      await expect(page.getByText('E-mail ou senha inválidos.')).toBeVisible();
      await page.screenshot({ path: foto('3e-provisoria-recusada') });
    });

    test('4. regressão: login normal, senha errada e ChangePasswordDialog do perfil', async ({ page }) => {
      const e = novoEstado();
      await instalarMocks(page, e);
      await page.goto('/');
      await entrar(page, e.email, 'errada');
      await expect(page.getByText('E-mail ou senha inválidos.')).toBeVisible();
      await page.getByLabel('Senha', { exact: true }).fill(e.senha);
      await page.getByRole('button', { name: 'Entrar' }).click();
      await expect(page.getByLabel('E-mail')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Defina sua nova senha' })).toHaveCount(0);
      await page.goto('/concursos');
      await expect(page.getByRole('link', { name: 'Módulos' })).toBeAttached({ timeout: 20_000 });
      if (vp.width < 768) await page.locator('button[class*="md:hidden"]').first().click(); // botão de menu sem nome acessível (sidebar existente)
      await page.screenshot({ path: foto('4a-logado') });

      await page.getByRole('button', { name: /admin@teste\.com/ }).first().click();
      await page.getByRole('menuitem', { name: 'Alterar Senha' }).click();
      const d = page.getByRole('dialog');
      await d.getByLabel('Senha Atual').fill(e.senha);
      await d.getByLabel('Nova Senha', { exact: true }).fill('OutraSenha99');
      await d.getByLabel('Confirmar Nova Senha').fill('OutraSenha99');
      await page.screenshot({ path: foto('4b-alterar-senha') });
      await d.getByRole('button', { name: 'Alterar Senha' }).click();
      await expect(page.getByText('Senha alterada com sucesso!').first()).toBeVisible();
      expect(e.chamadas).toContain('PUT /auth/v1/user');
    });
  });
}
