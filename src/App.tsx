import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { ErroHttp } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { SidebarProvider } from "@/contexts/SidebarContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RequireLevel } from "@/components/RequireLevel";
import ModuleSelectPage from "./pages/ModuleSelectPage";

const Index = lazy(() => import("./pages/Index"));
const ConcursosPage = lazy(() => import("./pages/ConcursosPage"));
const ConcursosFinalizadosPage = lazy(() => import("./pages/ConcursosFinalizadosPage"));
const NovoConcursoPage = lazy(() => import("./pages/NovoConcursoPage"));
const ConcursoDetalhesPage = lazy(() => import("./pages/ConcursoDetalhesPage"));
const EditarConcursoPage = lazy(() => import("./pages/EditarConcursoPage"));
const AgendaPage = lazy(() => import("./pages/AgendaPage"));
const InscricoesPage = lazy(() => import("./pages/InscricoesPage"));
const ProvasPage = lazy(() => import("./pages/ProvasPage"));
const ResultadosPage = lazy(() => import("./pages/ResultadosPage"));
const ConcursosComTitulosPage = lazy(() => import("./pages/ConcursosComTitulosPage"));
const TarefasPage = lazy(() => import("./pages/TarefasPage"));
const TarefasSemanaPage = lazy(() => import("./pages/TarefasSemanaPage"));
const EstatisticasPage = lazy(() => import("./pages/EstatisticasPage"));
const ProvasDashboardPage = lazy(() => import("./pages/provas/ProvasDashboardPage"));
const ProvasConcursosPage = lazy(() => import("./pages/provas/ProvasConcursosPage"));
const ProvasCalendarioPage = lazy(() => import("./pages/provas/ProvasCalendarioPage"));
const PedidosQuestoesPage = lazy(() => import("./pages/provas/PedidosQuestoesPage"));
const PedidosQuestoesConcursoPage = lazy(() => import("./pages/provas/PedidosQuestoesConcursoPage"));
const ProvaDetalhePage = lazy(() => import("./pages/provas/ProvaDetalhePage"));
const ResumoQuestoesConcursoPage = lazy(() => import("./pages/provas/ResumoQuestoesConcursoPage"));
const ElaboradoresPage = lazy(() => import("./pages/provas/ElaboradoresPage"));
const GerarCertificadoPage = lazy(() => import("./pages/provas/GerarCertificadoPage"));
const AreasAtuacaoPage = lazy(() => import("./pages/provas/AreasAtuacaoPage"));
const NiveisProvasPage = lazy(() => import("./pages/provas/NiveisProvasPage"));
const StatusProvasPage = lazy(() => import("./pages/provas/StatusProvasPage"));
const CargosProvasPage = lazy(() => import("./pages/provas/CargosProvasPage"));
const CargosProvasConcursoPage = lazy(() => import("./pages/provas/CargosProvasConcursoPage"));
const ContratosDashboardPage = lazy(() => import("./pages/contratos/ContratosDashboardPage"));
const ContratosPage = lazy(() => import("./pages/contratos/ContratosPage"));
const ContratoDetalhesPage = lazy(() => import("./pages/contratos/ContratoDetalhesPage"));
const AcompanharContratosPage = lazy(() => import("./pages/contratos/AcompanharContratosPage"));
const ContratoAcompanhamentoPage = lazy(() => import("./pages/contratos/ContratoAcompanhamentoPage"));
const ContratosClientesPage = lazy(() => import("./pages/contratos/ClientesPage"));
const ContratosResponsaveisPage = lazy(() => import("./pages/contratos/ResponsaveisPage"));
const ContratosContasRecebimentoPage = lazy(() => import("./pages/contratos/ContasRecebimentoPage"));
const LogsConcursosPage = lazy(() => import("./pages/LogsConcursosPage"));
const LogsContratosPage = lazy(() => import("./pages/contratos/LogsContratosPage"));
const LogsProvasPage = lazy(() => import("./pages/provas/LogsProvasPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Configuração comum de cache para as consultas da aplicação.
const queryClient = new QueryClient({
  // Sem isto, uma consulta que falha só aparece como lista vazia ("Nenhum
  // concurso encontrado"). O id evita repetir o aviso para cada consulta.
  queryCache: new QueryCache({
    onError: (erro) => {
      if (erro instanceof ErroHttp) {
        toast.error(erro.message, { id: `erro-consulta-${erro.status}` });
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-primary/70" />
    </div>
  );
}

function ModuleRoute({ children, module }: { children: ReactNode; module: "concursos" | "provas" | "contratos" }) {
  return (
    <ProtectedRoute>
      <RequireLevel module={module}>{children}</RequireLevel>
    </ProtectedRoute>
  );
}

const concursos = (page: ReactNode) => <ModuleRoute module="concursos">{page}</ModuleRoute>;
const provas = (page: ReactNode) => <ModuleRoute module="provas">{page}</ModuleRoute>;
const contratos = (page: ReactNode) => <ModuleRoute module="contratos">{page}</ModuleRoute>;

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <ThemeProvider>
            <SidebarProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Suspense fallback={<RouteFallback />}>
                  <Routes>
                    <Route path="/" element={<ProtectedRoute><ModuleSelectPage /></ProtectedRoute>} />
                    <Route path="/concursos/dashboard" element={concursos(<Index />)} />
                    <Route path="/concursos" element={concursos(<ConcursosPage />)} />
                    <Route path="/concursos/finalizados" element={concursos(<ConcursosFinalizadosPage />)} />
                    <Route path="/concursos/novo" element={concursos(<NovoConcursoPage />)} />
                    <Route path="/concursos/:id" element={concursos(<ConcursoDetalhesPage />)} />
                    <Route path="/concursos/:id/editar" element={concursos(<EditarConcursoPage />)} />
                    <Route path="/concursos/inscricoes" element={concursos(<InscricoesPage />)} />
                    <Route path="/concursos/provas" element={concursos(<ProvasPage />)} />
                    <Route path="/concursos/resultados" element={concursos(<ResultadosPage />)} />
                    <Route path="/concursos/com-titulos" element={concursos(<ConcursosComTitulosPage />)} />
                    <Route path="/concursos/agenda" element={concursos(<AgendaPage />)} />
                    <Route path="/concursos/tarefas" element={concursos(<TarefasPage />)} />
                    <Route path="/concursos/tarefas/semana" element={concursos(<TarefasSemanaPage />)} />
                    <Route path="/concursos/estatisticas" element={concursos(<EstatisticasPage />)} />
                    <Route path="/concursos/logs" element={concursos(<LogsConcursosPage />)} />
                    <Route path="/provas/dashboard" element={provas(<ProvasDashboardPage />)} />
                    <Route path="/provas/concursos" element={provas(<ProvasConcursosPage />)} />
                    <Route path="/provas/calendario" element={provas(<ProvasCalendarioPage />)} />
                    <Route path="/provas/pedidos" element={provas(<PedidosQuestoesPage />)} />
                    <Route path="/provas/pedidos/:concursoId" element={provas(<PedidosQuestoesConcursoPage />)} />
                    <Route path="/provas/pedidos/:concursoId/resumo" element={provas(<ResumoQuestoesConcursoPage />)} />
                    <Route path="/provas/pedidos/:concursoId/prova/:provaId" element={provas(<ProvaDetalhePage />)} />
                    <Route path="/provas/elaboradores" element={provas(<ElaboradoresPage />)} />
                    <Route path="/provas/certificados" element={provas(<GerarCertificadoPage />)} />
                    <Route path="/provas/areas" element={provas(<AreasAtuacaoPage />)} />
                    <Route path="/provas/niveis" element={provas(<NiveisProvasPage />)} />
                    <Route path="/provas/status" element={provas(<StatusProvasPage />)} />
                    <Route path="/provas/cargos" element={provas(<CargosProvasPage />)} />
                    <Route path="/provas/cargos/:concursoId" element={provas(<CargosProvasConcursoPage />)} />
                    <Route path="/provas/logs" element={provas(<LogsProvasPage />)} />
                    <Route path="/contratos/dashboard" element={contratos(<ContratosDashboardPage />)} />
                    <Route path="/contratos/lista" element={contratos(<ContratosPage />)} />
                    <Route path="/contratos/lista/:id" element={contratos(<ContratoDetalhesPage />)} />
                    <Route path="/contratos/acompanhar" element={contratos(<AcompanharContratosPage />)} />
                    <Route path="/contratos/acompanhar/:id" element={contratos(<ContratoAcompanhamentoPage />)} />
                    <Route path="/contratos/clientes" element={contratos(<ContratosClientesPage />)} />
                    <Route path="/contratos/responsaveis" element={contratos(<ContratosResponsaveisPage />)} />
                    <Route path="/contratos/contas-recebimento" element={contratos(<ContratosContasRecebimentoPage />)} />
                    <Route path="/contratos/logs" element={contratos(<LogsContratosPage />)} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </SidebarProvider>
          </ThemeProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
