import { useNavigate } from 'react-router-dom';
import { FileSignature, FileText, Loader2, Trophy, User, type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import logoPrincipal from '@/assets/logo-principal.png';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAccessLevel, type ModuleKey } from '@/hooks/useAccessLevel';
import { useAtrasadasCount, useContratosAtrasadosCount } from '@/hooks/useAtrasadas';

interface ModuleDefinition {
  key: ModuleKey;
  title: string;
  icon: LucideIcon;
  path: string;
  color: string;
  iconColor: string;
}

const MODULES: ModuleDefinition[] = [
  {
    key: 'contratos',
    title: 'Contratos',
    icon: FileSignature,
    path: '/contratos/dashboard',
    color: 'from-emerald-500/20 to-emerald-500/5',
    iconColor: 'text-emerald-600',
  },
  {
    key: 'concursos',
    title: 'Concursos',
    icon: Trophy,
    path: '/concursos/dashboard',
    color: 'from-primary/20 to-primary/5',
    iconColor: 'text-primary',
  },
  {
    key: 'provas',
    title: 'Provas',
    icon: FileText,
    path: '/provas/dashboard',
    color: 'from-amber-500/20 to-amber-500/5',
    iconColor: 'text-amber-600',
  },
];

function ModuleSelectPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile, isLoading: loadingProfile } = useUserProfile();
  const { canAccess, isLoading: loadingLevel } = useAccessLevel();
  const greeting = profile?.nome || user?.email;
  const isLoading = loadingProfile || loadingLevel;
  const visibleModules = MODULES.filter((module) => canAccess(module.key));

  // Alerta no ícone do módulo quando há tarefa (Concursos) ou parcela (Contratos) atrasada.
  const tarefasAtrasadas = useAtrasadasCount(!isLoading && canAccess('concursos'));
  const contratosAtrasados = useContratosAtrasadosCount(!isLoading && canAccess('contratos'));
  const alertas: Partial<Record<ModuleKey, string>> = {
    ...(tarefasAtrasadas > 0 && {
      concursos: `${tarefasAtrasadas} ${tarefasAtrasadas === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'}`,
    }),
    ...(contratosAtrasados > 0 && {
      contratos: `${contratosAtrasados} ${contratosAtrasados === 1 ? 'contrato com parcela atrasada' : 'contratos com parcelas atrasadas'}`,
    }),
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-muted/50 p-4">
      <div className="mb-10 flex flex-col items-center gap-3">
        <img src={logoPrincipal} alt="CertameFlow" className="h-auto w-full max-w-2xl" />
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          {greeting}
        </p>
      </div>

      <h1 className="mb-8 text-2xl font-bold text-foreground">Selecione o módulo</h1>

      {isLoading ? (
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      ) : visibleModules.length === 0 ? (
        <p className="max-w-md text-center text-sm text-muted-foreground">
          Você ainda não tem acesso a nenhum módulo. Entre em contato com o administrador.
        </p>
      ) : (
        <div className="grid w-full max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleModules.map((module) => (
            <button
              key={module.key}
              type="button"
              onClick={() => navigate(module.path)}
              className="group text-left"
              aria-label={`Abrir módulo ${module.title}${alertas[module.key] ? ` (${alertas[module.key]})` : ''}`}
            >
              <Card className="border-2 border-transparent transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:shadow-xl">
                <CardContent className="flex flex-col items-center gap-3 p-6">
                  <div className={`relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${module.color} transition-transform duration-300 group-hover:scale-110`}>
                    <module.icon className={`h-8 w-8 ${module.iconColor}`} />
                    {alertas[module.key] && (
                      <span
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-sm font-bold text-destructive-foreground shadow-md ring-2 ring-card"
                        title={alertas[module.key]}
                      >
                        !
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-foreground">{module.title}</h2>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ModuleSelectPage;
