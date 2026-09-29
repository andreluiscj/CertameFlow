# CertameFlow

Sistema de gestão centralizada de certames, provas e contratos, desenvolvido como projeto de conclusão de curso em Sistemas de Informação.

## Sobre o projeto

CertameFlow é uma plataforma web que busca **centralizar, organizar e automatizar** processos administrativos relacionados à gestão de concursos e processos seletivos. O sistema proporciona:

- **Centralização** de informações sobre concursos, provas e contratos
- **Organização** de processos e tarefas com prazos definidos
- **Acompanhamento** de etapas em calendário interativo
- **Controle e rastreabilidade** de atividades com registro de quem fez o quê e quando
- **Integração** entre módulos (Concursos vinculam com Contratos e Provas)
- **Acesso por módulo**, definido para cada usuário pelo administrador

**Público-alvo:** equipes administrativas de órgãos públicos (prefeituras, câmaras, autarquias) que executam concursos e processos seletivos.

## Arquitetura

```
┌─────────────────────────────┐
│   Frontend (React + Vite)   │
│   • Gerenciamento de state  │
│   • Dashboards e relatórios │
│   • Importação/exportação   │
└──────────────┬──────────────┘
               │ API REST
┌──────────────▼──────────────┐
│  Backend (Node.js + Express)│
│  • SQL parametrizado (pg)   │
│  • Autorização por módulo   │
│  • Transações de negócio    │
└──────────────┬──────────────┘
               │ SQL
┌──────────────▼──────────────┐
│  Postgres (Supabase)        │
│  • RLS por módulo           │
│  • Auditoria de alterações  │
│  • 32 tabelas integradas    │
└─────────────────────────────┘
```

## Stack tecnológico

### Frontend
- **React 18** - UI library
- **Vite 5** - Build tool
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible components
- **React Router** - Navigation
- **React Hook Form + Zod** - Form validation
- **TanStack Query** - Data fetching and caching
- **Recharts** - Data visualization
- **Date FNS** - Date manipulation
- **jsPDF + html2canvas + DOCX + XLSX** - Export formats

### Backend
- **Node.js + Express** - REST API
- **PostgreSQL (pg)** - Database client with parameterized queries
- **Jose** - JWT validation
- **Helmet** - HTTP security headers
- **Multer** - File upload (payment receipts)
- **Nodemailer** - E-mail notifications (SMTP)
- **Vitest** - Testing framework

### Infrastructure
- **Supabase** - Managed Postgres + Auth
- **Supabase Auth** - Authentication and authorization
- **Supabase Storage** - Private bucket for payment receipts
- **Row-Level Security (RLS)** - Enforced at database level

## Módulos

|      Módulo       | Funcionalidades |
|-------------------|-----------------|
| **Contratos**     | Cadastro de clientes, responsáveis, contratos, formas de pagamento, parcelas, comprovantes de pagamento, contas a receber |
| **Concursos**     | Cadastro de concursos, tarefas/eventos com prazos, agenda mensal, notas de títulos |
| **Provas**        | Cadastro de provas, cargos, disciplinas, níveis, elaboradores, pedidos de questões |
| **Administração** | Cadastro de usuários e dos módulos de cada um, redefinição de senha, notificações por e-mail, logs administrativos |

**Acesso por módulo:** na tela de Administração, o administrador escolhe quais módulos cada usuário vê, em qualquer combinação (por exemplo, só Provas, ou Contratos e Concursos). Só o **nível 4 (administrador)** tem acesso total: todos os módulos e a Administração.

## Segurança

- **Autenticação:** Supabase Auth (email/password)
- **Autorização:** Acesso por módulo conferido no backend a cada requisição + RLS no banco
- **SQL Injection:** Prevenido com prepared statements (`$1, $2, ...`)
- **Auditoria:** Todos as criações, alterações, exclusões e importações são registradas com usuário e timestamp
- **Token:** Validado contra JWKS do Supabase a cada requisição


## Estrutura do projeto

```
CertameFlow/
├── src/                          # Frontend (React + TypeScript)
│   ├── components/               # Componentes React reutilizáveis
│   ├── hooks/                    # Custom hooks (API, queries)
│   ├── pages/                    # Páginas por módulo (Concursos, Contratos, Provas)
│   ├── contexts/                 # Context API (Auth, Sidebar, Theme)
│   ├── lib/                      # Utilitários (API client, masks, utils)
│   ├── types/                    # TypeScript types
│   └── test/                     # Testes do frontend
│
├── server/                       # Backend (Node.js + Express)
│   ├── src/
│   │   ├── app.js                # Express app setup
│   │   ├── server.js             # Entrypoint
│   │   ├── config/               # Database, CORS, env
│   │   ├── middleware/           # Auth, authorization, error handling
│   │   ├── modulos/              # Concursos, Contratos, Provas (routes, controllers, services, repositories)
│   │   └── db/                   # Database helpers
│   ├── test/                     # Testes backend (Vitest + Supertest)
│   └── README.md
│
├── supabase/                     # Database schema
│   └── schema.sql                # Tabelas, RLS policies, dados iniciais
│
├── public/                       # Static files
├── .env.example                  # Frontend env vars template
├── package.json
└── README.md
```

## Fluxo de dados

1. **Usuário** se autentica via Supabase Auth
2. **Frontend** armazena o token e o usa em requisições para a API
3. **Backend** valida o token contra JWKS do Supabase
4. **Backend** verifica no banco se o usuário é administrador (`nivel_acesso`) ou tem o módulo (`modulos`)
5. **Postgres** aplica RLS por módulo nos acessos diretos do navegador ao Supabase
6. **Logs** registram quem fez cada alteração automaticamente

## Recursos principais

- Cadastro e gerenciamento de concursos com status
- Tarefas e eventos com prazos em calendário
- Registro de quem concluiu cada tarefa, quando e com quantos dias de atraso (o prazo é o dia inteiro, mesmo quando a tarefa tem horário)
- Importação em lote de tarefas (CSV)
- Acompanhamento de contratos com parcelas
- Anexo de comprovante de pagamento (PDF ou foto) em cada parcela
- Resumo diário por e-mail de tarefas e parcelas atrasadas
- Gestão de usuários e dos módulos de cada um pela tela de Administração
- Gerenciamento de clientes, responsáveis e contas a receber
- Cadastro de provas, cargos e disciplinas
- Importação de áreas, elaboradores e pedidos de questões
- Geração de certificados em PDF
- Exportação de dados em Excel/PDF/Word
- Registro de auditoria (quem, o quê, quando)
- Tema claro/escuro
- Responsivo (mobile + desktop)



## Desenvolvedores

- **André Luis Caldeira** - Desenvolvimento