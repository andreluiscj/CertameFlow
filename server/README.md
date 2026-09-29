# server

API do Sistema de Gestão CertameFlow em Node.js + Express.

## Configuração

Copie `.env.example` para `.env` e preencha:

| Variável | Onde encontrar |
| --- | --- |
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string (URI) |
| `SUPABASE_ISSUER_URI`, `SUPABASE_JWKS_URI` | troque `<project_id>` pelo mesmo valor de `VITE_SUPABASE_PROJECT_ID` do frontend |
| `CORS_ORIGENS` | origem do frontend em desenvolvimento: `http://localhost:8080` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role`. Só no servidor. Necessária para a Administração e os comprovantes |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | servidor de e-mail do resumo diário de atrasos (opcional) |
| `NOTIFICACOES_HORA`, `NOTIFICACOES_FUSO`, `URL_SISTEMA` | hora do envio (padrão 8), fuso (padrão `America/Sao_Paulo`) e link do e-mail |

## Execução

```powershell
npm install
npm run dev
```

A API sobe em `http://localhost:8081` (configurável via `PORT`).

## Testes

```powershell
npm test
```

## Rotas

`GET /saude` responde sem token. Todas as demais exigem
`Authorization: Bearer <token do Supabase>`.

### Concursos - módulo Concursos

A lista de concursos (`GET /api/concursos` e `/:id`) e as tarefas (`/eventos` e
`/eventos-progresso`) podem ser lidas por quem tem qualquer módulo, porque
Contratos e Provas exibem esses dados. Todo o resto exige o módulo Concursos.
É a mesma exceção de `supabase/schema.sql`.

| Método | Rota | Ação |
| --- | --- | --- |
| GET | `/api/concursos` | lista, do mais recente para o mais antigo |
| GET | `/api/concursos/:id` | busca um concurso |
| POST | `/api/concursos` | cria |
| PATCH | `/api/concursos/:id` | altera apenas os campos enviados |
| DELETE | `/api/concursos/:id` | exclui (os eventos caem por cascata do banco) |
| GET | `/api/concursos/eventos` | tarefas com o concurso embutido (filtro opcional `?concurso_id=`) |
| GET | `/api/concursos/eventos-progresso?ids=a,b` | total e concluídas por concurso |
| POST | `/api/concursos/eventos` | cria tarefa |
| PATCH, DELETE | `/api/concursos/eventos/:id` | altera / exclui tarefa |
| PUT | `/api/concursos/eventos/:id/conclusao` | conclui ou desmarca (`{ concluido }`); concluir a última finaliza o concurso |
| POST | `/api/concursos/eventos-conclusoes` | salva várias conclusões de uma vez (`{ alteracoes }`) |
| PUT | `/api/concursos/:id/eventos/conclusao` | conclui ou desmarca todas as tarefas do concurso |
| POST | `/api/concursos/:id/eventos/importacoes` | importa tarefas de arquivo (`{ arquivo, eventos }`) |
| DELETE | `/api/concursos/:id/eventos` | exclui todas as tarefas do concurso |
| GET | `/api/concursos/tipos`, `/api/concursos/status` | opções dos formulários (só módulo Concursos) |
| GET, PUT, DELETE | `/api/concursos/observacoes/:ano/:mes` | observação mensal da agenda |
| GET, PUT | `/api/concursos/notas-titulos` | notas de títulos / cria ou altera a do concurso |
| PATCH, DELETE | `/api/concursos/notas-titulos/:id` | altera / exclui |
| GET | `/api/concursos/:id/nota-titulo` | nota de títulos de um concurso |
| GET | `/api/concursos/logs` | registro de atividades do módulo |

### Contratos - módulo Contratos

Todas as rotas começam com `/api/contratos`.

| Método | Rota | Ação |
| --- | --- | --- |
| GET | `/tipos-processo`, `/status`, `/parcela-status` | listas de apoio (só ativos) |
| GET, POST | `/clientes-tipos` | tipos de cliente |
| GET, POST | `/cadastros` | lista contratos completos / cadastra contrato |
| GET, DELETE | `/cadastros/:id` | contrato completo / exclui |
| PATCH | `/cadastros/:id/concurso` | vincula ou desvincula concurso (`{ concurso_id }`) |
| GET, PUT | `/cadastros/:id/responsaveis` | responsáveis do contrato / substitui (`{ responsavel_ids }`) |
| POST | `/cadastros/:id/responsaveis` | vincula um responsável do mesmo cliente (`{ responsavel_id }`) |
| DELETE | `/cadastros/:id/responsaveis/:responsavelId` | desvincula (o responsável continua cadastrado) |
| PATCH | `/parcelas/:id` | status, pagamento e data efetiva da parcela |
| POST | `/parcelas/:id/comprovante` | anexa ou substitui o comprovante (`multipart/form-data`, campo `arquivo`: PDF, JPG, PNG ou WEBP até 10 MB) |
| GET | `/parcelas/:id/comprovante` | link temporário (5 minutos) para abrir o comprovante (`{ url, nome, tipo }`) |
| DELETE | `/parcelas/:id/comprovante` | remove o comprovante |
| GET, POST | `/clientes` | clientes com o tipo embutido |
| PATCH, DELETE | `/clientes/:id` | altera / exclui |
| PUT | `/clientes/:id/responsaveis` | sincroniza os responsáveis do cliente (`{ responsaveis }`): item com `id` é atualizado, sem `id` é criado, ausente é excluído |
| GET, POST | `/responsaveis` | lista (filtro opcional `?cliente_id=`) / cadastra |
| PATCH, DELETE | `/responsaveis/:id` | altera / exclui |
| GET | `/responsaveis/:id/contratos` | contratos dos quais o responsável participa |
| GET, POST | `/contas-recebimento` | contas de recebimento |
| PATCH, DELETE | `/contas-recebimento/:id` | altera / exclui |

`GET /logs` lista o registro de atividades do módulo.

O cadastro de contrato e as duas substituições de responsáveis rodam numa
transação (`emTransacao`, em `config/db.js`): ou tudo é gravado, ou nada.

Os responsáveis do cliente são atualizados no lugar, nunca apagados e
recriados, para não perderem os vínculos com contratos. No banco, um
responsável ainda vinculado a contrato não pode ser excluído
(`supabase/schema.sql`): a API responde `409`.

Os comprovantes ficam no bucket privado `comprovantes` do Supabase Storage,
em `<contrato_id>/<parcela_id>/<uuid>.<extensão>`. O navegador nunca acessa o
bucket: o envio passa pela API, que confere os primeiros bytes do arquivo (e
não só o tipo informado), e o download usa um link assinado de curta duração.
Ao substituir, remover o comprovante ou excluir o contrato, o arquivo antigo
sai do Storage depois de a alteração estar gravada no banco.

### Provas - módulo Provas

Todas as rotas começam com `/api/provas`.

| Método | Rota | Ação |
| --- | --- | --- |
| GET | `/bancos`, `/sexos` | listas fixas |
| GET, POST | `/niveis`, `/status`, `/areas`, `/cargos`, `/elaboradores` | lista / cadastra |
| PATCH, DELETE | `/niveis/:id`, `/status/:id`, `/areas/:id`, `/cargos/:id`, `/elaboradores/:id` | altera / exclui |
| GET | `/areas-contagem-elaboradores` | `{ area_id: total }` |
| POST | `/areas-importacoes` | importa áreas (`{ descricoes }`) |
| POST | `/elaboradores-importacoes` | importa elaboradores com área (`{ elaboradores }`) |
| GET | `/elaboradores-rpa?ids=a,b` | dados de pagamento para a planilha de RPA |
| GET | `/cadastros-contagem` | quantidade de provas por concurso |
| GET, DELETE | `/cadastros/:id` | prova com cargos e disciplinas / exclui (dependentes por cascata) |
| GET | `/cadastros/:id/disciplina-niveis` | linhas de nível/elaboração da prova |
| PATCH | `/disciplina-niveis/:id` | nível, elaborador, status, contabilizar, prazo |
| GET | `/concursos/:concursoId/provas` | provas do concurso |
| GET | `/concursos/:concursoId/resumo-financeiro` | disciplinas, níveis e valor por questão |
| POST | `/concursos/:concursoId/importacoes` | substitui as provas do concurso pela planilha (`{ linhas }`) |
| GET | `/concursos/:concursoId/rpa` | totais e linhas de elaboração para a planilha de RPA |
| GET | `/encerramentos` | concursos com provas encerradas |
| PUT, DELETE | `/encerramentos/:concursoId` | encerra / reabre |
| GET, POST | `/certificados` | histórico / registra emissão (quem emitiu vem do token) |
| POST | `/areas/:id/elaboradores` | adiciona elaborador à área (`{ elaborador_id }`) |
| DELETE | `/areas/:id/elaboradores/:elaboradorId` | remove elaborador da área |
| GET | `/logs` | registro de atividades do módulo |

Rodam numa transação: importação de provas, importação de elaboradores e
cadastro/alteração de elaborador com suas áreas.

### Administração - nível 4 (administrador)

Todas as rotas começam com `/api/administracao`. O administrador também
acessa os três módulos, estejam eles marcados ou não.

| Método | Rota | Ação |
| --- | --- | --- |
| GET, POST | `/usuarios` | lista / cadastra (`{ nome, email, setor, senha, nivel_acesso, modulos }`) |
| PATCH | `/usuarios/:id` | altera nome, setor, `nivel_acesso`, `modulos` ou `receber_notificacoes` |
| PUT | `/usuarios/:id/senha` | redefine a senha (`{ senha }`, mínimo 8 caracteres) |
| DELETE | `/usuarios/:id` | exclui o perfil e o login do Supabase Auth |
| GET | `/notificacoes` | situação do envio de e-mails e último envio automático |
| POST | `/notificacoes/envios` | envia o resumo de atrasos de hoje imediatamente |
| GET | `/logs` | registro de atividades da Administração |

Os usuários são criados e excluídos pela API de administração do Supabase
Auth, com a chave `service_role`. O administrador não pode deixar de ser
administrador nem excluir o próprio usuário, para o sistema nunca ficar sem
administrador.

O acesso de cada usuário tem duas partes: `nivel_acesso` (4 = administrador,
com acesso total; 0 = usuário comum) e `modulos`, a lista de módulos liberados
(`contratos`, `concursos`, `provas`, em qualquer combinação). A API grava a
lista sem repetição e na ordem padrão; para o administrador, grava os três.

## Notificações por e-mail

Com `SMTP_HOST` definido, a API confere a cada 10 minutos se o resumo do dia
já pode sair (a partir de `NOTIFICACOES_HORA`). Cada usuário com
`receber_notificacoes` ativo recebe um e-mail só com o que pode ver: parcelas
não pagas vencidas (módulo Contratos) e tarefas não concluídas com data
passada, exceto de concursos pausados (módulo Concursos). O administrador
recebe as duas.
Quem não tem pendência não recebe e-mail.

A tabela `notificacoes_envios` guarda o dia enviado: reiniciar a API não
repete o envio, e se todos os e-mails falharem o dia é liberado para uma nova
tentativa.

## Registro de atividades (logs)

Toda criação, alteração, exclusão, importação, conclusão/desmarcação de tarefa
e vínculo grava uma linha em `logs` (tabela criada por
`supabase/schema.sql`), com módulo, ação, descrição e usuário.

- **Quem fez** vem do token já conferido: o middleware de autenticação guarda o
  usuário no contexto da requisição (`config/contexto.js`), e o registro lê de
  lá. Nenhum campo enviado pelo navegador define o autor.
- **Na mesma transação** da alteração (`registroDeAtividades(...).registrando`,
  em `modulos/logs/atividades.service.js`): não existe alteração sem registro,
  nem registro de algo que falhou.
- `GET /api/<modulo>/logs?limite=` devolve os registros do módulo, do mais
  recente para o mais antigo (padrão 500, máximo 2000), para quem tem o
  módulo (os da Administração, só para o administrador).

## Erros

Respostas de erro seguem sempre o formato `{ "mensagem": "...", "campos": {} }`.

Violações de regra do próprio banco viram erro do cliente, com mensagem
genérica: registro em uso por outros cadastros ou valor repetido → `409`;
referência inexistente, campo obrigatório ou valor mal formado → `400`.

## Estrutura

```
src/
  config/        variáveis de ambiente, pool do Postgres, CORS
  middleware/    autenticação (JWT), autorização (módulos e administrador), log, erros
  modulos/       um diretório por domínio de negócio (routes/controller/service/repository)
  db/sql/        consultas .sql isoladas, quando fizer sentido não misturar SQL em string no JS
  app.js         monta middlewares e rotas
  server.js      ponto de entrada
```

Cada módulo novo segue o padrão: `<modulo>.routes.js` declara o módulo exigido
no topo do arquivo (`router.use(exigirModulo('provas'))`), `<modulo>.controller.js`
lida com request/response, `<modulo>.service.js` concentra a regra de negócio,
e `<modulo>.repository.js` guarda o SQL.
