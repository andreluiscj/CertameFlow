# CertameFlow

Sistema de gestão centralizada de certames, provas e contratos, desenvolvido como projeto de conclusão de curso em Sistemas de Informação.

## Sobre o projeto

CertameFlow é uma plataforma web que busca **centralizar, organizar e automatizar** processos administrativos relacionados à gestão de concursos e processos seletivos. O sistema proporciona:

- **Centralização** de informações sobre concursos, provas e contratos
- **Organização** de processos e tarefas com prazos definidos
- **Acompanhamento** de etapas em calendário interativo
- **Controle e rastreabilidade** de atividades com registro de quem fez o quê e quando
- **Integração** entre módulos (Concursos vinculam com Contratos e Provas)
- **Níveis de acesso** diferenciados por perfil de usuário

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
│  • Autorização por nível    │
│  • Transações de negócio    │
└──────────────┬──────────────┘
               │ SQL
┌──────────────▼──────────────┐
│  Postgres (Supabase)        │
│  • RLS por nível de acesso  │
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
- **Vitest** - Testing framework

### Infrastructure
- **Supabase** - Managed Postgres + Auth
- **Supabase Auth** - Authentication and authorization
- **Row-Level Security (RLS)** - Enforced at database level

## Módulos

| Nível |    Módulo     | Funcionalidades |
|-------|---------------|-----------------|
|   1   | **Contratos** | Cadastro de clientes, responsáveis, contratos, formas de pagamento, parcelas, contas a receber |
|   2   | **Concursos** | Cadastro de concursos, tarefas/eventos com prazos, agenda mensal, notas de títulos |
|   3   | **Provas**    | Cadastro de provas, cargos, disciplinas, níveis, elaboradores, pedidos de questões |

Os níveis são **cumulativos**: nível 3 acessa concursos, provas e contratos.

## Segurança

- **Autenticação:** Supabase Auth (email/password)
- **Autorização:** Níveis de acesso no banco (RLS) + verificação no backend
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
4. **Backend** verifica `nivel_acesso` do usuário no banco
5. **Postgres** aplica RLS para filtrar dados por nível
6. **Logs** registram quem fez cada alteração automaticamente

## Recursos principais

- Cadastro e gerenciamento de concursos com status
- Tarefas e eventos com prazos em calendário
- Importação em lote de tarefas (CSV)
- Acompanhamento de contratos com parcelas
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