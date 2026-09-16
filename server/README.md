# server

API do Sistema de Gestão CertameFlow em Node.js + Express.

## Configuração

Copie `.env.example` para `.env` e preencha:

| Variável | Onde encontrar |
| --- | --- |
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string (URI) |
| `SUPABASE_ISSUER_URI`, `SUPABASE_JWKS_URI` | troque `<project_id>` pelo mesmo valor de `VITE_SUPABASE_PROJECT_ID` do frontend |
| `CORS_ORIGENS` | origem do frontend em desenvolvimento: `http://localhost:8080` |

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

### Concursos - leitura com nível 1, escrita com nível 2

A leitura fica aberta ao nível 1 porque a tela de detalhes do contrato lista
concursos para vincular. É a mesma exceção de `supabase/schema.sql`.

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
| GET | `/api/concursos/tipos`, `/api/concursos/status` | opções dos formulários (nível 2) |
| GET, PUT, DELETE | `/api/concursos/observacoes/:ano/:mes` | observação mensal da agenda (leitura nível 2) |
| GET, PUT | `/api/concursos/notas-titulos` | notas de títulos / cria ou altera a do concurso (leitura nível 2) |
| PATCH, DELETE | `/api/concursos/notas-titulos/:id` | altera / exclui |
| GET | `/api/concursos/:id/nota-titulo` | nota de títulos de um concurso (nível 2) |
| GET | `/api/concursos/logs` | registro de atividades do módulo (nível 2) |

### Contratos - nível de acesso 1

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

### Provas - nível de acesso 3

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
  recente para o mais antigo (padrão 500, máximo 2000), com o nível de acesso
  do módulo.

## Erros

Respostas de erro seguem sempre o formato `{ "mensagem": "...", "campos": {} }`.

Violações de regra do próprio banco viram erro do cliente, com mensagem
genérica: registro em uso por outros cadastros ou valor repetido → `409`;
referência inexistente, campo obrigatório ou valor mal formado → `400`.

## Estrutura

```
src/
  config/        variáveis de ambiente, pool do Postgres, CORS
  middleware/    autenticação (JWT), autorização (nível de acesso), log, erros
  modulos/       um diretório por domínio de negócio (routes/controller/service/repository)
  db/sql/        consultas .sql isoladas, quando fizer sentido não misturar SQL em string no JS
  app.js         monta middlewares e rotas
  server.js      ponto de entrada
```

Cada módulo novo segue o padrão: `<modulo>.routes.js` declara o nível mínimo
de acesso no topo do arquivo (`router.use(exigirNivel(n))`), `<modulo>.controller.js`
lida com request/response, `<modulo>.service.js` concentra a regra de negócio,
e `<modulo>.repository.js` guarda o SQL.
